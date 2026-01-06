from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db import models
from django.conf import settings
from .models import Complaint, Attachment, Comment, Timeline, Feedback, AssignmentRequest, ComplaintTemplate, TriageRule
from .serializers import (ComplaintSerializer, ComplaintListSerializer, ComplaintUpdateSerializer,
                         AttachmentSerializer, CommentSerializer, FeedbackSerializer, AssignmentRequestSerializer)
from utils.permissions import IsComplaintOwnerOrAgent, IsComplaintOwner
from utils.email_service import send_complaint_created_email, send_status_changed_email, send_complaint_assigned_email
from apps.notifications.tasks import send_email_notification
from utils.notification_service import send_real_time_notification
from utils.sla_calculator import calculate_sla_deadline
import logging

logger = logging.getLogger(__name__)

class ComplaintListCreateView(generics.ListCreateAPIView):
    serializer_class = ComplaintListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority', 'category', 'assigned_to', 'sla_breached']
    search_fields = ['complaint_number', 'title', 'description']
    ordering_fields = ['created_at', 'priority', 'sla_deadline']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'CUSTOMER':
            return Complaint.objects.filter(customer=user).select_related('customer', 'assigned_to')
        elif user.role == 'AGENT':
            return Complaint.objects.filter(assigned_to=user).select_related('customer', 'assigned_to')
        elif user.role == 'ADMIN':
            return Complaint.objects.all().select_related('customer', 'assigned_to').order_by('-created_at')
        else:
            return Complaint.objects.all().select_related('customer', 'assigned_to')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ComplaintSerializer
        return ComplaintListSerializer
    
    def create(self, request, *args, **kwargs):
        """Override create to handle attachments and return simple response"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint = self.perform_create(serializer)
        
        # Return minimal response immediately
        return Response({
            'id': str(complaint.id),
            'complaint_number': complaint.complaint_number,
            'title': complaint.title,
            'status': complaint.status,
            'message': 'Complaint created successfully'
        }, status=status.HTTP_201_CREATED)
    
    def perform_create(self, serializer):
        """Standard creation with attachment handling and auto-assignment"""
        # Save complaint (serializer.create handles customer and SLA)
        user = self.request.user
        complaint = serializer.save()
        
        # Handle attachments
        attachments = self.request.FILES.getlist('attachments')
        for file in attachments:
            try:
                Attachment.objects.create(
                    complaint=complaint,
                    file=file,
                    original_filename=file.name,
                    file_size=file.size,
                    mime_type=file.content_type,
                    uploaded_by=user
                )
            except Exception as e:
                logger.error(f"Failed to save attachment {file.name}: {e}")
        
        # Create timeline entry (non-blocking)
        try:
            Timeline.objects.create(
                complaint=complaint,
                action='CREATED',
                description=f'Complaint created by {user.email}',
                performed_by=user
            )
        except Exception:
            pass
            
        # Trigger auto-assignment from the view's method
        try:
            if not complaint.assigned_to:
                self.auto_assign_by_pincode(complaint)
        except Exception as e:
            logger.error(f"Auto-assignment failed: {e}")
        
        # Send Firebase notifications to all admins about new complaint
        try:
            from apps.notifications.firebase_service import send_notification_to_user
            from apps.users.models import User
            
            admins = User.objects.filter(role='ADMIN', is_active=True)
            for admin in admins:
                send_notification_to_user(
                    user_id=str(admin.id),
                    title=f'New Complaint: {complaint.complaint_number}',
                    message=f'{complaint.title} - {complaint.category} ({complaint.priority} priority)',
                    notification_type='info',
                    category='NEW_COMPLAINT',
                    complaint=complaint
                )
        except Exception as e:
            logger.error(f"Failed to send new complaint notifications: {e}")
        
        return complaint
    
    def auto_assign_by_pincode(self, complaint):
        """AI-powered auto-assignment with rule-based logic"""
        try:
            from utils.ai_assignment import AIAssignmentEngine
            
            ai_engine = AIAssignmentEngine()
            result = ai_engine.auto_assign_best_agent(complaint)
            
            if result['assigned']:
                Timeline.objects.create(
                    complaint=complaint,
                    action='AI_AUTO_ASSIGNED',
                    description=f'AI assigned to {result["agent"].email} (Confidence: {result["confidence"]:.0%}) - {result["reasoning"]}',
                    performed_by=None,
                    metadata={
                        'ai_confidence': result['confidence'],
                        'reasoning': result['reasoning']
                    }
                )
                return True
            else:
                # Store AI recommendations for admin review
                if result.get('recommendations'):
                    recommendations_text = []
                    for rec in result['recommendations'][:3]:
                        recommendations_text.append(
                            f"{rec['agent'].email} ({rec['confidence_score']:.0%} - {rec['reasoning']})"
                        )
                    
                    Timeline.objects.create(
                        complaint=complaint,
                        action='AI_RECOMMENDATIONS',
                        description=f'AI Recommendations: {" | ".join(recommendations_text)}',
                        performed_by=None,
                        metadata={
                            'recommendations': [
                                {
                                    'agent_id': str(rec['agent'].id),
                                    'confidence': rec['confidence_score'],
                                    'reasoning': rec['reasoning']
                                } for rec in result['recommendations']
                            ]
                        }
                    )
                
                return False
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"AI Assignment error: {e}")
            return False
    
    def suggest_agents_to_admin(self, complaint):
        """Suggest suitable agents to admin for manual assignment"""
        if not complaint.pincode:
            return
        
        try:
            from apps.users.models import User
            
            # Find agents with matching or nearby pincode
            suggested_agents = []
            
            # Exact pincode match
            exact_match = User.objects.filter(
                role='AGENT',
                is_verified=True,
                is_active=True,
                pincode=complaint.pincode
            )
            if complaint.service_type_required:
                exact_match = exact_match.filter(service_type=complaint.service_type_required)
            
            # Nearby pincode match (same first 3 digits)
            if len(complaint.pincode) >= 3:
                pincode_prefix = complaint.pincode[:3]
                nearby_match = User.objects.filter(
                    role='AGENT',
                    is_verified=True,
                    is_active=True,
                    pincode__startswith=pincode_prefix
                ).exclude(pincode=complaint.pincode)
                if complaint.service_type_required:
                    nearby_match = nearby_match.filter(service_type=complaint.service_type_required)
            else:
                nearby_match = User.objects.none()
            
            # Create timeline entry with suggestions
            suggestions = []
            if exact_match.exists():
                suggestions.append(f"Exact match agents: {', '.join([a.email for a in exact_match[:3]])}")
            if nearby_match.exists():
                suggestions.append(f"Nearby agents: {', '.join([a.email for a in nearby_match[:3]])}")
            
            if suggestions:
                Timeline.objects.create(
                    complaint=complaint,
                    action='AGENT_SUGGESTIONS',
                    description=f"Suggested agents for pincode {complaint.pincode}: {'; '.join(suggestions)}",
                    performed_by=None,
                    metadata={
                        'exact_matches': [str(a.id) for a in exact_match[:5]],
                        'nearby_matches': [str(a.id) for a in nearby_match[:5]]
                    }
                )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error suggesting agents: {e}")
    
    def auto_triage_complaint(self, complaint):
        """Auto-triage complaint based on rules"""
        try:
            # Get active triage rules ordered by priority
            rules = TriageRule.objects.filter(is_active=True).order_by('-priority_order')
            
            for rule in rules:
                # Check category match
                if rule.category and rule.category != complaint.category:
                    continue
                
                # Check priority match
                if rule.priority and rule.priority != complaint.priority:
                    continue
                
                # Check keyword patterns
                if rule.keyword_patterns:
                    description_lower = complaint.description.lower()
                    title_lower = complaint.title.lower()
                    matched = False
                    for keyword in rule.keyword_patterns:
                        if keyword.lower() in description_lower or keyword.lower() in title_lower:
                            matched = True
                            break
                    if not matched:
                        continue
                
                # Apply triage rule
                if rule.auto_assign_to:
                    complaint.assigned_to = rule.auto_assign_to
                    if complaint.status == 'OPEN':
                        complaint.status = 'IN_PROGRESS'
                
                if rule.priority:
                    complaint.priority = rule.priority
                
                complaint.save()
                
                Timeline.objects.create(
                    complaint=complaint,
                    action='AUTO_TRIAGED',
                    description=f'Auto-triaged using rule: {rule.name}',
                    performed_by=None,
                    metadata={'rule_id': str(rule.id), 'rule_name': rule.name}
                )
                
                return True
        except Exception as e:
            # Log error but don't fail complaint creation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Auto-triage error: {e}")
        
        return False

class ComplaintDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Complaint.objects.select_related('customer', 'assigned_to').prefetch_related('attachments', 'comments', 'timeline')
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated, IsComplaintOwnerOrAgent]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ComplaintUpdateSerializer
        return ComplaintSerializer
    
    def perform_update(self, serializer):
        old_status = self.get_object().status
        old_priority = self.get_object().priority
        old_assigned = self.get_object().assigned_to
        complaint = serializer.save()
        changes = []
        for field, value in serializer.validated_data.items():
            if hasattr(complaint, field):
                changes.append(f"{field}: {value}")
        
        # Fix: Sync status with assignment
        if complaint.assigned_to and complaint.status == 'OPEN':
            complaint.status = 'IN_PROGRESS'
            complaint.save(update_fields=['status'])
        elif not complaint.assigned_to and complaint.status == 'IN_PROGRESS':
            complaint.status = 'OPEN'
            complaint.save(update_fields=['status'])
        
        Timeline.objects.create(
            complaint=complaint,
            action='UPDATED',
            description=f'Complaint updated: {", ".join(changes)}',
            performed_by=self.request.user
        )
        
        if old_status != complaint.status:
            try:
                send_status_changed_email(complaint, old_status)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send status change email: {e}")
        
        if old_priority != complaint.priority:
            # Recalculate SLA on priority change
            from utils.sla_calculator import calculate_sla_deadline
            complaint.sla_deadline = calculate_sla_deadline(complaint.priority, complaint.category)
            complaint.save(update_fields=['sla_deadline'])
            
            Timeline.objects.create(
                complaint=complaint,
                action='PRIORITY_UPDATED',
                description=f'Priority changed from {old_priority} to {complaint.priority}',
                performed_by=self.request.user
            )
    
    def perform_destroy(self, instance):
        if self.request.user.role != 'ADMIN':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can delete complaints")
        if instance.status != 'RESOLVED':
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Only resolved complaints can be deleted")
        
        # Delete related objects first
        instance.attachments.all().delete()
        instance.comments.all().delete()
        instance.timeline.all().delete()
        if hasattr(instance, 'feedback'):
            try:
                instance.feedback.delete()
            except:
                pass
        
        instance.delete()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def close_complaint(request, pk):
    try:
        complaint = Complaint.objects.get(pk=pk)
        
        # User role logic: Admin can close any, Customer can close their own, Agent can close assigned
        if request.user.role != 'ADMIN' and complaint.customer != request.user and complaint.assigned_to != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
            
        if complaint.status == 'CLOSED':
            return Response({'error': 'Complaint is already closed'}, status=status.HTTP_400_BAD_REQUEST)
            
        complaint.status = 'CLOSED'
        complaint.save()
        
        Timeline.objects.create(
            complaint=complaint,
            action='CLOSED',
            description=f'Complaint closed by {request.user.email} ({request.user.role})',
            performed_by=request.user
        )
        
        # Send Firebase notifications to all parties
        try:
            from apps.notifications.firebase_service import send_notification_to_user
            
            # Notify customer
            if complaint.customer != request.user:
                send_notification_to_user(
                    user_id=str(complaint.customer.id),
                    title=f'Complaint {complaint.complaint_number} Closed',
                    message=f'Your complaint has been closed by {request.user.first_name or request.user.email}',
                    notification_type='info',
                    category='COMPLAINT_CLOSED',
                    complaint=complaint
                )
            
            # Notify assigned agent
            if complaint.assigned_to and complaint.assigned_to != request.user:
                send_notification_to_user(
                    user_id=str(complaint.assigned_to.id),
                    title=f'Complaint {complaint.complaint_number} Closed',
                    message=f'Complaint closed by {request.user.first_name or request.user.email}',
                    notification_type='info',
                    category='COMPLAINT_CLOSED',
                    complaint=complaint
                )
            
            # Notify admins
            if request.user.role != 'ADMIN':
                from apps.users.models import User
                admins = User.objects.filter(role='ADMIN', is_active=True)
                for admin in admins:
                    send_notification_to_user(
                        user_id=str(admin.id),
                        title=f'Complaint {complaint.complaint_number} Closed',
                        message=f'Closed by {request.user.first_name or request.user.email}',
                        notification_type='info',
                        category='COMPLAINT_CLOSED',
                        complaint=complaint
                    )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send closure notifications: {e}")
        
        # Status change notification (controlled by env) - keeping for backward compatibility
        if getattr(settings, 'ENABLE_EMAIL_NOTIFICATIONS', False):
            try:
                from apps.notifications.email_service import send_module_notification
                send_module_notification(complaint.customer, 'COMPLAINT_STATUS_CHANGED', complaint)
                if complaint.assigned_to and complaint.assigned_to != request.user:
                    send_module_notification(complaint.assigned_to, 'COMPLAINT_STATUS_CHANGED', complaint)
            except Exception:
                pass
            
        return Response({'message': 'Complaint closed successfully'})
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ai_recommendations(request, pk):
    """Get AI-powered agent recommendations for a complaint"""
    try:
        complaint = Complaint.objects.get(pk=pk)
        
        if request.user.role not in ['ADMIN', 'AGENT']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        from utils.ai_assignment import AIAssignmentEngine
        
        ai_engine = AIAssignmentEngine()
        recommendations = ai_engine.get_agent_recommendations(complaint)
        
        # Format recommendations for frontend
        formatted_recommendations = []
        for rec in recommendations:
            agent = rec['agent']
            formatted_recommendations.append({
                'agent_id': str(agent.id),
                'agent_name': f"{agent.first_name} {agent.last_name}",
                'agent_email': agent.email,
                'service_type': agent.service_type or 'General',
                'confidence_score': round(rec['confidence_score'] * 100, 1),  # Convert to percentage
                'reasoning': rec['reasoning'],
                'current_workload': agent.current_active_cases or 0
            })
        
        return Response({
            'recommendations': formatted_recommendations,
            'complaint_id': str(complaint.id),
            'complaint_category': complaint.category
        })
        
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to get AI recommendations: {e}")
        return Response({'error': 'Failed to get recommendations'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_complaint(request, pk):
    try:
        complaint = Complaint.objects.get(pk=pk)
        
        if request.user.role != 'ADMIN':
            return Response({'error': 'Only admins can assign complaints'}, status=status.HTTP_403_FORBIDDEN)
        
        assigned_to_id = request.data.get('assigned_to')
        
        if not assigned_to_id:
            # AI Auto-Assignment: Use AI engine to find best agent
            try:
                from utils.ai_assignment import AIAssignmentEngine
                
                ai_engine = AIAssignmentEngine()
                recommendations = ai_engine.get_agent_recommendations(complaint)
                
                if not recommendations:
                    return Response({'error': 'No suitable agents found for auto-assignment'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Get the best recommendation
                best_recommendation = recommendations[0]
                assigned_user = best_recommendation['agent']
                confidence = best_recommendation['confidence_score']
                reasoning = best_recommendation['reasoning']
                
                # Create timeline entry for AI recommendation
                Timeline.objects.create(
                    complaint=complaint,
                    action='AI_AUTO_ASSIGNMENT',
                    description=f'AI recommended {assigned_user.email} (Confidence: {confidence:.0%}) - {reasoning}',
                    performed_by=request.user,
                    metadata={
                        'ai_confidence': confidence,
                        'reasoning': reasoning
                    }
                )
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"AI auto-assignment failed: {e}")
                return Response({'error': 'AI auto-assignment failed. Please select an agent manually.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            # Manual assignment
            from apps.users.models import User
            try:
                assigned_user = User.objects.get(id=assigned_to_id, role='AGENT')
            except User.DoesNotExist:
                return Response({'error': 'Agent not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # If complaint is already assigned, unassign first
        if complaint.assigned_to:
            old_agent = complaint.assigned_to
            old_agent.current_active_cases = max(0, old_agent.current_active_cases - 1)
            old_agent.save()
            
            complaint.assigned_to = None
            complaint.save()
            
            Timeline.objects.create(
                complaint=complaint,
                action='REASSIGNMENT',
                description=f'Admin reassigning from {old_agent.email} to {assigned_user.email}',
                performed_by=request.user
            )
        
        # Create assignment request instead of direct assignment
        from .models_assignment import AgentAssignmentRequest
        from datetime import timedelta
        
        # Check if there's already a pending request for this agent
        existing_request = AgentAssignmentRequest.objects.filter(
            complaint=complaint,
            agent=assigned_user,
            status='PENDING',
            expires_at__gt=timezone.now()
        ).first()
        
        if existing_request:
            # Cancel the existing request and create a new one
            existing_request.status = 'CANCELLED'
            existing_request.save()
        
        # Create new assignment request
        assignment_request = AgentAssignmentRequest.objects.create(
            complaint=complaint,
            agent=assigned_user,
            admin=request.user,
            message=request.data.get('message', ''),
            expires_at=timezone.now() + timedelta(hours=24)  # 24 hour expiry
        )
        
        Timeline.objects.create(
            complaint=complaint,
            action='ASSIGNMENT_REQUESTED',
            description=f'Admin {request.user.email} requested assignment to {assigned_user.email}',
            performed_by=request.user
        )
        
        # Send Firebase notification to agent
        try:
            import logging
            logger = logging.getLogger(__name__)
            from apps.notifications.firebase_service import send_notification_to_user
            send_notification_to_user(
                user_id=str(assigned_user.id),
                title='New Assignment Request',
                message=f'Admin has requested you to handle complaint #{complaint.complaint_number}: {complaint.title}',
                notification_type='info',
                category='ASSIGNMENT_REQUEST',
                complaint=complaint
            )
            logger.info(f"Firebase notification sent to agent {assigned_user.email}")
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send Firebase notification: {e}")
        
        return Response({
            'message': 'Assignment request sent to agent successfully',
            'request_id': str(assignment_request.id)
        })
        
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_assignment(request, pk):
    try:
        complaint = Complaint.objects.get(pk=pk)
        
        if request.user.role != 'AGENT':
            return Response({'error': 'Only agents can request assignment'}, status=status.HTTP_403_FORBIDDEN)
        
        if complaint.assigned_to:
            return Response({'error': 'Complaint already assigned'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if already requested
        existing = AssignmentRequest.objects.filter(
            complaint=complaint,
            requested_by=request.user,
            status='PENDING'
        ).exists()
        
        if existing:
            return Response({'error': 'Assignment request already pending'}, status=status.HTTP_400_BAD_REQUEST)
        
        assignment_request = AssignmentRequest.objects.create(
            complaint=complaint,
            requested_by=request.user,
            message=request.data.get('message', '')
        )
        
        Timeline.objects.create(
            complaint=complaint,
            action='ASSIGNMENT_REQUESTED',
            description=f'Assignment requested by {request.user.email}',
            performed_by=request.user
        )
        
        serializer = AssignmentRequestSerializer(assignment_request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_agent_assignment(request, pk):
    """Admin requests assignment of a complaint to a specific agent"""
    try:
        complaint = Complaint.objects.get(pk=pk)
        
        if request.user.role != 'ADMIN':
            return Response({'error': 'Only admins can request agent assignment'}, status=status.HTTP_403_FORBIDDEN)
        
        if complaint.assigned_to:
            return Response({'error': 'Complaint already assigned'}, status=status.HTTP_400_BAD_REQUEST)
        
        agent_id = request.data.get('agent_id')
        if not agent_id:
            return Response({'error': 'agent_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from apps.users.models import User
        try:
            agent = User.objects.get(id=agent_id, role='AGENT')
        except User.DoesNotExist:
            return Response({'error': 'Agent not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if already requested for this agent
        existing = AssignmentRequest.objects.filter(
            complaint=complaint,
            requested_by=agent,
            status='PENDING'
        ).exists()
        
        if existing:
            return Response({'error': 'Assignment request already pending for this agent'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create assignment request (from admin's perspective, but agent is the one who will accept/reject)
        assignment_request = AssignmentRequest.objects.create(
            complaint=complaint,
            requested_by=agent,  # Agent is the one who will accept/reject
            message=request.data.get('message', f'Admin {request.user.email} requested assignment to you. Please accept or reject.')
        )
        
        Timeline.objects.create(
            complaint=complaint,
            action='ASSIGNMENT_REQUESTED',
            description=f'Admin {request.user.email} requested assignment to {agent.email}',
            performed_by=request.user
        )
        
        # Send real-time notification to agent (disabled to prevent timeout)
        # try:
        #     send_real_time_notification(
        #         str(agent.id),
        #         'Assignment Request',
        #         f'You have been requested to handle complaint #{complaint.complaint_number}: {complaint.title}',
        #         'info'
        #     )
        # except Exception:
        #     pass
        
        serializer = AssignmentRequestSerializer(assignment_request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_assignment_requests(request):
    from .models_assignment import AgentAssignmentRequest
    from .serializers import AgentAssignmentRequestSerializer
    
    if request.user.role == 'ADMIN':
        # 1. Requests FROM agents TO admin
        agent_requests = AssignmentRequest.objects.filter(status='PENDING')
        agent_serializer = AssignmentRequestSerializer(agent_requests, many=True)
        
        # 2. Requests FROM admin TO agents
        # Only show if request is PENDING AND complaint is still OPEN and UNASSIGNED
        admin_requests = AgentAssignmentRequest.objects.filter(
            status='PENDING',
            expires_at__gt=timezone.now(),
            complaint__status='OPEN',
            complaint__assigned_to__isnull=True
        )
        admin_serializer = AgentAssignmentRequestSerializer(admin_requests, many=True)
        
        # Return both
        return Response({
            'incoming': agent_serializer.data, # Agent requesting ticket
            'outgoing': admin_serializer.data  # Admin requesting agent
        })
    
    elif request.user.role == 'AGENT':
        # Show assignment requests sent to this agent
        agent_requests = AgentAssignmentRequest.objects.filter(
            agent=request.user,
            status='PENDING',
            expires_at__gt=timezone.now()
        ).select_related('complaint', 'admin')
        
        serializer = AgentAssignmentRequestSerializer(agent_requests, many=True)
        return Response({
            'assignment_requests': serializer.data
        })
    
    else:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def review_assignment_request(request, pk):
    try:
        assignment_request = AssignmentRequest.objects.get(pk=pk)
        
        # Allow both ADMIN and AGENT (when it's their own request) to review
        if request.user.role == 'ADMIN':
            # Admin reviewing agent's request
            action = request.data.get('action')  # 'approve' or 'reject'
            
            if action == 'approve':
                complaint = assignment_request.complaint
                if complaint.assigned_to:
                    return Response({'error': 'Complaint already assigned'}, status=status.HTTP_400_BAD_REQUEST)
                
                agent = assignment_request.requested_by
                complaint.assigned_to = agent
                if complaint.status == 'OPEN':
                    complaint.status = 'IN_PROGRESS'
                complaint.save()
                
                # Update agent workload
                agent.total_assigned_cases += 1
                agent.current_active_cases += 1
                agent.save(update_fields=['total_assigned_cases', 'current_active_cases'])
                
                assignment_request.status = 'APPROVED'
                assignment_request.reviewed_by = request.user
                assignment_request.reviewed_at = timezone.now()
                assignment_request.save()
                
                Timeline.objects.create(
                    complaint=complaint,
                    action='ASSIGNED',
                    description=f'Assignment request approved. Assigned to {assignment_request.requested_by.email}',
                    performed_by=request.user
                )
                
                return Response({'message': 'Assignment request approved'})
            
            elif action == 'reject':
                assignment_request.status = 'REJECTED'
                assignment_request.reviewed_by = request.user
                assignment_request.reviewed_at = timezone.now()
                assignment_request.save()
                
                Timeline.objects.create(
                    complaint=assignment_request.complaint,
                    action='ASSIGNMENT_REJECTED',
                    description=f'Assignment request rejected for {assignment_request.requested_by.email}',
                    performed_by=request.user
                )
                
                return Response({'message': 'Assignment request rejected'})
            
            else:
                return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.user.role == 'AGENT' and assignment_request.requested_by == request.user:
            # Agent responding to admin's assignment request
            action = request.data.get('action')  # 'accept' or 'reject'
            
            if action == 'accept':
                complaint = assignment_request.complaint
                if complaint.assigned_to:
                    return Response({'error': 'Complaint already assigned'}, status=status.HTTP_400_BAD_REQUEST)
                
                complaint.assigned_to = request.user
                if complaint.status == 'OPEN':
                    complaint.status = 'IN_PROGRESS'
                complaint.save()
                
                # Update agent workload
                request.user.total_assigned_cases += 1
                request.user.current_active_cases += 1
                request.user.save(update_fields=['total_assigned_cases', 'current_active_cases'])
                
                assignment_request.status = 'APPROVED'
                assignment_request.reviewed_by = request.user
                assignment_request.reviewed_at = timezone.now()
                assignment_request.save()
                
                Timeline.objects.create(
                    complaint=complaint,
                    action='ASSIGNED',
                    description=f'Agent {request.user.email} accepted assignment request',
                    performed_by=request.user
                )
                
                return Response({'message': 'Assignment request accepted'})
            
            elif action == 'reject':
                assignment_request.status = 'REJECTED'
                assignment_request.reviewed_by = request.user
                assignment_request.reviewed_at = timezone.now()
                assignment_request.save()
                
                Timeline.objects.create(
                    complaint=assignment_request.complaint,
                    action='ASSIGNMENT_REJECTED',
                    description=f'Agent {request.user.email} rejected assignment request (marked as busy)',
                    performed_by=request.user
                )
                
                return Response({'message': 'Assignment request rejected'})
            
            else:
                return Response({'error': 'Invalid action. Use "accept" or "reject"'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
    except AssignmentRequest.DoesNotExist:
        return Response({'error': 'Assignment request not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_to_agent_assignment(request, pk):
    """Agent responds to admin's assignment request (accept/reject)"""
    try:
        from .models_assignment import AgentAssignmentRequest
        
        assignment_request = AgentAssignmentRequest.objects.select_related(
            'complaint', 'agent', 'admin', 'complaint__customer'
        ).get(pk=pk)
        
        # Only the assigned agent can respond
        if request.user != assignment_request.agent:
            return Response({'error': 'Only the assigned agent can respond to this request'}, status=status.HTTP_403_FORBIDDEN)
        
        if assignment_request.status != 'PENDING':
            return Response({'error': f'Request already {assignment_request.status.lower()}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if expired
        if assignment_request.expires_at < timezone.now():
            assignment_request.status = 'EXPIRED'
            assignment_request.save()
            return Response({'error': 'Assignment request has expired'}, status=status.HTTP_400_BAD_REQUEST)
        
        action = request.data.get('action')  # 'accept' or 'reject'
        agent_response = request.data.get('response', '')
        
        complaint = assignment_request.complaint
        
        if action == 'accept':
            # Check if complaint is still available
            if complaint.assigned_to:
                return Response({'error': 'Complaint already assigned to another agent'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Assign the complaint
            complaint.assigned_to = request.user
            if complaint.status == 'OPEN':
                complaint.status = 'IN_PROGRESS'
            complaint.save()
            
            # Update agent workload
            request.user.total_assigned_cases += 1
            request.user.current_active_cases += 1
            request.user.save(update_fields=['total_assigned_cases', 'current_active_cases'])
            
            # Update request status
            assignment_request.status = 'ACCEPTED'
            assignment_request.agent_response = agent_response
            assignment_request.responded_at = timezone.now()
            assignment_request.save()
            
            Timeline.objects.create(
                complaint=complaint,
                action='ASSIGNED',
                description=f'Agent {request.user.email} accepted assignment request',
                performed_by=request.user
            )
            
            # Send Firebase notification to admin
            try:
                from apps.notifications.firebase_service import send_notification_to_user
                send_notification_to_user(
                    user_id=str(assignment_request.admin.id),
                    title='Assignment Request Accepted',
                    message=f'Agent {request.user.first_name} {request.user.last_name} accepted complaint #{complaint.complaint_number}',
                    notification_type='success',
                    category='ASSIGNMENT_ACCEPTED',
                    complaint=complaint
                )
            except Exception as e:
                logger.error(f"Failed to send notification to admin: {e}")
            
            # Send Firebase notification to customer
            try:
                from apps.notifications.firebase_service import send_notification_to_user
                send_notification_to_user(
                    user_id=str(complaint.customer.id),
                    title='Agent Assigned to Your Complaint',
                    message=f'Agent {request.user.first_name} {request.user.last_name} has been assigned to your complaint #{complaint.complaint_number}',
                    notification_type='info',
                    category='COMPLAINT_STATUS_CHANGED',
                    complaint=complaint
                )
            except Exception as e:
                logger.error(f"Failed to send notification to customer: {e}")
            
            return Response({'message': 'Assignment request accepted successfully'})
        
        elif action == 'reject':
            # Update request status
            assignment_request.status = 'REJECTED'
            assignment_request.agent_response = agent_response or 'Agent is currently busy'
            assignment_request.responded_at = timezone.now()
            assignment_request.save()
            
            Timeline.objects.create(
                complaint=complaint,
                action='ASSIGNMENT_REJECTED',
                description=f'Agent {request.user.email} rejected assignment request: {agent_response}',
                performed_by=request.user
            )
            
            # Send Firebase notification to admin
            try:
                from apps.notifications.firebase_service import send_notification_to_user
                send_notification_to_user(
                    user_id=str(assignment_request.admin.id),
                    title='Assignment Request Rejected',
                    message=f'Agent {request.user.first_name} {request.user.last_name} rejected complaint #{complaint.complaint_number}. Reason: {agent_response or "Not specified"}',
                    notification_type='warning',
                    category='ASSIGNMENT_REJECTED',
                    complaint=complaint
                )
            except Exception as e:
                logger.error(f"Failed to send notification to admin: {e}")
            
            return Response({'message': 'Assignment request rejected'})
        
        else:
            return Response({'error': 'Invalid action. Use "accept" or "reject"'}, status=status.HTTP_400_BAD_REQUEST)
        
    except AgentAssignmentRequest.DoesNotExist:
        return Response({'error': 'Assignment request not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_complaint(request, pk):
    try:
        complaint = Complaint.objects.get(pk=pk)
        
        if request.user.role not in ['ADMIN', 'AGENT']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        if complaint.status == 'RESOLVED':
            return Response({'error': 'Complaint already resolved'}, status=status.HTTP_400_BAD_REQUEST)
        
        resolution_notes = request.data.get('resolution_notes', '')
        complaint.status = 'RESOLVED'
        complaint.resolution_notes = resolution_notes
        complaint.resolved_at = timezone.now()
        complaint.save()
        
        # Update agent performance tracking
        if complaint.assigned_to:
            agent = complaint.assigned_to
            agent.total_resolved_cases += 1
            agent.current_active_cases = max(0, agent.current_active_cases - 1)
            
            # Calculate resolution time in hours
            if complaint.created_at:
                resolution_time = (complaint.resolved_at - complaint.created_at).total_seconds() / 3600
                # Update average resolution time
                if agent.total_resolved_cases == 1:
                    agent.average_resolution_time_hours = resolution_time
                else:
                    agent.average_resolution_time_hours = (
                        (agent.average_resolution_time_hours * (agent.total_resolved_cases - 1) + resolution_time) / 
                        agent.total_resolved_cases
                    )
            agent.save(update_fields=['total_resolved_cases', 'current_active_cases', 'average_resolution_time_hours'])
        
        # Handle resolution attachments (proof of work) with 10MB size limit
        files = request.FILES.getlist('resolution_files')
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes
        
        for file in files:
            try:
                # Validate file size
                if file.size > MAX_FILE_SIZE:
                    logger.warning(f"File {file.name} exceeds 10MB limit ({file.size} bytes)")
                    continue
                
                Attachment.objects.create(
                    complaint=complaint,
                    file=file,
                    original_filename=file.name,
                    file_size=file.size,
                    mime_type=file.content_type or 'application/octet-stream',
                    attachment_type='RESOLUTION',
                    uploaded_by=request.user
                )
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error creating resolution attachment: {e}")
        
        Timeline.objects.create(
            complaint=complaint,
            action='RESOLVED',
            description=f'Complaint resolved: {resolution_notes}',
            performed_by=request.user
        )
        
        # Send Firebase notifications to all parties
        try:
            from apps.notifications.firebase_service import send_notification_to_user
            
            # Notify customer
            if complaint.customer != request.user:
                send_notification_to_user(
                    user_id=str(complaint.customer.id),
                    title=f'Complaint {complaint.complaint_number} Resolved',
                    message=f'Your complaint has been resolved by {request.user.first_name or request.user.email}',
                    notification_type='success',
                    category='COMPLAINT_RESOLVED',
                    complaint=complaint
                )
            
            # Notify assigned agent if different from resolver
            if complaint.assigned_to and complaint.assigned_to != request.user:
                send_notification_to_user(
                    user_id=str(complaint.assigned_to.id),
                    title=f'Complaint {complaint.complaint_number} Resolved',
                    message=f'Complaint resolved by {request.user.first_name or request.user.email}',
                    notification_type='success',
                    category='COMPLAINT_RESOLVED',
                    complaint=complaint
                )
            
            # Notify admins
            if request.user.role != 'ADMIN':
                from apps.users.models import User
                admins = User.objects.filter(role='ADMIN', is_active=True)
                for admin in admins:
                    send_notification_to_user(
                        user_id=str(admin.id),
                        title=f'Complaint {complaint.complaint_number} Resolved',
                        message=f'Resolved by {request.user.first_name or request.user.email}',
                        notification_type='success',
                        category='COMPLAINT_RESOLVED',
                        complaint=complaint
                    )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send resolution notifications: {e}")
        
        return Response({'message': 'Complaint resolved successfully'})
        
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_comment(request, pk):
    try:
        complaint = Complaint.objects.get(pk=pk)
        
        if not IsComplaintOwnerOrAgent().has_object_permission(request, None, complaint):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        content = request.data.get('content')
        is_internal = request.data.get('is_internal', False)
        
        if not content:
            return Response({'error': 'Content is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        comment = Comment.objects.create(
            complaint=complaint,
            user=request.user,
            content=content,
            is_internal=is_internal
        )
        
        Timeline.objects.create(
            complaint=complaint,
            action='COMMENTED',
            description=f'Comment added by {request.user.email}',
            performed_by=request.user
        )
        
        # Send Firebase notifications to relevant parties
        try:
            from apps.notifications.firebase_service import send_notification_to_user
            
            # Notify customer if comment is from agent/admin
            if request.user.role in ['AGENT', 'ADMIN'] and complaint.customer != request.user:
                send_notification_to_user(
                    user_id=str(complaint.customer.id),
                    title=f'New Message on {complaint.complaint_number}',
                    message=f'{request.user.first_name or request.user.email} replied to your complaint',
                    notification_type='info',
                    category='COMMENT_ADDED',
                    complaint=complaint
                )
            
            # Notify assigned agent if comment is from customer/admin
            if complaint.assigned_to and complaint.assigned_to != request.user:
                send_notification_to_user(
                    user_id=str(complaint.assigned_to.id),
                    title=f'New Message on {complaint.complaint_number}',
                    message=f'{request.user.first_name or request.user.email} added a comment',
                    notification_type='info',
                    category='COMMENT_ADDED',
                    complaint=complaint
                )
            
            # Notify admin if comment is from customer/agent (for non-internal comments)
            if not is_internal and request.user.role != 'ADMIN':
                from apps.users.models import User
                admins = User.objects.filter(role='ADMIN', is_active=True)
                for admin in admins:
                    if admin != request.user:
                        send_notification_to_user(
                            user_id=str(admin.id),
                            title=f'New Comment on {complaint.complaint_number}',
                            message=f'{request.user.first_name or request.user.email} commented on complaint',
                            notification_type='info',
                            category='COMMENT_ADDED',
                            complaint=complaint
                        )
        except Exception as e:
            logger.error(f"Failed to send comment notifications: {e}")
        
        serializer = CommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_comments(request, pk):
    try:
        complaint = Complaint.objects.get(pk=pk)
        
        if not IsComplaintOwnerOrAgent().has_object_permission(request, None, complaint):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        comments = complaint.comments.all()
        if request.user.role == 'CUSTOMER':
            comments = comments.filter(is_internal=False)
        
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)
        
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_feedback(request, pk):
    try:
        complaint = Complaint.objects.get(pk=pk)
        
        if complaint.customer != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        if complaint.status != 'RESOLVED':
            return Response({'error': 'Can only add feedback to resolved complaints'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if hasattr(complaint, 'feedback'):
            return Response({'error': 'Feedback already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = FeedbackSerializer(data=request.data)
        if serializer.is_valid():
            feedback = serializer.save(complaint=complaint)
            
            # Calculate average agent rating from sub-ratings
            ratings = []
            if feedback.agent_professionalism_rating:
                ratings.append(feedback.agent_professionalism_rating)
            if feedback.resolution_speed_rating:
                ratings.append(feedback.resolution_speed_rating)
            if ratings:
                feedback.agent_rating = round(sum(ratings) / len(ratings))
                feedback.save()
            
            Timeline.objects.create(
                complaint=complaint,
                action='FEEDBACK_ADDED',
                description=f'Feedback added: Overall {feedback.rating}/5, Agent Professionalism {feedback.agent_professionalism_rating or "N/A"}/5, Resolution Speed {feedback.resolution_speed_rating or "N/A"}/5',
                performed_by=request.user
            )
            
            # Send Firebase notifications to agent and admins
            try:
                from apps.notifications.firebase_service import send_notification_to_user
                from apps.users.models import User
                
                # Notify assigned agent about feedback
                if complaint.assigned_to:
                    send_notification_to_user(
                        user_id=str(complaint.assigned_to.id),
                        title=f'New Feedback on {complaint.complaint_number}',
                        message=f'Customer rated {feedback.rating}/5 stars for your resolution',
                        notification_type='success' if feedback.rating >= 4 else 'warning',
                        category='FEEDBACK_RECEIVED',
                        complaint=complaint
                    )
                
                # Notify all admins about feedback
                admins = User.objects.filter(role='ADMIN', is_active=True)
                for admin in admins:
                    send_notification_to_user(
                        user_id=str(admin.id),
                        title=f'Feedback Received on {complaint.complaint_number}',
                        message=f'Customer gave {feedback.rating}/5 stars',
                        notification_type='info',
                        category='FEEDBACK_RECEIVED',
                        complaint=complaint
                    )
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send feedback notifications: {e}")
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reopen_complaint(request, pk):
    """Reopen a resolved or closed complaint within the reopen window"""
    try:
        complaint = Complaint.objects.get(pk=pk)
        
        # Check if customer owns the complaint
        if complaint.customer != request.user and request.user.role not in ['ADMIN', 'AGENT']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Check if complaint can be reopened
        if not complaint.can_reopen:
            return Response({'error': 'This complaint cannot be reopened'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Check if within reopen window (30 days by default)
        if complaint.resolved_at:
            days_since_resolution = (timezone.now() - complaint.resolved_at).days
            if days_since_resolution > complaint.reopen_window_days:
                return Response({
                    'error': f'Reopen window expired. Complaints can only be reopened within {complaint.reopen_window_days} days of resolution.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if complaint is in a state that can be reopened
        if complaint.status not in ['RESOLVED', 'CLOSED']:
            return Response({'error': 'Only resolved or closed complaints can be reopened'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        reason = request.data.get('reason', '')
        
        # Reopen the complaint
        complaint.status = 'REOPENED'
        complaint.resolved_at = None
        complaint.closed_at = None
        complaint.save()
        
        # Update agent workload if assigned
        if complaint.assigned_to:
            agent = complaint.assigned_to
            agent.current_active_cases += 1
            agent.total_resolved_cases = max(0, agent.total_resolved_cases - 1)
            agent.save(update_fields=['current_active_cases', 'total_resolved_cases'])
        
        Timeline.objects.create(
            complaint=complaint,
            action='REOPENED',
            description=f'Complaint reopened by {request.user.email}. Reason: {reason or "Not provided"}',
            performed_by=request.user,
            metadata={'reason': reason}
        )
        
        
        # Send notifications
        try:
            send_status_changed_email(complaint, 'RESOLVED')
            
            # Also send Firebase notifications
            from apps.notifications.firebase_service import send_notification_to_user
            from apps.users.models import User
            
            # Notify customer (if not the one who reopened)
            if complaint.customer != request.user:
                send_notification_to_user(
                    user_id=str(complaint.customer.id),
                    title=f'Complaint {complaint.complaint_number} Reopened',
                    message=f'Your complaint has been reopened and will be reviewed again',
                    notification_type='info',
                    category='COMPLAINT_REOPENED',
                    complaint=complaint
                )
            
            # Notify assigned agent
            if complaint.assigned_to:
                send_notification_to_user(
                    user_id=str(complaint.assigned_to.id),
                    title=f'Complaint {complaint.complaint_number} Reopened',
                    message=f'A resolved complaint has been reopened. Please review.',
                    notification_type='warning',
                    category='COMPLAINT_REOPENED',
                    complaint=complaint
                )
            
            # Notify all admins
            admins = User.objects.filter(role='ADMIN', is_active=True)
            for admin in admins:
                if admin != request.user:
                    send_notification_to_user(
                        user_id=str(admin.id),
                        title=f'Complaint {complaint.complaint_number} Reopened',
                        message=f'Reopened by {request.user.first_name or request.user.email}',
                        notification_type='warning',
                        category='COMPLAINT_REOPENED',
                        complaint=complaint
                    )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send reopen notifications: {e}")
        
        return Response({
            'message': 'Complaint reopened successfully',
            'complaint': ComplaintSerializer(complaint).data
        })
        
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_complaint_templates(request):
    """List all active complaint templates"""
    templates = ComplaintTemplate.objects.filter(is_active=True)
    data = [{
        'id': str(t.id),
        'name': t.name,
        'category': t.category,
        'default_priority': t.default_priority,
        'title_template': t.title_template,
        'description_template': t.description_template,
        'usage_count': t.usage_count
    } for t in templates]
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_complaint_template(request, pk):
    """Get a specific complaint template"""
    try:
        template = ComplaintTemplate.objects.get(pk=pk, is_active=True)
        return Response({
            'id': str(template.id),
            'name': template.name,
            'category': template.category,
            'default_priority': template.default_priority,
            'title_template': template.title_template,
            'description_template': template.description_template
        })
    except ComplaintTemplate.DoesNotExist:
        return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_from_template(request):
    """Create a complaint from a template"""
    try:
        template_id = request.data.get('template_id')
        if not template_id:
            return Response({'error': 'template_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        template = ComplaintTemplate.objects.get(pk=template_id, is_active=True)
        
        # Create complaint from template
        complaint_data = {
            'title': request.data.get('title', template.title_template),
            'description': request.data.get('description', template.description_template),
            'category': template.category,
            'priority': request.data.get('priority', template.default_priority),
            'location': request.data.get('location', ''),
        }
        
        serializer = ComplaintSerializer(data=complaint_data, context={'request': request})
        if serializer.is_valid():
            complaint = serializer.save()
            complaint.template_used = template
            complaint.save()
            
            # Increment template usage
            template.usage_count += 1
            template.save()
            
            # Handle file attachments
            files = request.FILES.getlist('attachments')
            for file in files:
                Attachment.objects.create(
                    complaint=complaint,
                    file=file,
                    original_filename=file.name,
                    file_size=file.size,
                    mime_type=file.content_type,
                    uploaded_by=request.user
                )
            
            # Auto-triage
            list_view = ComplaintListCreateView()
            list_view.auto_triage_complaint(complaint)
            
            Timeline.objects.create(
                complaint=complaint,
                action='CREATED',
                description=f'Complaint created from template: {template.name}',
                performed_by=request.user
            )
            
            send_complaint_created_email(complaint)
            
            return Response(ComplaintSerializer(complaint).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except ComplaintTemplate.DoesNotExist:
        return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)

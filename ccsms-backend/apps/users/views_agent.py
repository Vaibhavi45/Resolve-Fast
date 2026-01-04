from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import User
from apps.complaints.models import Complaint
from apps.complaints.models_assignment import AgentAssignmentRequest
from apps.complaints.serializers import ComplaintSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agent_detail(request, agent_id):
    """Get agent details with assigned complaints and status"""
    if request.user.role != 'ADMIN':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    agent = get_object_or_404(User, id=agent_id, role='AGENT')
    
    # Get assigned complaints
    assigned_complaints = Complaint.objects.filter(assigned_to=agent).order_by('-created_at')
    
    data = {
        'id': str(agent.id),
        'name': f"{agent.first_name} {agent.last_name}",
        'email': agent.email,
        'phone': agent.phone,
        'pincode': agent.pincode,
        'service_type': agent.service_type,
        'is_verified': agent.is_verified,
        'agent_status': agent.agent_status,
        'is_available': agent.is_available,
        'current_active_cases': agent.current_active_cases,
        'total_assigned_cases': agent.total_assigned_cases,
        'total_resolved_cases': agent.total_resolved_cases,
        'performance_rating': agent.performance_rating,
        'last_activity': agent.last_activity,
        'assigned_complaints': ComplaintSerializer(assigned_complaints, many=True).data
    }
    
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_complaint_to_agent(request):
    """Admin assigns complaint to agent"""
    if request.user.role != 'ADMIN':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    complaint_id = request.data.get('complaint_id')
    agent_id = request.data.get('agent_id')
    message = request.data.get('message', '')
    
    complaint = get_object_or_404(Complaint, id=complaint_id)
    agent = get_object_or_404(User, id=agent_id, role='AGENT')
    
    if not agent.is_available:
        return Response({'error': 'Agent is not available'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if already requested
    if AgentAssignmentRequest.objects.filter(
        complaint=complaint,
        agent=agent,
        status='PENDING',
        expires_at__gt=timezone.now()
    ).exists():
        return Response({'error': 'Assignment request already pending for this agent'}, status=status.HTTP_400_BAD_REQUEST)

    # Create assignment request
    assignment_request = AgentAssignmentRequest.objects.create(
        complaint=complaint,
        agent=agent,
        admin=request.user,
        message=message
    )
    
    # Send real-time notification to agent
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"agent_{agent.id}",
        {
            'type': 'assignment_request',
            'data': {
                'request_id': str(assignment_request.id),
                'complaint_number': complaint.complaint_number,
                'complaint_title': complaint.title,
                'priority': complaint.priority,
                'admin_name': f"{request.user.first_name} {request.user.last_name}",
                'message': message,
                'expires_at': assignment_request.expires_at.isoformat()
            }
        }
    )
    
    return Response({
        'message': 'Assignment request sent to agent',
        'request_id': str(assignment_request.id)
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_to_assignment(request):
    """Agent responds to assignment request"""
    if request.user.role != 'AGENT':
        return Response({'error': 'Agent access required'}, status=status.HTTP_403_FORBIDDEN)
    
    request_id = request.data.get('request_id')
    response_type = request.data.get('response')  # 'accept' or 'reject'
    agent_message = request.data.get('message', '')
    
    assignment_request = get_object_or_404(AgentAssignmentRequest, id=request_id, agent=request.user)
    
    if assignment_request.status != 'PENDING':
        return Response({'error': 'Request already responded to'}, status=status.HTTP_400_BAD_REQUEST)
    
    if timezone.now() > assignment_request.expires_at:
        assignment_request.status = 'EXPIRED'
        assignment_request.save()
        return Response({'error': 'Request has expired'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Update assignment request
    assignment_request.status = 'ACCEPTED' if response_type == 'accept' else 'REJECTED'
    assignment_request.agent_response = agent_message
    assignment_request.responded_at = timezone.now()
    assignment_request.save()
    
    complaint = assignment_request.complaint
    
    if response_type == 'accept':
        # Assign complaint to agent
        complaint.assigned_to = request.user
        complaint.status = 'IN_PROGRESS'
        complaint.save()
        
        # Update agent stats
        request.user.current_active_cases += 1
        request.user.agent_status = 'BUSY' if request.user.current_active_cases >= 5 else 'AVAILABLE'
        request.user.save()
        
        notification_message = f"Agent {request.user.first_name} {request.user.last_name} accepted complaint {complaint.complaint_number}"
    else:
        notification_message = f"Agent {request.user.first_name} {request.user.last_name} rejected complaint {complaint.complaint_number}. Please assign it to another agent."
    
    # Send real-time notification to admin
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"admin_{assignment_request.admin.id}",
        {
            'type': 'assignment_response',
            'data': {
                'complaint_number': complaint.complaint_number,
                'agent_name': f"{request.user.first_name} {request.user.last_name}",
                'response': response_type,
                'message': notification_message,
                'agent_message': agent_message
            }
        }
    )
    
    return Response({
        'message': f'Assignment request {response_type}ed successfully',
        'status': assignment_request.status
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agent_pending_requests(request):
    """Get pending assignment requests for agent"""
    if request.user.role != 'AGENT':
        return Response({'error': 'Agent access required'}, status=status.HTTP_403_FORBIDDEN)
    
    pending_requests = AgentAssignmentRequest.objects.filter(
        agent=request.user,
        status='PENDING',
        expires_at__gt=timezone.now()
    )
    
    data = []
    for req in pending_requests:
        data.append({
            'id': str(req.id),
            'complaint_number': req.complaint.complaint_number,
            'complaint_title': req.complaint.title,
            'priority': req.complaint.priority,
            'category': req.complaint.category,
            'admin_name': f"{req.admin.first_name} {req.admin.last_name}",
            'message': req.message,
            'expires_at': req.expires_at,
            'created_at': req.created_at
        })
    
    return Response(data)
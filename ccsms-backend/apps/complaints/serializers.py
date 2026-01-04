from rest_framework import serializers
from .models import Complaint, Attachment, Comment, Timeline, Feedback, AssignmentRequest
from apps.users.serializers import UserSerializer
from utils.sla_calculator import calculate_sla_deadline

class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ('id', 'file', 'original_filename', 'file_size', 'mime_type', 'attachment_type', 'uploaded_by', 'uploaded_at')
        read_only_fields = ('id', 'file_size', 'mime_type', 'uploaded_by', 'uploaded_at')

class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Comment
        fields = ('id', 'user', 'content', 'is_internal', 'created_at', 'updated_at')
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')

class TimelineSerializer(serializers.ModelSerializer):
    performed_by = UserSerializer(read_only=True)
    
    class Meta:
        model = Timeline
        fields = ('id', 'action', 'description', 'performed_by', 'metadata', 'created_at')
        read_only_fields = ('id', 'performed_by', 'created_at')

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ('id', 'rating', 'agent_rating', 'agent_professionalism_rating', 'resolution_speed_rating', 'comment', 'created_at')
        read_only_fields = ('id', 'created_at')

class AssignmentRequestSerializer(serializers.ModelSerializer):
    requested_by = UserSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)
    complaint_number = serializers.CharField(source='complaint.complaint_number', read_only=True)
    complaint_title = serializers.CharField(source='complaint.title', read_only=True)
    is_admin_initiated = serializers.SerializerMethodField()
    
    def get_is_admin_initiated(self, obj):
        return False # This model is for Agent -> Admin requests
    
    class Meta:
        model = AssignmentRequest
        fields = ('id', 'complaint', 'complaint_number', 'complaint_title', 'requested_by', 'status', 'message', 'reviewed_by', 'reviewed_at', 'created_at', 'is_admin_initiated')
        read_only_fields = ('id', 'requested_by', 'reviewed_by', 'reviewed_at', 'created_at')

from .models_assignment import AgentAssignmentRequest

class AgentAssignmentRequestSerializer(serializers.ModelSerializer):
    agent = UserSerializer(read_only=True)
    admin = UserSerializer(read_only=True)
    complaint_number = serializers.CharField(source='complaint.complaint_number', read_only=True)
    complaint_title = serializers.CharField(source='complaint.title', read_only=True)
    is_admin_initiated = serializers.SerializerMethodField()
    
    def get_is_admin_initiated(self, obj):
        return True
    
    class Meta:
        model = AgentAssignmentRequest
        fields = ('id', 'complaint', 'complaint_number', 'complaint_title', 'agent', 'admin', 'status', 'message', 'agent_response', 'expires_at', 'responded_at', 'created_at', 'is_admin_initiated')
        read_only_fields = ('id', 'agent', 'admin', 'expires_at', 'responded_at', 'created_at')


class ComplaintSerializer(serializers.ModelSerializer):
    customer = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    resolution_attachments = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)
    timeline = TimelineSerializer(many=True, read_only=True)
    feedback = FeedbackSerializer(read_only=True)
    
    def get_resolution_attachments(self, obj):
        resolution_attachments = obj.attachments.filter(attachment_type='RESOLUTION')
        return AttachmentSerializer(resolution_attachments, many=True).data
    
    class Meta:
        model = Complaint
        fields = '__all__'
        read_only_fields = ('id', 'complaint_number', 'customer', 'sla_deadline', 
                           'sla_breached', 'resolved_at', 'closed_at', 'created_at', 'updated_at')
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['customer'] = user
        
        # For customers: calculate priority from expected_resolution_days
        # For agents/admins: use provided priority
        if user.role == 'CUSTOMER':
            expected_days = validated_data.get('expected_resolution_days')
            if expected_days:
                # Convert expected days to priority
                if expected_days <= 1:
                    validated_data['priority'] = 'CRITICAL'
                elif expected_days <= 3:
                    validated_data['priority'] = 'HIGH'
                elif expected_days <= 7:
                    validated_data['priority'] = 'MEDIUM'
                else:
                    validated_data['priority'] = 'LOW'
            else:
                # Default to MEDIUM if not specified
                validated_data['priority'] = 'MEDIUM'
        
        # Calculate SLA deadline safely
        try:
            validated_data['sla_deadline'] = calculate_sla_deadline(
                validated_data['priority'], 
                validated_data['category']
            )
        except Exception as e:
            # If SLA calculation fails, set a default deadline
            from django.utils import timezone
            from datetime import timedelta
            validated_data['sla_deadline'] = timezone.now() + timedelta(days=7)
        
        return super().create(validated_data)

class ComplaintListSerializer(serializers.ModelSerializer):
    customer = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    
    class Meta:
        model = Complaint
        fields = ('id', 'complaint_number', 'title', 'category', 'priority', 'status',
                 'customer', 'assigned_to', 'sla_deadline', 'sla_breached', 'created_at')

class ComplaintUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = ('title', 'description', 'category', 'priority', 'status', 
                 'assigned_to', 'resolution_notes', 'root_cause', 'estimated_resolution_time')
    
    def validate(self, attrs):
        user = self.context['request'].user
        instance = self.instance
        
        if user.role == 'CUSTOMER':
            # Customer can only update title and description if status is OPEN
            allowed_fields = {'title', 'description'}
            if instance.status != 'OPEN':
                raise serializers.ValidationError("Can only update title and description when status is OPEN")
            if not set(attrs.keys()).issubset(allowed_fields):
                raise serializers.ValidationError("Customers can only update title and description")
        elif user.role == 'ADMIN':
            # Admin can update all fields including priority
            pass
        elif user.role == 'AGENT':
            # Agent cannot update priority, only admin can
            if 'priority' in attrs:
                raise serializers.ValidationError("Only admins can update complaint priority")
        
        return attrs
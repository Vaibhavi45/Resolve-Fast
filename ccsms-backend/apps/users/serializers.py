from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone', 'role', 
                 'avatar', 'notification_preferences', 'contact_preferences', 
                 'profile_visibility', 'share_analytics',
                 'pincode', 'service_type', 'service_card_id', 'is_verified',
                 'is_active', 'date_joined', 'last_login')
        read_only_fields = ('id', 'email', 'role', 'is_verified', 'date_joined', 'last_login')

class UserProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone', 'role',
                 'avatar', 'notification_preferences', 'contact_preferences', 
                 'profile_visibility', 'share_analytics',
                 'pincode', 'service_type', 'service_card_id', 'is_verified',
                 'date_joined', 'last_login')
        read_only_fields = ('id', 'email', 'role', 'is_verified', 'date_joined', 'last_login')
    
    def get_avatar(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None
    
    def update(self, instance, validated_data):
        # Handle avatar upload
        avatar = self.context['request'].FILES.get('avatar')
        if avatar:
            instance.avatar = avatar
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

class AgentListSerializer(serializers.ModelSerializer):
    current_active_cases = serializers.SerializerMethodField()
    total_resolved_cases = serializers.SerializerMethodField()
    is_busy = serializers.SerializerMethodField()
    assigned_complaints = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'first_name', 'last_name', 'email', 'phone', 'pincode', 
                 'service_type', 'service_card_id', 'is_verified', 'is_active', 
                 'current_active_cases', 'total_resolved_cases', 'is_busy', 'assigned_complaints')
        read_only_fields = ('id', 'first_name', 'last_name', 'email', 'is_verified')
    
    def get_current_active_cases(self, obj):
        return obj.assigned_complaints.filter(status__in=['OPEN', 'IN_PROGRESS']).count()
    
    def get_total_resolved_cases(self, obj):
        return obj.assigned_complaints.filter(status='RESOLVED').count()
    
    def get_assigned_complaints(self, obj):
        complaints = obj.assigned_complaints.all().order_by('-created_at')
        return [{
            'id': str(c.id),
            'complaint_number': c.complaint_number,
            'title': c.title,
            'status': c.status,
        } for c in complaints]
    
    def get_is_busy(self, obj):
        """Check if agent has rejected any assignment requests in the last 2 hours"""
        from apps.complaints.models import AssignmentRequest
        from django.utils import timezone
        from datetime import timedelta
        
        two_hours_ago = timezone.now() - timedelta(hours=2)
        recent_rejections = AssignmentRequest.objects.filter(
            requested_by=obj,
            status='REJECTED',
            reviewed_at__gte=two_hours_ago
        ).exists()
        
        return recent_rejections
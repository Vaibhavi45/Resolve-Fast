from rest_framework import serializers
from .models import AuditLog
from apps.users.serializers import UserSerializer

class AuditLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = AuditLog
        fields = ('id', 'user', 'action', 'entity_type', 'entity_id', 
                 'changes', 'ip_address', 'user_agent', 'timestamp')
        read_only_fields = ('id', 'timestamp')
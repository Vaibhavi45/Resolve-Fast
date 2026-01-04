from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'complaint', 'notification_type', 'title', 'message', 
                 'is_read', 'sent_at', 'read_at', 'category')
        read_only_fields = ('id', 'complaint', 'notification_type', 'title', 
                           'message', 'sent_at', 'read_at', 'category')
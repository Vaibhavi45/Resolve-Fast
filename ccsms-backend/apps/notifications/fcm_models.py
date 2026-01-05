"""
FCM Token Model for storing Firebase Cloud Messaging device tokens
"""
import uuid
from django.db import models
from django.conf import settings


class FCMToken(models.Model):
    """Store FCM tokens for push notifications"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='fcm_tokens'
    )
    token = models.CharField(max_length=255, unique=True)
    device_type = models.CharField(
        max_length=20,
        choices=[
            ('WEB', 'Web Browser'),
            ('ANDROID', 'Android'),
            ('IOS', 'iOS'),
        ],
        default='WEB'
    )
    device_name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_used = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'fcm_tokens'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['token']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.device_type} ({self.token[:20]}...)"

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class AgentAssignmentRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('EXPIRED', 'Expired'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint = models.ForeignKey('Complaint', on_delete=models.CASCADE, related_name='agent_assignment_requests')
    agent = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assignment_requests_received')
    admin = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assignment_requests_sent')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    message = models.TextField(blank=True, help_text="Optional message from admin")
    agent_response = models.TextField(blank=True, help_text="Agent's response message")
    expires_at = models.DateTimeField(help_text="Request expiry time")
    responded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(minutes=15)  # 15 min expiry
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Assignment Request: {self.complaint.complaint_number} -> {self.agent.first_name}"
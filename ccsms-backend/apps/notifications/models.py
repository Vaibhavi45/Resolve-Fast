import uuid
from django.db import models
from django.conf import settings

class Notification(models.Model):
    TYPE_CHOICES = [
        ('EMAIL', 'Email'),
        ('PUSH', 'Push'),
        ('SMS', 'SMS'),
        ('IN_APP', 'In-App'),
    ]
    
    CATEGORY_CHOICES = [
        ('COMPLAINT_CREATED', 'Complaint Created'),
        ('COMPLAINT_ASSIGNED', 'Complaint Assigned'),
        ('COMPLAINT_STATUS_CHANGED', 'Status Changed'),
        ('COMPLAINT_RESOLVED', 'Complaint Resolved'),
        ('COMPLAINT_REOPENED', 'Complaint Reopened'),
        ('COMMENT_ADDED', 'Comment Added'),
        ('FEEDBACK_RECEIVED', 'Feedback Received'),
        ('ASSIGNMENT_REQUEST', 'Assignment Request'),
        ('ASSIGNMENT_APPROVED', 'Assignment Approved'),
        ('ASSIGNMENT_REJECTED', 'Assignment Rejected'),
        ('SLA_BREACH', 'SLA Breach'),
        ('ESCALATION', 'Escalation'),
        ('SYSTEM', 'System Notification'),
    ]
    
    MODULE_CHOICES = [
        ('CUSTOMER', 'Customer Module'),
        ('AGENT', 'Agent Module'),
        ('ADMIN', 'Admin Module'),
        ('SYSTEM', 'System Module'),
    ]
    
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    complaint = models.ForeignKey('complaints.Complaint', on_delete=models.CASCADE, null=True, blank=True)
    
    # Notification details
    notification_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='SYSTEM')
    module = models.CharField(max_length=20, choices=MODULE_CHOICES, default='SYSTEM')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Email specific fields
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    email_error = models.TextField(blank=True, null=True)
    
    # Tracking
    is_read = models.BooleanField(default=False)
    sent_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional notification data")
    
    class Meta:
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['category', 'sent_at']),
            models.Index(fields=['module', 'user']),
        ]
    
    def __str__(self):
        return f"{self.category} - {self.user.email}"


class NotificationPreference(models.Model):
    """User preferences for receiving notifications"""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_preference')
    
    # Email preferences by category
    email_complaint_created = models.BooleanField(default=True)
    email_complaint_assigned = models.BooleanField(default=True)
    email_complaint_status_changed = models.BooleanField(default=True)
    email_complaint_resolved = models.BooleanField(default=True)
    email_comment_added = models.BooleanField(default=True)
    email_feedback_received = models.BooleanField(default=True)
    email_assignment_request = models.BooleanField(default=True)
    email_sla_breach = models.BooleanField(default=True)
    
    # In-app preferences
    inapp_all_notifications = models.BooleanField(default=True)
    
    # Digest preferences
    daily_digest = models.BooleanField(default=False)
    weekly_digest = models.BooleanField(default=False)
    
    # Quiet hours
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Notification Preferences - {self.user.email}"
    
    def should_send_email(self, category):
        """Check if user wants email for this category"""
        category_map = {
            'COMPLAINT_CREATED': self.email_complaint_created,
            'COMPLAINT_ASSIGNED': self.email_complaint_assigned,
            'COMPLAINT_STATUS_CHANGED': self.email_complaint_status_changed,
            'COMPLAINT_RESOLVED': self.email_complaint_resolved,
            'COMMENT_ADDED': self.email_comment_added,
            'FEEDBACK_RECEIVED': self.email_feedback_received,
            'ASSIGNMENT_REQUEST': self.email_assignment_request,
            'SLA_BREACH': self.email_sla_breach,
        }
        return category_map.get(category, True)
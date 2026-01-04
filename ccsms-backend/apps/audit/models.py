import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('ASSIGN', 'Assign'),
        ('RESOLVE', 'Resolve'),
        ('EXPORT', 'Export'),
        ('VIEW', 'View'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=50)
    entity_type = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=100)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user} - {self.action} - {self.entity_type} at {self.timestamp}"

class DataRetentionPolicy(models.Model):
    RESOURCE_CHOICES = [
        ('complaints', 'Complaints'),
        ('attachments', 'Attachments'),
        ('audit_logs', 'Audit Logs'),
        ('user_data', 'User Data'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resource_type = models.CharField(max_length=50, choices=RESOURCE_CHOICES, unique=True)
    retention_days = models.IntegerField(help_text="Number of days to retain data")
    auto_delete = models.BooleanField(default=False)
    last_cleanup = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.resource_type} - {self.retention_days} days"

class ComplianceReport(models.Model):
    REPORT_TYPES = [
        ('gdpr', 'GDPR Compliance'),
        ('data_export', 'Data Export'),
        ('retention', 'Data Retention'),
        ('access_log', 'Access Log'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date_from = models.DateTimeField()
    date_to = models.DateTimeField()
    file_path = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=20, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.report_type} - {self.created_at}"
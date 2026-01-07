import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta
from utils.validators import validate_file_size

# Import assignment models
from .models_assignment import AgentAssignmentRequest

class Complaint(models.Model):
    CATEGORY_CHOICES = [
        ('TECHNICAL', 'Technical'),
        ('PRODUCT_QUALITY', 'Product Quality'),
        ('SERVICE', 'Service'),
    ]
    
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('IN_PROGRESS', 'In Progress'),
        ('RESOLVED', 'Resolved'),
        ('CLOSED', 'Closed'),
        ('ESCALATED', 'Escalated'),
        ('REOPENED', 'Reopened'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint_number = models.CharField(max_length=20, unique=True, blank=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='OPEN')
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='complaints')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_complaints')
    sla_deadline = models.DateTimeField(null=True, blank=True)
    sla_breached = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    root_cause = models.TextField(blank=True)
    estimated_resolution_time = models.CharField(max_length=100, blank=True)
    expected_resolution_days = models.IntegerField(null=True, blank=True, help_text="Customer's expected resolution time in days")
    can_reopen = models.BooleanField(default=True)
    reopen_window_days = models.IntegerField(default=30)
    location = models.CharField(max_length=200, blank=True, help_text="Location/city where complaint originated")
    pincode = models.CharField(max_length=10, blank=True, help_text="Customer pincode for location-based assignment")
    service_type_required = models.CharField(max_length=50, blank=True, help_text="Required service type for this complaint")
    service_delivery_type = models.CharField(
        max_length=20,
        choices=[
            ('PICKUP', 'Agent Pickup'),
            ('SHOP', 'Customer to Shop'),
            ('HOME', 'Home Service'),
        ],
        blank=True,
        help_text="How service will be delivered (for product complaints)"
    )
    auto_triaged = models.BooleanField(default=False, help_text="Whether this complaint was auto-triaged")
    template_used = models.ForeignKey('ComplaintTemplate', on_delete=models.SET_NULL, null=True, blank=True, related_name='complaints')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.complaint_number:
            last_complaint = Complaint.objects.filter(complaint_number__startswith='TKT-').order_by('-complaint_number').first()
            if last_complaint:
                last_number = int(last_complaint.complaint_number.split('-')[1])
                count = last_number + 1
            else:
                count = 1
            self.complaint_number = f"TKT-{count:06d}"
        
        # Set SLA deadline if not set
        if not self.sla_deadline and self.priority:
            from utils.sla_calculator import calculate_sla_deadline
            self.sla_deadline = calculate_sla_deadline(self.priority, self.category)
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.complaint_number} - {self.title}"

class Attachment(models.Model):
    ATTACHMENT_TYPE_CHOICES = [
        ('COMPLAINT', 'Complaint Attachment'),
        ('RESOLUTION', 'Resolution Proof'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='attachments/%Y/%m/%d/', validators=[validate_file_size])
    original_filename = models.CharField(max_length=255)
    file_size = models.IntegerField()
    mime_type = models.CharField(max_length=100)
    attachment_type = models.CharField(max_length=20, choices=ATTACHMENT_TYPE_CHOICES, default='COMPLAINT')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.original_filename} - {self.complaint.complaint_number}"

class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    is_internal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Comment by {self.user.email} on {self.complaint.complaint_number}"

class Timeline(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='timeline')
    action = models.CharField(max_length=50)
    description = models.TextField()
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.action} - {self.complaint.complaint_number}"

class Feedback(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint = models.OneToOneField(Complaint, on_delete=models.CASCADE, related_name='feedback')
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)], help_text="Overall experience rating")
    agent_professionalism_rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)], null=True, blank=True, help_text="Agent professionalism rating (1-5)")
    resolution_speed_rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)], null=True, blank=True, help_text="Resolution speed rating (1-5)")
    agent_rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)], null=True, blank=True, help_text="Overall agent rating (legacy field)")
    comment = models.TextField(blank=True, max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Feedback {self.rating}/5 - {self.complaint.complaint_number}"

class AssignmentRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='assignment_requests')
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assignment_requests_made')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    message = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assignment_requests_reviewed')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Assignment Request by {self.requested_by.email} for {self.complaint.complaint_number}"

class EscalationRule(models.Model):
    category = models.CharField(max_length=20, choices=Complaint.CATEGORY_CHOICES)
    priority = models.CharField(max_length=10, choices=Complaint.PRIORITY_CHOICES)
    escalation_time_hours = models.IntegerField()
    escalate_to_role = models.CharField(max_length=10, choices=[('CUSTOMER', 'Customer'), ('AGENT', 'Agent'), ('ADMIN', 'Admin')])
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.category} - {self.priority} ({self.escalation_time_hours}h)"

class ComplaintTemplate(models.Model):
    """Templates for quick complaint submission"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=Complaint.CATEGORY_CHOICES)
    default_priority = models.CharField(max_length=10, choices=Complaint.PRIORITY_CHOICES, default='MEDIUM')
    title_template = models.CharField(max_length=200)
    description_template = models.TextField()
    is_active = models.BooleanField(default=True)
    usage_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-usage_count', 'name']
    
    def __str__(self):
        return f"{self.name} - {self.category}"

class TriageRule(models.Model):
    """Rules for automatic triage of complaints"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=Complaint.CATEGORY_CHOICES, null=True, blank=True)
    priority = models.CharField(max_length=10, choices=Complaint.PRIORITY_CHOICES, null=True, blank=True)
    keyword_patterns = models.JSONField(default=list, help_text="List of keywords to match in description")
    auto_assign_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='triage_rules')
    is_active = models.BooleanField(default=True)
    priority_order = models.IntegerField(default=0, help_text="Higher priority rules are evaluated first")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-priority_order', 'name']
    
    def __str__(self):
        return f"{self.name} - Priority: {self.priority_order}"
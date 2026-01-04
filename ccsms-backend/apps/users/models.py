import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [
        ('CUSTOMER', 'Customer'),
        ('AGENT', 'Agent'),
        ('ADMIN', 'Admin'),
    ]
    
    PROFILE_VISIBILITY_CHOICES = [
        ('EVERYONE', 'Everyone'),
        ('TEAM_MEMBERS', 'Team Members Only'),
        ('PRIVATE', 'Private'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15, blank=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='CUSTOMER')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    notification_preferences = models.JSONField(default=dict, blank=True)
    contact_preferences = models.JSONField(default=dict, blank=True)
    profile_visibility = models.CharField(max_length=20, choices=PROFILE_VISIBILITY_CHOICES, default='EVERYONE')
    share_analytics = models.BooleanField(default=False, help_text="Whether user shares analytics data")
    
    # Location and Service Agent fields
    pincode = models.CharField(max_length=10, blank=True, help_text="Pincode/ZIP code for location-based services")
    service_type = models.CharField(max_length=50, blank=True, help_text="Service type for agents (e.g., Electronics, Appliances, etc.)")
    service_card_id = models.CharField(max_length=50, blank=True, unique=True, null=True, help_text="Service card/ID for agent verification")
    is_verified = models.BooleanField(default=False, help_text="Whether agent is verified by admin")
    
    # Agent Performance Tracking
    total_assigned_cases = models.IntegerField(default=0, help_text="Total cases assigned to this agent")
    total_resolved_cases = models.IntegerField(default=0, help_text="Total cases resolved by this agent")
    current_active_cases = models.IntegerField(default=0, help_text="Currently active cases assigned to this agent")
    average_resolution_time_hours = models.FloatField(default=0.0, help_text="Average time to resolve cases in hours")
    performance_rating = models.FloatField(default=0.0, help_text="Average performance rating from feedback")
    
    # Agent Status
    AGENT_STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('BUSY', 'Busy'),
        ('OFFLINE', 'Offline'),
    ]
    agent_status = models.CharField(max_length=10, choices=AGENT_STATUS_CHOICES, default='AVAILABLE', help_text="Current agent availability status")
    last_activity = models.DateTimeField(auto_now=True, help_text="Last activity timestamp")
    
    @property
    def is_available(self):
        return self.agent_status == 'AVAILABLE' and self.current_active_cases < 5  # Max 5 active cases
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    def __str__(self):
        return f"{self.email} ({self.role})"
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.conf import settings
from apps.complaints.models import Complaint, Comment, AssignmentRequest
from .email_service import send_module_notification, notify_admins
from .models import NotificationPreference

User = get_user_model()

@receiver(pre_save, sender=Complaint)
def complaint_pre_save(sender, instance, **kwargs):
    if instance.pk:
        # Store old status for post_save comparison
        try:
            instance._old_status = Complaint.objects.get(pk=instance.pk).status
        except Complaint.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None

@receiver(post_save, sender=Complaint)
def complaint_post_save(sender, instance, created, **kwargs):
    # Check if email notifications are enabled
    if not getattr(settings, 'ENABLE_EMAIL_NOTIFICATIONS', False):
        return
    
    if created:
        # 1. Notify Customer that complaint is registered
        send_module_notification(instance.customer, 'COMPLAINT_CREATED', instance)
        
        # 2. Notify Admins about new complaint
        notify_admins('COMPLAINT_CREATED', instance)
    else:
        # Handle status changes
        old_status = getattr(instance, '_old_status', None)
        if old_status and old_status != instance.status:
            if instance.status == 'RESOLVED':
                send_module_notification(instance.customer, 'COMPLAINT_RESOLVED', instance, {
                    'resolution_notes': instance.resolution_notes or "Resolved by agent",
                    'reopen_window_days': instance.reopen_window_days
                })
            else:
                send_module_notification(instance.customer, 'COMPLAINT_STATUS_CHANGED', instance)
            
            # If assigned to an agent, notify them too
            if instance.assigned_to:
                send_module_notification(instance.assigned_to, 'COMPLAINT_STATUS_CHANGED', instance)

@receiver(post_save, sender=Comment)
def comment_post_save(sender, instance, created, **kwargs):
    # Check if email notifications are enabled
    if not getattr(settings, 'ENABLE_EMAIL_NOTIFICATIONS', False):
        return
    
    if created:
        complaint = instance.complaint
        # Notify the other party
        if instance.user.role == 'CUSTOMER':
            # Notify Assigned Agent if exists, otherwise Notify Admin
            if complaint.assigned_to:
                send_module_notification(complaint.assigned_to, 'COMMENT_ADDED', complaint)
            else:
                notify_admins('COMMENT_ADDED', complaint)
        else:
            # Notify Customer
            send_module_notification(complaint.customer, 'COMMENT_ADDED', complaint)

@receiver(post_save, sender=User)
def create_default_notification_preferences(sender, instance, created, **kwargs):
    if created:
        # Create default preferences record for the user
        NotificationPreference.objects.get_or_create(
            user=instance,
            defaults={
                'email_complaint_created': True,
                'email_complaint_assigned': True,
                'email_complaint_status_changed': True,
                'email_complaint_resolved': True,
                'email_comment_added': True,
                'email_feedback_received': True,
                'email_assignment_request': True,
                'email_sla_breach': True,
                'inapp_all_notifications': True
            }
        )

@receiver(post_save, sender=AssignmentRequest)
def assignment_request_post_save(sender, instance, created, **kwargs):
    # Check if email notifications are enabled
    if not getattr(settings, 'ENABLE_EMAIL_NOTIFICATIONS', False):
        return
    
    if created:
        # Notify Admin that an agent wants to pick this up
        notify_admins('ASSIGNMENT_REQUEST', instance.complaint, {
            'agent_name': f"{instance.requested_by.first_name} {instance.requested_by.last_name}",
            'request_message': instance.message
        })
    elif instance.status == 'APPROVED':
        # Notify Agent that request was approved
        send_module_notification(instance.requested_by, 'COMPLAINT_ASSIGNED', instance.complaint)

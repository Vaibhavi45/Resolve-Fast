from django.template.loader import render_to_string
from .tasks import send_email_notification
from apps.users.models import User
from .models import Notification, NotificationPreference

def send_module_notification(user, category, complaint=None, extra_context=None):
    """
    Central service to send notifications and create in-app records
    """
    context = {
        'user_name': f"{user.first_name} {user.last_name}",
        'user_role': user.role,
        'site_url': 'http://localhost:3000', # Should be in settings
    }
    
    if complaint:
        context.update({
            'complaint_number': complaint.complaint_number,
            'complaint_title': complaint.title,
            'complaint_status': complaint.status,
            'complaint_priority': complaint.priority,
            'complaint_url': f'http://localhost:3000/dashboard/complaints/{complaint.id}',
        })
        
    if extra_context:
        context.update(extra_context)
        
    # Subjects and template mapping
    notification_map = {
        'COMPLAINT_CREATED': {
            'subject': f'Complaint Registered: #{complaint.complaint_number}' if complaint else 'Complaint Registered',
            'template': 'new_complaint'
        },
        'COMPLAINT_ASSIGNED': {
            'subject': f'Complaint Assigned: #{complaint.complaint_number}' if complaint else 'Complaint Assigned',
            'template': 'assignment'
        },
        'COMPLAINT_STATUS_CHANGED': {
            'subject': f'Status Update: #{complaint.complaint_number}' if complaint else 'Status Update',
            'template': 'status_update'
        },
        'COMPLAINT_RESOLVED': {
            'subject': f'Complaint Resolved: #{complaint.complaint_number}' if complaint else 'Complaint Resolved',
            'template': 'resolution'
        },
        'COMMENT_ADDED': {
            'subject': f'New Comment on #{complaint.complaint_number}' if complaint else 'New Comment',
            'template': 'new_comment'
        },
        'ASSIGNMENT_REQUEST': {
            'subject': f'New Assignment Request: #{complaint.complaint_number}' if complaint else 'Assignment Request',
            'template': 'assignment_request'
        },
        'SLA_BREACH': {
            'subject': f'URGENT: SLA Breach on #{complaint.complaint_number}' if complaint else 'SLA Breach',
            'template': 'sla_breach'
        },
    }
    
    config = notification_map.get(category, {
        'subject': f'Update on Complaint: #{complaint.complaint_number}' if complaint else 'System Notification',
        'template': 'generic_notification'
    })

    # 1. ALWAYS Create In-App Notification (Synchronous)
    notification = Notification.objects.create(
        user=user,
        notification_type='IN_APP',
        category=category,
        module=user.role,
        title=config['subject'],
        message=config['subject'], # Fallback message
        complaint=complaint,
        metadata=extra_context or {}
    )
    
    # 2. Handle Email (Asynchronous)
    # Get or create preferences
    prefs, _ = NotificationPreference.objects.get_or_create(user=user)
    if prefs.should_send_email(category):
        try:
            message = render_to_string(f'emails/{config["template"]}.txt', context)
        except:
            message = f"Hello {context['user_name']},\n\nYou have a new notification regarding {config['subject']}.\n\nPlease check the dashboard for details."

        send_email_notification.delay(
            user_id=str(user.id),
            category=category,
            title=config['subject'],
            message=message,
            complaint_id=str(complaint.id) if complaint else None,
            notification_id=str(notification.id)
        )


def notify_admins(category, complaint=None, extra_context=None):
    """Utility to notify all active admins"""
    admins = User.objects.filter(role='ADMIN', is_active=True)
    for admin in admins:
        send_module_notification(admin, category, complaint, extra_context)
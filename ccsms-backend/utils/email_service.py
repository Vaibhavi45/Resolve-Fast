from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from apps.users.models import User # ADDED FOR ADMIN NOTIFICATIONS

def send_welcome_email(user):
    subject = 'Welcome to CCSMS'
    message = f'Welcome {user.first_name}! Your account has been created successfully.'
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])

def send_complaint_created_email(complaint):
    subject = f'Complaint Created - {complaint.complaint_number}'
    message = f'Your complaint "{complaint.title}" has been created and assigned number {complaint.complaint_number}.'
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [complaint.customer.email])

def send_complaint_assigned_email(complaint):
    if complaint.assigned_to:
        subject = f'Complaint Assigned - {complaint.complaint_number}'
        message = f'You have been assigned complaint {complaint.complaint_number}: "{complaint.title}"'
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [complaint.assigned_to.email])

def send_status_changed_email(complaint, old_status):
    subject = f'Complaint Status Updated - {complaint.complaint_number}'
    message = f'Your complaint status has been updated from {old_status} to {complaint.status}.'
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [complaint.customer.email])

def send_complaint_resolved_email(complaint):
    subject = f'Complaint Resolved - {complaint.complaint_number}'
    message = f'Your complaint "{complaint.title}" has been resolved. Please provide feedback.'
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [complaint.customer.email])

def send_admin_complaint_resolved_email(complaint):
    """Email notification for all active Admin users when a complaint is resolved."""
    subject = f'Complaint Resolved: #{complaint.complaint_number}'
    
    # Check if resolved_by attribute exists and has an email, otherwise use a generic string
    resolved_by_email = complaint.resolved_by.email if hasattr(complaint, 'resolved_by') and complaint.resolved_by else 'Agent/Admin'
    
    message = f'Complaint "{complaint.title}" has been resolved by {resolved_by_email}.'
    
    admin_emails = User.objects.filter(role='ADMIN', is_active=True).values_list('email', flat=True)
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, admin_emails)

def send_sla_breach_alert(complaint):
    subject = f'SLA Breach Alert - {complaint.complaint_number}'
    message = f'Complaint {complaint.complaint_number} has breached its SLA deadline.'
    recipients = [complaint.customer.email]
    if complaint.assigned_to:
        recipients.append(complaint.assigned_to.email)
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, recipients)
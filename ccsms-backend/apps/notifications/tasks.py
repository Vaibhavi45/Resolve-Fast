from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from .models import Notification, NotificationPreference
from apps.users.models import User

@shared_task(bind=True, max_retries=3)
def send_email_notification(self, user_id, category, title, message, complaint_id=None, metadata=None, notification_id=None):
    """Refined task for sending emails with status tracking"""
    try:
        user = User.objects.get(id=user_id)
        
        # Check preferences again inside worker
        prefs, _ = NotificationPreference.objects.get_or_create(user=user)
        if not prefs.should_send_email(category):
            return f"Skipped email for {user.email} (preferences)"

        # Try to find existing record to update
        notification = None
        if notification_id:
            try:
                notification = Notification.objects.get(id=notification_id)
            except Notification.DoesNotExist:
                pass
        
        # If no record found, create one for email tracking (internal use)
        if not notification:
             notification = Notification.objects.create(
                user=user,
                notification_type='EMAIL',
                category=category,
                module=user.role,
                title=title,
                message=message,
                complaint_id=complaint_id,
                metadata=metadata or {}
            )
        
        try:
            send_mail(
                subject=title,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False
            )
            
            notification.email_sent = True
            notification.email_sent_at = timezone.now()
            notification.save()
            return f"Email sent successfully to {user.email}"
            
        except Exception as email_exc:
            notification.email_error = str(email_exc)
            notification.save()
            raise email_exc
            
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@shared_task
def send_bulk_notifications(user_ids, category, title, message, complaint_id=None):
    """Send notifications to multiple users in real-time"""
    for user_id in user_ids:
        send_email_notification.delay(
            user_id=user_id,
            category=category,
            title=title,
            message=message,
            complaint_id=complaint_id
        )
    
    return f"Queued {len(user_ids)} notifications"
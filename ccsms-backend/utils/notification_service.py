"""
Real-time notification service using Firebase Cloud Messaging
Replaces the old WebSocket-based notification system
"""
from apps.notifications.firebase_service import send_notification_to_user as send_fcm_notification
import logging

logger = logging.getLogger(__name__)


def send_real_time_notification(user_id, title, message, notification_type='info'):
    """
    Send real-time notification to user via Firebase Cloud Messaging
    
    Args:
        user_id: User ID (UUID)
        title: Notification title
        message: Notification message
        notification_type: Type of notification (info, success, warning, error)
    """
    try:
        return send_fcm_notification(user_id, title, message, notification_type)
    except Exception as e:
        logger.error(f"Error sending real-time notification: {e}")
        return False
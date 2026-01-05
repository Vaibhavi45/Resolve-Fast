"""
Firebase Cloud Messaging Service
Replaces WebSocket-based notifications with Firebase FCM
"""
from . import firebase_config
import logging


logger = logging.getLogger(__name__)


def send_fcm_notification(fcm_token, title, body, data=None):
    """
    Send FCM notification to a single device
    
    Args:
        fcm_token: FCM registration token
        title: Notification title
        body: Notification body
        data: Additional data payload (dict)
    """
    if not fcm_token:
        logger.warning("No FCM token provided")
        return False
    
    try:
        message = firebase_config.messaging.Message(
            notification=firebase_config.messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            token=fcm_token,
        )
        
        response = firebase_config.messaging.send(message)
        logger.info(f"Successfully sent message: {response}")
        
        # Store notification in Firestore for history
        store_notification_in_firestore(fcm_token, title, body, data)
        
        return True
    except Exception as e:
        logger.error(f"Error sending FCM notification: {e}")
        return False


def send_multicast_notification(fcm_tokens, title, body, data=None):
    """
    Send FCM notification to multiple devices
    
    Args:
        fcm_tokens: List of FCM registration tokens
        title: Notification title
        body: Notification body
        data: Additional data payload (dict)
    """
    if not fcm_tokens:
        logger.warning("No FCM tokens provided")
        return False
    
    try:
        message = firebase_config.messaging.MulticastMessage(
            notification=firebase_config.messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            tokens=fcm_tokens,
        )
        
        response = firebase_config.messaging.send_multicast(message)
        logger.info(f"Successfully sent {response.success_count} messages")
        
        if response.failure_count > 0:
            logger.warning(f"Failed to send {response.failure_count} messages")
            # Handle failed tokens (e.g., remove invalid tokens from database)
            for idx, resp in enumerate(response.responses):
                if not resp.success:
                    logger.error(f"Failed token: {fcm_tokens[idx]}, Error: {resp.exception}")
        
        return True
    except Exception as e:
        logger.error(f"Error sending multicast FCM notification: {e}")
        return False


def send_topic_notification(topic, title, body, data=None):
    """
    Send FCM notification to a topic (e.g., all admins, all agents)
    
    Args:
        topic: Topic name (e.g., 'admins', 'agents')
        title: Notification title
        body: Notification body
        data: Additional data payload (dict)
    """
    try:
        message = firebase_config.messaging.Message(
            notification=firebase_config.messaging.Notification(
                title=title,
                body=body,
            ),
            data=data or {},
            topic=topic,
        )
        
        response = firebase_config.messaging.send(message)
        logger.info(f"Successfully sent topic message to {topic}: {response}")
        return True
    except Exception as e:
        logger.error(f"Error sending topic notification: {e}")
        return False


def subscribe_to_topic(fcm_tokens, topic):
    """
    Subscribe tokens to a topic
    
    Args:
        fcm_tokens: List of FCM registration tokens
        topic: Topic name
    """
    try:
        response = firebase_config.messaging.subscribe_to_topic(fcm_tokens, topic)
        logger.info(f"Successfully subscribed {response.success_count} tokens to {topic}")
        return True
    except Exception as e:
        logger.error(f"Error subscribing to topic: {e}")
        return False


def unsubscribe_from_topic(fcm_tokens, topic):
    """
    Unsubscribe tokens from a topic
    
    Args:
        fcm_tokens: List of FCM registration tokens
        topic: Topic name
    """
    try:
        response = firebase_config.messaging.unsubscribe_from_topic(fcm_tokens, topic)
        logger.info(f"Successfully unsubscribed {response.success_count} tokens from {topic}")
        return True
    except Exception as e:
        logger.error(f"Error unsubscribing from topic: {e}")
        return False


def store_notification_in_firestore(user_id, title, body, data=None):
    """
    Store notification in Firestore for history
    
    Args:
        user_id: User ID or FCM token
        title: Notification title
        body: Notification body
        data: Additional data
    """
    try:
        from datetime import datetime
        
        # Get Firestore DB with timeout protection
        db = firebase_config.db
        if db is None:
            logger.warning("Firestore client not available, skipping notification storage")
            return
        
        notification_ref = db.collection('notifications').document()
        notification_ref.set({
            'user_id': user_id,
            'title': title,
            'body': body,
            'data': data or {},
            'read': False,
            'created_at': datetime.utcnow(),
        })
        logger.info(f"Stored notification in Firestore: {notification_ref.id}")
    except Exception as e:
        logger.warning(f"Could not store notification in Firestore: {e}")


def send_notification_to_user(user_id, title, message, notification_type='info', category='SYSTEM', complaint=None):
    """
    Send notification to a user by user ID
    Replaces the old send_real_time_notification function
    
    Args:
        user_id: User ID (UUID)
        title: Notification title
        message: Notification message
        notification_type: Type of notification (info, success, warning, error)
        category: Notification category (e.g., 'COMPLAINT_ASSIGNED')
        complaint: Complaint instance if applicable
    """
    from apps.users.models import User
    from .models import Notification
    
    try:
        user = User.objects.get(id=user_id)
        
        # 1. Create In-App Notification record in Django DB
        # This ensures it shows up in the notification list when fetched via API
        Notification.objects.create(
            user=user,
            notification_type='PUSH',
            category=category,
            title=title,
            message=message,
            complaint=complaint,
            metadata={'type': notification_type}
        )
        
        # 2. Send FCM Push Notification
        # Get all active FCM tokens for this user
        tokens_queryset = user.fcm_tokens.filter(is_active=True)
        fcm_tokens = list(tokens_queryset.values_list('token', flat=True))
        
        if not fcm_tokens:
            logger.warning(f"No active FCM tokens for user {user_id}")
            return False
        
        data = {
            'type': notification_type,
            'user_id': str(user_id),
            'category': category,
        }
        if complaint:
            data['complaint_id'] = str(complaint.id)
        
        success = send_multicast_notification(fcm_tokens, title, message, data)
        return success
        
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return False
    except Exception as e:
        logger.error(f"Error sending notification to user: {e}")
        return False


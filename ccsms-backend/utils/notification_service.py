from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def send_real_time_notification(user_id, title, message, notification_type='info'):
    """Send real-time notification to user via WebSocket"""
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f'notifications_{user_id}',
            {
                'type': 'notification_message',
                'message': {
                    'title': title,
                    'message': message,
                    'type': notification_type
                }
            }
        )
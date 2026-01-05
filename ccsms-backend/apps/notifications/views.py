from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import Notification
from .fcm_models import FCMToken
from .serializers import NotificationSerializer

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_read', 'notification_type']
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, pk):
    try:
        notification = Notification.objects.get(pk=pk, user=request.user)
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        
        return Response({'message': 'Notification marked as read'})
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    notifications = Notification.objects.filter(user=request.user, is_read=False)
    count = notifications.update(is_read=True, read_at=timezone.now())
    
    return Response({'message': f'{count} notifications marked as read'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_count(request):
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({'unread_count': count})


# FCM Token Management Endpoints

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_fcm_token(request):
    """Register or update FCM token for the current user"""
    token = request.data.get('token')
    device_type = request.data.get('device_type', 'WEB')
    device_name = request.data.get('device_name', '')
    
    if not token:
        return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Check if token already exists
        fcm_token, created = FCMToken.objects.update_or_create(
            token=token,
            defaults={
                'user': request.user,
                'device_type': device_type,
                'device_name': device_name,
                'is_active': True,
                'last_used': timezone.now()
            }
        )
        
        # Subscribe to role-based topic
        from .firebase_service import subscribe_to_topic
        role_topic = request.user.role.lower()  # 'customer', 'agent', or 'admin'
        subscribe_to_topic([token], role_topic)
        
        message = 'FCM token registered successfully' if created else 'FCM token updated successfully'
        return Response({
            'message': message,
            'token_id': str(fcm_token.id)
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def unregister_fcm_token(request):
    """Unregister FCM token (e.g., on logout)"""
    token = request.data.get('token')
    
    if not token:
        return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        fcm_token = FCMToken.objects.get(token=token, user=request.user)
        
        # Unsubscribe from topics
        from .firebase_service import unsubscribe_from_topic
        role_topic = request.user.role.lower()
        unsubscribe_from_topic([token], role_topic)
        
        fcm_token.is_active = False
        fcm_token.save()
        
        return Response({'message': 'FCM token unregistered successfully'})
        
    except FCMToken.DoesNotExist:
        return Response({'error': 'Token not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_fcm_tokens(request):
    """List all active FCM tokens for the current user"""
    tokens = FCMToken.objects.filter(user=request.user, is_active=True)
    
    data = [{
        'id': str(token.id),
        'device_type': token.device_type,
        'device_name': token.device_name,
        'created_at': token.created_at,
        'last_used': token.last_used
    } for token in tokens]
    
    return Response(data)
from django.urls import path
from . import views

urlpatterns = [
    path('', views.NotificationListView.as_view(), name='notification_list'),
    path('<uuid:pk>/read/', views.mark_notification_read, name='mark_notification_read'),
    path('mark-all-read/', views.mark_all_notifications_read, name='mark_all_notifications_read'),
    path('unread-count/', views.unread_count, name='unread_count'),
    
    # FCM Token Management
    path('fcm/register/', views.register_fcm_token, name='register_fcm_token'),
    path('fcm/unregister/', views.unregister_fcm_token, name='unregister_fcm_token'),
    path('fcm/tokens/', views.list_fcm_tokens, name='list_fcm_tokens'),
]
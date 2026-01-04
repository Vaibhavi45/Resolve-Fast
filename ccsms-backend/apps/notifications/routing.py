from django.urls import re_path
from . import consumers
from apps.users.routing import websocket_urlpatterns as user_websocket_urlpatterns

websocket_urlpatterns = [
    re_path(r'ws/notifications/(?P<user_id>[^/]+)/$', consumers.NotificationConsumer.as_asgi()),
] + user_websocket_urlpatterns
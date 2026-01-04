from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/complaints/<str:complaint_id>/', consumers.ComplaintChatConsumer.as_asgi()),
]

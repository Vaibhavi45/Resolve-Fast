from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

from apps.complaints.models import Comment, Complaint

User = get_user_model()


class ComplaintChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.complaint_id = self.scope['url_route']['kwargs'].get('complaint_id')
        self.group_name = f'complaint_{self.complaint_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        # Expecting content to have at least: { 'content': 'text' }
        user = self.scope.get('user')
        text = content.get('content')
        internal = content.get('is_internal', False)

        saved = None
        if text and self.complaint_id and user and user.is_authenticated:
            # persist comment to DB
            saved = await database_sync_to_async(self._create_comment)(user.id, self.complaint_id, text, internal)

        payload = {
            'user': { 'id': user.id if user and hasattr(user, 'id') else None, 'email': getattr(user, 'email', None) },
            'content': text,
            'is_internal': internal,
            'created_at': saved.created_at.isoformat() if saved else None,
            'id': str(saved.id) if saved else None,
        }

        # Broadcast chat message to the complaint group
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'chat.message',
                'message': payload,
            }
        )

    async def chat_message(self, event):
        await self.send_json(event['message'])

    def _create_comment(self, user_id, complaint_id, content, is_internal):
        # synchronous DB operation
        user = User.objects.get(id=user_id)
        complaint = Complaint.objects.get(id=complaint_id)
        comment = Comment.objects.create(complaint=complaint, user=user, content=content, is_internal=is_internal)
        return comment

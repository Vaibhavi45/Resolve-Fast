import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()

class AgentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        if self.user.is_anonymous or self.user.role != 'AGENT':
            await self.close()
            return
        
        self.group_name = f"agent_{self.user.id}"
        
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Update agent status to available when connected
        await self.update_agent_status('AVAILABLE')
    
    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
        
        # Update agent status to offline when disconnected
        if hasattr(self, 'user') and not self.user.is_anonymous:
            await self.update_agent_status('OFFLINE')
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'status_update':
            new_status = data.get('status')
            if new_status in ['AVAILABLE', 'BUSY']:
                await self.update_agent_status(new_status)
    
    async def assignment_request(self, event):
        """Handle assignment request from admin"""
        await self.send(text_data=json.dumps({
            'type': 'assignment_request',
            'data': event['data']
        }))
    
    @database_sync_to_async
    def update_agent_status(self, status):
        if hasattr(self, 'user') and not self.user.is_anonymous:
            self.user.agent_status = status
            self.user.save(update_fields=['agent_status', 'last_activity'])

class AdminConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        if self.user.is_anonymous or self.user.role != 'ADMIN':
            await self.close()
            return
        
        self.group_name = f"admin_{self.user.id}"
        
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
    
    async def assignment_response(self, event):
        """Handle assignment response from agent"""
        await self.send(text_data=json.dumps({
            'type': 'assignment_response',
            'data': event['data']
        }))
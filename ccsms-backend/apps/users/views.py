from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from .models import User
from .serializers import UserSerializer, UserProfileSerializer, AgentListSerializer
from utils.permissions import IsAdmin

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Return full user data with updated avatar URL
        return Response(serializer.data)

class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']

class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

@api_view(['PUT'])
@permission_classes([IsAdmin])
def toggle_user_active(request, pk):
    try:
        user = User.objects.get(pk=pk)
        user.is_active = not user.is_active
        user.save()
        return Response({
            'message': f'User {"activated" if user.is_active else "deactivated"} successfully',
            'is_active': user.is_active
        })
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

class AgentListView(generics.ListAPIView):
    queryset = User.objects.filter(role='AGENT')
    serializer_class = AgentListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Show all active agents (registered agents)
        return User.objects.filter(
            role='AGENT', 
            is_active=True
        ).order_by('first_name', 'last_name')

@api_view(['POST'])
@permission_classes([IsAdmin])
def verify_agent(request, pk):
    """Verify an agent by admin"""
    try:
        agent = User.objects.get(pk=pk, role='AGENT')
        agent.is_verified = True
        agent.save()
        return Response({
            'message': 'Agent verified successfully',
            'is_verified': agent.is_verified
        })
    except User.DoesNotExist:
        return Response({'error': 'Agent not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_agent_status(request):
    """Allow agents to toggle their availability status"""
    if request.user.role != 'AGENT':
        return Response({'error': 'Only agents can toggle status'}, status=status.HTTP_403_FORBIDDEN)
    
    new_status = request.data.get('status')
    if new_status not in ['AVAILABLE', 'BUSY', 'OFFLINE']:
        return Response({'error': 'Invalid status. Must be AVAILABLE, BUSY, or OFFLINE'}, status=status.HTTP_400_BAD_REQUEST)
    
    request.user.agent_status = new_status
    request.user.save()
    
    return Response({
        'message': f'Status updated to {new_status}',
        'status': new_status
    })
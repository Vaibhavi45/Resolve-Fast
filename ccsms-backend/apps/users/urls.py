from django.urls import path, include
from . import views

urlpatterns = [
    path('me/', views.UserProfileView.as_view(), name='user_profile'),
    path('', views.UserListView.as_view(), name='user_list'),
    path('<uuid:pk>/', views.UserDetailView.as_view(), name='user_detail'),
    path('<uuid:pk>/toggle-active/', views.toggle_user_active, name='toggle_user_active'),
    path('<uuid:pk>/verify-agent/', views.verify_agent, name='verify_agent'),
    path('agents/', views.AgentListView.as_view(), name='agent_list'),
    path('agent-status/toggle/', views.toggle_agent_status, name='toggle_agent_status'),
    path('agent-management/', include('apps.users.urls_agent')),
]
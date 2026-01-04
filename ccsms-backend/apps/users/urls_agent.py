from django.urls import path
from . import views_agent

urlpatterns = [
    path('agent/<uuid:agent_id>/', views_agent.agent_detail, name='agent-detail'),
    path('assign-complaint/', views_agent.assign_complaint_to_agent, name='assign-complaint'),
    path('respond-assignment/', views_agent.respond_to_assignment, name='respond-assignment'),
    path('pending-requests/', views_agent.agent_pending_requests, name='pending-requests'),
]
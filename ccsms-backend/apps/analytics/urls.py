from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard_stats, name='dashboard_stats'),
    path('complaints-by-category/', views.complaints_by_category, name='complaints_by_category'),
    path('complaints-by-status/', views.complaints_by_status, name='complaints_by_status'),
    path('complaints-by-priority/', views.complaints_by_priority, name='complaints_by_priority'),
    path('agent-performance/', views.agent_performance, name='agent_performance'),
    path('sla-report/', views.sla_report, name='sla_report'),
    path('feedback-analysis/', views.feedback_analysis, name='feedback_analysis'),
    path('export/', views.export_report, name='export_report'),
    path('trend-detection/', views.trend_detection, name='trend_detection'),
    path('schedule-report/', views.schedule_report, name='schedule_report'),
    path('complaints-volume/', views.complaints_volume_chart, name='complaints_volume_chart'),
]
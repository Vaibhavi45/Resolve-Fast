from django.urls import path
from . import views

urlpatterns = [
    path('', views.AuditLogListView.as_view(), name='audit_log_list'),
    path('complaint/<uuid:complaint_id>/', views.ComplaintAuditLogView.as_view(), name='complaint_audit_logs'),
    path('export/user-data/', views.export_user_data, name='export_user_data'),
    path('export/access-logs/', views.export_access_logs, name='export_access_logs'),
    path('export/retention-report/', views.export_retention_report, name='export_retention_report'),
    path('export/gdpr-report/', views.export_gdpr_report, name='export_gdpr_report'),
]
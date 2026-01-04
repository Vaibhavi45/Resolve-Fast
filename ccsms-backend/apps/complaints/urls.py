from django.urls import path
from . import views
from . import invoice_views

urlpatterns = [
    path('', views.ComplaintListCreateView.as_view(), name='complaint_list_create'),
    path('<uuid:pk>/', views.ComplaintDetailView.as_view(), name='complaint_detail'),
    path('<uuid:pk>/assign/', views.assign_complaint, name='assign_complaint'),
    path('<uuid:pk>/request-assignment/', views.request_assignment, name='request_assignment'),
    path('<uuid:pk>/request-agent-assignment/', views.request_agent_assignment, name='request_agent_assignment'),
    path('<uuid:pk>/resolve/', views.resolve_complaint, name='resolve_complaint'),
    path('<uuid:pk>/close/', views.close_complaint, name='close_complaint'),
    path('<uuid:pk>/reopen/', views.reopen_complaint, name='reopen_complaint'),
    path('<uuid:pk>/comments/', views.add_comment, name='add_comment'),
    path('<uuid:pk>/comments/list/', views.get_comments, name='get_comments'),
    path('<uuid:pk>/feedback/', views.add_feedback, name='add_feedback'),
    path('assignment-requests/', views.list_assignment_requests, name='list_assignment_requests'),
    path('assignment-requests/<uuid:pk>/review/', views.review_assignment_request, name='review_assignment_request'),
    path('assignment-requests/<uuid:pk>/respond/', views.review_assignment_request, name='respond_assignment_request'),
    path('templates/', views.list_complaint_templates, name='list_complaint_templates'),
    path('templates/<uuid:pk>/', views.get_complaint_template, name='get_complaint_template'),
    path('from-template/', views.create_from_template, name='create_from_template'),
    path('invoices/', invoice_views.list_invoices, name='list_invoices'),
    path('<uuid:pk>/invoice/', invoice_views.download_invoice, name='download_invoice'),
    path('<uuid:pk>/invoice/token/', invoice_views.generate_invoice_token, name='generate_invoice_token'),
    path('invoice/<str:token>/', invoice_views.get_invoice_by_token, name='get_invoice_by_token'),
]
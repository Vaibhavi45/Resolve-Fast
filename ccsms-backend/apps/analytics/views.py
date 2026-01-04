from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Avg, Q
from django.utils import timezone
from django.http import HttpResponse
from datetime import timedelta
import csv
from apps.complaints.models import Complaint, Feedback
from apps.users.models import User
from utils.permissions import IsAdmin

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    user = request.user
    
    if user.role == 'CUSTOMER':
        complaints = Complaint.objects.filter(customer=user)
        stats = {
            'total_complaints': complaints.count(),
            'open': complaints.filter(status='OPEN').count(),
            'in_progress': complaints.filter(status='IN_PROGRESS').count(),
            'resolved': complaints.filter(status='RESOLVED').count(),
            'avg_resolution_time': 0  # Calculate based on resolved complaints
        }
    
    elif user.role == 'AGENT':
        assigned_complaints = Complaint.objects.filter(assigned_to=user)
        today = timezone.now().date()
        
        stats = {
            'assigned_cases': assigned_complaints.count(),
            'pending': assigned_complaints.filter(status__in=['OPEN', 'IN_PROGRESS']).count(),
            'resolved_today': assigned_complaints.filter(
                status='RESOLVED', 
                resolved_at__date=today
            ).count(),
            'avg_resolution_time': 0,
            'sla_compliance_rate': 0
        }
    
    else:  # ADMIN
        all_complaints = Complaint.objects.all()
        stats = {
            'total_complaints': all_complaints.count(),
            'open': all_complaints.filter(status='OPEN').count(),
            'sla_breaches': all_complaints.filter(sla_breached=True).count(),
            'avg_resolution_time': 0,
            'resolution_rate': 0,
            'customer_satisfaction': 0
        }
    
    return Response(stats)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def complaints_by_category(request):
    date_range = request.GET.get('date_range', '30')  # days
    start_date = timezone.now() - timedelta(days=int(date_range))
    
    data = Complaint.objects.filter(created_at__gte=start_date).values('category').annotate(
        count=Count('id')
    ).order_by('-count')
    
    return Response(list(data))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def complaints_by_status(request):
    date_range = request.GET.get('date_range', '30')
    start_date = timezone.now() - timedelta(days=int(date_range))
    
    data = Complaint.objects.filter(created_at__gte=start_date).values('status').annotate(
        count=Count('id')
    ).order_by('-count')
    
    return Response(list(data))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def complaints_by_priority(request):
    date_range = request.GET.get('date_range', '30')
    start_date = timezone.now() - timedelta(days=int(date_range))
    
    data = Complaint.objects.filter(created_at__gte=start_date).values('priority').annotate(
        count=Count('id')
    ).order_by('-count')
    
    return Response(list(data))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agent_performance(request):
    if request.user.role not in ['ADMIN', 'AGENT']:
        return Response({'error': 'Permission denied'}, status=403)
    
    date_range = request.GET.get('date_range', '30')
    start_date = timezone.now() - timedelta(days=int(date_range))
    
    agents = User.objects.filter(role='AGENT')
    performance_data = []
    
    for agent in agents:
        assigned_complaints = Complaint.objects.filter(
            assigned_to=agent,
            created_at__gte=start_date
        )
        resolved_complaints = assigned_complaints.filter(status='RESOLVED')
        
        # Calculate average satisfaction and agent rating
        feedbacks = Feedback.objects.filter(
            complaint__assigned_to=agent,
            created_at__gte=start_date
        )
        avg_satisfaction = feedbacks.aggregate(avg_rating=Avg('rating'))['avg_rating'] or 0
        avg_agent_rating = feedbacks.aggregate(avg_agent_rating=Avg('agent_rating'))['avg_agent_rating'] or 0
        
        performance_data.append({
            'agent_id': str(agent.id),
            'agent_name': f"{agent.first_name} {agent.last_name}",
            'agent_email': agent.email,
            'total_assigned': assigned_complaints.count(),
            'resolved_count': resolved_complaints.count(),
            'avg_resolution_time': 0,
            'sla_compliance_rate': 0,
            'customer_satisfaction_avg': round(avg_satisfaction, 2),
            'agent_rating_avg': round(avg_agent_rating, 2)
        })
    
    return Response(performance_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sla_report(request):
    date_range = request.GET.get('date_range', '30')
    start_date = timezone.now() - timedelta(days=int(date_range))
    
    complaints = Complaint.objects.filter(created_at__gte=start_date)
    total_complaints = complaints.count()
    sla_breached = complaints.filter(sla_breached=True).count()
    sla_met = total_complaints - sla_breached
    
    compliance_percentage = (sla_met / total_complaints * 100) if total_complaints > 0 else 0
    
    # Breakdown by category and priority
    category_breakdown = complaints.values('category').annotate(
        total=Count('id'),
        breached=Count('id', filter=Q(sla_breached=True))
    )
    
    priority_breakdown = complaints.values('priority').annotate(
        total=Count('id'),
        breached=Count('id', filter=Q(sla_breached=True))
    )
    
    return Response({
        'total_complaints': total_complaints,
        'sla_met': sla_met,
        'sla_breached': sla_breached,
        'compliance_percentage': round(compliance_percentage, 2),
        'category_breakdown': list(category_breakdown),
        'priority_breakdown': list(priority_breakdown)
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def feedback_analysis(request):
    user = request.user
    date_range = request.GET.get('date_range', '30')
    start_date = timezone.now() - timedelta(days=int(date_range))
    
    if user.role == 'ADMIN':
        feedbacks = Feedback.objects.filter(created_at__gte=start_date).select_related(
            'complaint', 'complaint__assigned_to', 'complaint__customer'
        )
        
        data = []
        for fb in feedbacks:
            data.append({
                'id': fb.id,
                'complaint_number': fb.complaint.complaint_number,
                'customer_name': f"{fb.complaint.customer.first_name} {fb.complaint.customer.last_name}",
                'agent_name': f"{fb.complaint.assigned_to.first_name} {fb.complaint.assigned_to.last_name}" if fb.complaint.assigned_to else "Unassigned",
                'rating': fb.rating,
                'agent_rating': fb.agent_rating,
                'comment': fb.comment,
                'created_at': fb.created_at
            })
        return Response(data)
        
    elif user.role == 'AGENT':
        feedbacks = Feedback.objects.filter(
            complaint__assigned_to=user,
            created_at__gte=start_date
        ).select_related('complaint', 'complaint__customer')
        
        data = []
        for fb in feedbacks:
            data.append({
                'id': fb.id,
                'complaint_number': fb.complaint.complaint_number,
                'customer_name': f"{fb.complaint.customer.first_name} {fb.complaint.customer.last_name}",
                'rating': fb.rating,
                'agent_rating': fb.agent_rating,
                'comment': fb.comment,
                'created_at': fb.created_at
            })
        return Response(data)
    
    return Response({'error': 'Permission denied'}, status=403)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_report(request):
    date_range = request.GET.get('date_range', '30')
    start_date = timezone.now() - timedelta(days=int(date_range))
    
    complaints = Complaint.objects.filter(created_at__gte=start_date).select_related('customer', 'assigned_to')
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="complaints-report-{timezone.now().date()}.csv"'
    
    writer = csv.writer(response)
    writer.writerow(['Complaint Number', 'Title', 'Category', 'Priority', 'Status', 'Customer', 'Assigned To', 'Location', 'Created At', 'Resolved At', 'SLA Breached'])
    
    for complaint in complaints:
        writer.writerow([
            complaint.complaint_number,
            complaint.title,
            complaint.category,
            complaint.priority,
            complaint.status,
            complaint.customer.email,
            complaint.assigned_to.email if complaint.assigned_to else 'Unassigned',
            complaint.location or 'N/A',
            complaint.created_at.strftime('%Y-%m-%d %H:%M'),
            complaint.resolved_at.strftime('%Y-%m-%d %H:%M') if complaint.resolved_at else 'N/A',
            'Yes' if complaint.sla_breached else 'No'
        ])
    
    return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def complaints_volume_chart(request):
    """Get complaints volume data for trend chart"""
    date_range = request.GET.get('date_range', '30')
    start_date = timezone.now() - timedelta(days=int(date_range))
    
    from django.db.models.functions import TruncDate
    from datetime import date, timedelta as td
    
    daily_counts = Complaint.objects.filter(
        created_at__gte=start_date
    ).annotate(
        date=TruncDate('created_at')
    ).values('date').annotate(
        count=Count('id')
    ).order_by('date')
    
    data_dict = {item['date']: item['count'] for item in daily_counts}
    chart_data = []
    
    current_date = start_date.date()
    end_date = timezone.now().date()
    
    while current_date <= end_date:
        chart_data.append({
            'date': current_date.strftime('%Y-%m-%d'),
            'count': data_dict.get(current_date, 0)
        })
        current_date += td(days=1)
    
    return Response(chart_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trend_detection(request):
    """Detect trends in recurring issues"""
    if request.user.role not in ['ADMIN', 'AGENT']:
        return Response({'error': 'Permission denied'}, status=403)
    
    date_range = request.GET.get('date_range', '90')
    start_date = timezone.now() - timedelta(days=int(date_range))
    
    complaints = Complaint.objects.filter(created_at__gte=start_date)
    
    # Category trends
    category_trends = complaints.values('category').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # Priority trends
    priority_trends = complaints.values('priority').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # Recurring issues by category
    recurring = []
    for cat in category_trends:
        cat_complaints = complaints.filter(category=cat['category'])
        if cat_complaints.count() >= 3:
            recurring.append({
                'category': cat['category'],
                'count': cat['count'],
                'resolved': cat_complaints.filter(status='RESOLVED').count(),
                'avg_resolution_days': 0
            })
    
    return Response({
        'category_trends': list(category_trends),
        'priority_trends': list(priority_trends),
        'recurring_issues': recurring
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def schedule_report(request):
    """Schedule a report to be sent at regular intervals"""
    if request.user.role != 'ADMIN':
        return Response({'error': 'Permission denied'}, status=403)
    
    report_type = request.data.get('type', 'all')
    frequency = request.data.get('frequency', 'weekly')  # daily, weekly, monthly
    email = request.data.get('email', request.user.email)
    
    # For now, we'll just return a success message
    # In production, this would create a scheduled task (Celery)
    return Response({
        'success': True,
        'message': f'Report scheduled successfully. {frequency.capitalize()} {report_type} reports will be sent to {email}',
        'type': report_type,
        'frequency': frequency,
        'email': email,
        'status': 'scheduled'
    })
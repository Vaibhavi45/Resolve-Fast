from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.http import HttpResponse
from django.template.loader import render_to_string
from apps.complaints.models import Complaint
from datetime import datetime
import io
import uuid
from django.core.cache import cache

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_invoice_token(request, pk):
    """Generate temporary token for invoice access"""
    try:
        complaint = Complaint.objects.select_related('customer', 'assigned_to').get(pk=pk)
        
        # Check permissions
        if request.user.role == 'CUSTOMER' and complaint.customer != request.user:
            return Response({'error': 'Permission denied'}, status=403)
        
        # Generate unique token
        token = str(uuid.uuid4())
        
        # Store complaint ID in cache with token as key (expires in 1 hour)
        cache.set(f'invoice_token_{token}', str(complaint.id), timeout=3600)
        
        return Response({'token': token})
        
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found'}, status=404)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_invoice_by_token(request, token):
    """Get invoice data using temporary token"""
    # Get complaint ID from cache
    complaint_id = cache.get(f'invoice_token_{token}')
    
    if not complaint_id:
        return Response({'error': 'Invalid or expired token'}, status=404)
    
    # Delete token after first use (one-time access)
    cache.delete(f'invoice_token_{token}')
    
    try:
        complaint = Complaint.objects.select_related('customer', 'assigned_to').prefetch_related('timeline').get(pk=complaint_id)
        
        # Prepare invoice data
        invoice_data = {
            'invoice_number': f'INV-{complaint.complaint_number}',
            'complaint_number': complaint.complaint_number,
            'title': complaint.title,
            'description': complaint.description,
            'category': complaint.category,
            'priority': complaint.priority,
            'status': complaint.status,
            'created_at': complaint.created_at,
            'resolved_at': complaint.resolved_at,
            'resolution_notes': complaint.resolution_notes,
            'location': complaint.location,
            'pincode': complaint.pincode,
            'customer_name': f'{complaint.customer.first_name} {complaint.customer.last_name}',
            'customer_email': complaint.customer.email,
            'customer_phone': complaint.customer.phone if hasattr(complaint.customer, 'phone') else None,
            'assigned_to': f'{complaint.assigned_to.first_name} {complaint.assigned_to.last_name}' if complaint.assigned_to else None,
            'timeline': [
                {
                    'action': event.action,
                    'description': event.description,
                    'created_at': event.created_at,
                }
                for event in complaint.timeline.all().order_by('created_at')
            ]
        }
        
        return Response(invoice_data)
        
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_invoice(request, pk):
    """Generate and download invoice for a complaint"""
    try:
        complaint = Complaint.objects.select_related('customer', 'assigned_to').get(pk=pk)
        
        # Check permissions
        if request.user.role == 'CUSTOMER' and complaint.customer != request.user:
            return Response({'error': 'Permission denied'}, status=403)
        
        # Generate invoice HTML
        invoice_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; }}
        .header {{ text-align: center; margin-bottom: 30px; }}
        .header h1 {{ color: #1da9c3; margin: 0; }}
        .info {{ margin: 20px 0; }}
        .info-row {{ display: flex; justify-content: space-between; margin: 10px 0; }}
        .label {{ font-weight: bold; }}
        .table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        .table th, .table td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
        .table th {{ background-color: #1da9c3; color: white; }}
        .footer {{ margin-top: 40px; text-align: center; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>COMPLAINT INVOICE</h1>
        <p>Customer Complaint Management System</p>
    </div>
    
    <div class="info">
        <div class="info-row">
            <span><span class="label">Invoice Number:</span> INV-{complaint.complaint_number}</span>
            <span><span class="label">Date:</span> {datetime.now().strftime('%Y-%m-%d')}</span>
        </div>
        <div class="info-row">
            <span><span class="label">Complaint ID:</span> {complaint.complaint_number}</span>
            <span><span class="label">Status:</span> {complaint.status}</span>
        </div>
    </div>
    
    <h3>Customer Information</h3>
    <div class="info">
        <div class="info-row">
            <span><span class="label">Name:</span> {complaint.customer.first_name} {complaint.customer.last_name}</span>
        </div>
        <div class="info-row">
            <span><span class="label">Email:</span> {complaint.customer.email}</span>
        </div>
    </div>
    
    <h3>Complaint Details</h3>
    <table class="table">
        <tr>
            <th>Description</th>
            <th>Category</th>
            <th>Priority</th>
            <th>Created Date</th>
        </tr>
        <tr>
            <td>{complaint.title}</td>
            <td>{complaint.category}</td>
            <td>{complaint.priority}</td>
            <td>{complaint.created_at.strftime('%Y-%m-%d %H:%M')}</td>
        </tr>
    </table>
    
    <h3>Service Information</h3>
    <table class="table">
        <tr>
            <th>Assigned Agent</th>
            <th>Resolution Status</th>
            <th>SLA Deadline</th>
        </tr>
        <tr>
            <td>{complaint.assigned_to.first_name + ' ' + complaint.assigned_to.last_name if complaint.assigned_to else 'Unassigned'}</td>
            <td>{complaint.status}</td>
            <td>{complaint.sla_deadline.strftime('%Y-%m-%d %H:%M') if complaint.sla_deadline else 'N/A'}</td>
        </tr>
    </table>
    
    {f'''
    <h3>Resolution Details</h3>
    <div class="info">
        <div class="info-row">
            <span><span class="label">Resolved At:</span> {complaint.resolved_at.strftime('%Y-%m-%d %H:%M')}</span>
        </div>
        <div class="info-row">
            <span><span class="label">Resolution Notes:</span> {complaint.resolution_notes}</span>
        </div>
    </div>
    ''' if complaint.status == 'RESOLVED' else ''}
    
    <div class="footer">
        <p>This is a computer-generated invoice and does not require a signature.</p>
        <p>For any queries, please contact support@ccsms.com</p>
    </div>
</body>
</html>
        """
        
        # Return as downloadable HTML
        response = HttpResponse(invoice_html, content_type='text/html')
        response['Content-Disposition'] = f'attachment; filename="invoice-{complaint.complaint_number}.html"'
        return response
        
    except Complaint.DoesNotExist:
        return Response({'error': 'Complaint not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_invoices(request):
    """List all invoices for the user"""
    user = request.user
    
    if user.role == 'CUSTOMER':
        complaints = Complaint.objects.filter(customer=user).order_by('-created_at')
    elif user.role == 'AGENT':
        complaints = Complaint.objects.filter(assigned_to=user).order_by('-created_at')
    else:  # ADMIN
        complaints = Complaint.objects.all().order_by('-created_at')
    
    invoices = []
    for complaint in complaints:
        invoices.append({
            'id': str(complaint.id),
            'invoice_number': f'INV-{complaint.complaint_number}',
            'complaint_number': complaint.complaint_number,
            'title': complaint.title,
            'status': complaint.status,
            'created_at': complaint.created_at,
            'customer_name': f'{complaint.customer.first_name} {complaint.customer.last_name}',
            'amount': 0,  # Can be calculated based on service charges
        })
    
    return Response(invoices)

from celery import shared_task
from django.utils import timezone
from .models import Complaint, Timeline, EscalationRule
from apps.notifications.models import Notification
from utils.email_service import send_sla_breach_alert

@shared_task
def check_sla_breaches():
    """Check for SLA breaches and mark complaints accordingly"""
    now = timezone.now()
    breached_complaints = Complaint.objects.filter(
        sla_deadline__lt=now,
        status__in=['OPEN', 'IN_PROGRESS', 'ESCALATED'],
        sla_breached=False
    )
    
    for complaint in breached_complaints:
        complaint.sla_breached = True
        complaint.save()
        
        # Create timeline entry
        Timeline.objects.create(
            complaint=complaint,
            action='SLA_BREACHED',
            description=f'SLA deadline breached at {now}',
            metadata={'sla_deadline': complaint.sla_deadline.isoformat()}
        )
        
        # Send notification
        send_sla_breach_alert(complaint)
        
        # Create notification records
        recipients = [complaint.customer]
        if complaint.assigned_to:
            recipients.append(complaint.assigned_to)
        
        for recipient in recipients:
            Notification.objects.create(
                user=recipient,
                complaint=complaint,
                notification_type='EMAIL',
                title=f'SLA Breach - {complaint.complaint_number}',
                message=f'Complaint {complaint.complaint_number} has breached its SLA deadline.'
            )
    
    return f"Processed {breached_complaints.count()} SLA breaches"

@shared_task
def auto_escalate_complaints():
    """Auto-escalate complaints based on escalation rules"""
    escalation_rules = EscalationRule.objects.filter(is_active=True)
    escalated_count = 0
    
    for rule in escalation_rules:
        escalation_time = timezone.now() - timezone.timedelta(hours=rule.escalation_time_hours)
        
        complaints_to_escalate = Complaint.objects.filter(
            category=rule.category,
            priority=rule.priority,
            created_at__lt=escalation_time,
            status__in=['OPEN', 'IN_PROGRESS']
        )
        
        for complaint in complaints_to_escalate:
            complaint.status = 'ESCALATED'
            complaint.save()
            
            # Create timeline entry
            Timeline.objects.create(
                complaint=complaint,
                action='AUTO_ESCALATED',
                description=f'Auto-escalated based on rule: {rule}',
                metadata={'rule_id': rule.id}
            )
            
            escalated_count += 1
    
    return f"Auto-escalated {escalated_count} complaints"
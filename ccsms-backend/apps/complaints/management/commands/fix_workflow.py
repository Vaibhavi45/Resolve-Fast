from django.core.management.base import BaseCommand
from apps.complaints.models import Complaint, AssignmentRequest
from apps.users.models import User
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Fix workflow issues in complaint system'

    def handle(self, *args, **options):
        self.stdout.write('Fixing workflow issues...\n')
        
        # 1. Fix SLA deadlines
        self.fix_sla_deadlines()
        
        # 2. Fix status-assignment sync
        self.fix_status_sync()
        
        # 3. Fix agent workload
        self.fix_agent_workload()
        
        # 4. Cleanup stale requests
        self.cleanup_stale_requests()
        
        self.stdout.write(self.style.SUCCESS('\n✓ All fixes applied'))
    
    def fix_sla_deadlines(self):
        sla_hours = {'CRITICAL': 4, 'HIGH': 24, 'MEDIUM': 48, 'LOW': 72}
        fixed = 0
        
        for complaint in Complaint.objects.all():
            hours = sla_hours.get(complaint.priority, 72)
            correct = complaint.created_at + timedelta(hours=hours)
            
            if complaint.sla_deadline != correct:
                complaint.sla_deadline = correct
                complaint.save(update_fields=['sla_deadline'])
                fixed += 1
        
        self.stdout.write(f'Fixed {fixed} SLA deadlines')
    
    def fix_status_sync(self):
        # OPEN with assignment
        count = Complaint.objects.filter(status='OPEN', assigned_to__isnull=False).update(status='IN_PROGRESS')
        self.stdout.write(f'Fixed {count} OPEN complaints with agents')
        
        # IN_PROGRESS without assignment
        count = Complaint.objects.filter(status='IN_PROGRESS', assigned_to__isnull=True).update(status='OPEN')
        self.stdout.write(f'Fixed {count} IN_PROGRESS without agents')
    
    def fix_agent_workload(self):
        fixed = 0
        for agent in User.objects.filter(role='AGENT'):
            active = Complaint.objects.filter(assigned_to=agent, status__in=['OPEN', 'IN_PROGRESS', 'REOPENED']).count()
            resolved = Complaint.objects.filter(assigned_to=agent, status='RESOLVED').count()
            
            if agent.current_active_cases != active or agent.total_resolved_cases != resolved:
                agent.current_active_cases = active
                agent.total_resolved_cases = resolved
                agent.save(update_fields=['current_active_cases', 'total_resolved_cases'])
                fixed += 1
        
        self.stdout.write(f'Fixed {fixed} agent workload records')
    
    def cleanup_stale_requests(self):
        count = AssignmentRequest.objects.filter(status='PENDING', complaint__assigned_to__isnull=False).update(status='REJECTED')
        self.stdout.write(f'Cleaned {count} stale requests')

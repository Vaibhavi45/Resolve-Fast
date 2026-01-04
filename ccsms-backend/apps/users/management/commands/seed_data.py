from django.core.management.base import BaseCommand
from apps.complaints.models import EscalationRule

class Command(BaseCommand):
    help = 'Setup essential system data (escalation rules only)'
    
    def handle(self, *args, **options):
        self.stdout.write('Setting up essential system data...')
        
        # Create escalation rules only
        categories = ['TECHNICAL', 'BILLING', 'PRODUCT_QUALITY', 'DELIVERY', 'SERVICE', 'OTHER']
        priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        
        for category in categories:
            for priority in priorities:
                escalation_hours = {'LOW': 72, 'MEDIUM': 48, 'HIGH': 24, 'CRITICAL': 4}
                EscalationRule.objects.get_or_create(
                    category=category,
                    priority=priority,
                    defaults={
                        'escalation_time_hours': escalation_hours[priority],
                        'escalate_to_role': 'ADMIN',
                        'is_active': True
                    }
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                'System setup complete!\n'
                'Users can now register with real credentials.\n'
                'Escalation rules configured.'
            )
        )
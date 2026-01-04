from datetime import datetime, timedelta
from django.utils import timezone

def calculate_sla_deadline(priority, category):
    """
    Calculate SLA deadline based on priority and category
    Returns: datetime object
    
    SLA Matrix:
    CRITICAL: 4 hours
    HIGH: 24 hours
    MEDIUM: 48 hours
    LOW: 72 hours
    """
    sla_hours = {
        'CRITICAL': 4,
        'HIGH': 24,
        'MEDIUM': 48,
        'LOW': 72,
    }
    
    hours = sla_hours.get(priority, 72)  # Default to 72 hours
    return timezone.now() + timedelta(hours=hours)
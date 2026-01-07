import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ccsms.settings')
django.setup()

from apps.users.models import User

agents = User.objects.filter(role='AGENT')
print(f"Total Agents: {agents.count()}")
print(f"Verified Agents: {agents.filter(is_verified=True).count()}")
print(f"Active Agents: {agents.filter(is_active=True).count()}")
print(f"Verified & Active: {agents.filter(is_verified=True, is_active=True).count()}")

for agent in agents:
    print(f"Agent: {agent.email}, Verified: {agent.is_verified}, Active: {agent.is_active}, Service Type: {agent.service_type}")

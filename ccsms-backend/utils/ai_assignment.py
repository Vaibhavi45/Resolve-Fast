from apps.users.models import User
from apps.complaints.models import Complaint
from django.db.models import Count, Avg, Q
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class AIAssignmentEngine:
    """Simple AI-based assignment engine with rule-based logic and confidence scoring"""
    
    def __init__(self):
        self.workload_threshold = 5  # Max active complaints per agent
        
    def get_agent_recommendations(self, complaint):
        """Get AI recommendations for agent assignment"""
        try:
            recommendations = []
            
            # Get all active agents
            agents = User.objects.filter(
                role='AGENT',
                is_active=True
            )
            
            for agent in agents:
                score = self.calculate_assignment_score(complaint, agent)
                if score > 0.3:  # Minimum confidence threshold
                    recommendations.append({
                        'agent': agent,
                        'confidence_score': score,
                        'reasoning': self.get_assignment_reasoning(complaint, agent, score)
                    })
            
            # Sort by confidence score
            recommendations.sort(key=lambda x: x['confidence_score'], reverse=True)
            return recommendations[:3]  # Top 3 recommendations
            
        except Exception as e:
            logger.error(f"AI Assignment error: {e}")
            return []
    
    def calculate_assignment_score(self, complaint, agent):
        """Calculate confidence score for agent assignment (0-1)"""
        score = 0.0
        
        # 1. Category/Expertise Match (40% weight)
        category_score = self.get_category_match_score(complaint, agent)
        score += category_score * 0.4
        
        # 2. Workload Factor (30% weight)
        workload_score = self.get_workload_score(agent)
        score += workload_score * 0.3
        
        # 3. Location Proximity (20% weight)
        location_score = self.get_location_score(complaint, agent)
        score += location_score * 0.2
        
        # 4. Historical Performance (10% weight)
        performance_score = self.get_performance_score(agent, complaint.category)
        score += performance_score * 0.1
        
        return min(score, 1.0)  # Cap at 1.0
    
    def get_category_match_score(self, complaint, agent):
        """Score based on category/expertise match"""
        if not hasattr(agent, 'service_type') or not agent.service_type:
            return 0.5  # General agent gets neutral score
            
        # Direct category mapping
        category_mapping = {
            'ELECTRONICS': ['Electronics', 'Technical', 'IT'],
            'APPLIANCES': ['Appliances', 'Home', 'Repair'],
            'PLUMBING': ['Plumbing', 'Water', 'Maintenance'],
            'ELECTRICAL': ['Electrical', 'Power', 'Wiring'],
            'BILLING': ['Billing', 'Finance', 'Account'],
            'TECHNICAL': ['Technical', 'IT', 'Software'],
            'OTHER': ['General', 'Support']
        }
        
        complaint_categories = category_mapping.get(complaint.category, ['General'])
        if agent.service_type in complaint_categories:
            return 1.0  # Perfect match
        elif any(cat.lower() in agent.service_type.lower() for cat in complaint_categories):
            return 0.7  # Partial match
        else:
            return 0.4  # No match but still possible
    
    def get_workload_score(self, agent):
        """Score based on current workload"""
        active_complaints = Complaint.objects.filter(
            assigned_to=agent,
            status__in=['OPEN', 'IN_PROGRESS']
        ).count()
        
        if active_complaints >= self.workload_threshold:
            return 0.1  # Overloaded
        elif active_complaints == 0:
            return 1.0  # Available
        else:
            return 1.0 - (active_complaints / self.workload_threshold)
    
    def get_location_score(self, complaint, agent):
        """Score based on location proximity"""
        if not hasattr(complaint, 'pincode') or not hasattr(agent, 'pincode'):
            return 0.5  # Neutral if no location data
            
        if not complaint.pincode or not agent.pincode:
            return 0.5  # Neutral if no location data
            
        if complaint.pincode == agent.pincode:
            return 1.0  # Same pincode
        elif len(complaint.pincode) >= 3 and len(agent.pincode) >= 3 and complaint.pincode[:3] == agent.pincode[:3]:
            return 0.7  # Same area (first 3 digits)
        else:
            return 0.4  # Different area but still workable
    
    def get_performance_score(self, agent, category):
        """Score based on historical performance"""
        try:
            # Get agent's performance in this category
            resolved_complaints = Complaint.objects.filter(
                assigned_to=agent,
                category=category,
                status='RESOLVED',
                resolved_at__gte=datetime.now() - timedelta(days=90)
            )
            
            if not resolved_complaints.exists():
                return 0.5  # Neutral if no history
                
            # Calculate average resolution time
            avg_resolution_time = resolved_complaints.aggregate(
                avg_time=Avg('resolved_at') - Avg('created_at')
            )
            
            # Simple scoring based on resolution count (more = better)
            resolution_count = resolved_complaints.count()
            if resolution_count >= 10:
                return 1.0
            elif resolution_count >= 5:
                return 0.8
            elif resolution_count >= 1:
                return 0.6
            else:
                return 0.4
                
        except Exception:
            return 0.5
    
    def get_assignment_reasoning(self, complaint, agent, score):
        """Generate human-readable reasoning for assignment"""
        reasons = []
        
        # Category match
        category_score = self.get_category_match_score(complaint, agent)
        if category_score >= 0.7:
            reasons.append(f"Expertise match: {agent.service_type}")
        
        # Workload
        workload_score = self.get_workload_score(agent)
        if workload_score >= 0.8:
            reasons.append("Low workload")
        elif workload_score < 0.3:
            reasons.append("High workload")
        
        # Location
        location_score = self.get_location_score(complaint, agent)
        if location_score >= 0.7:
            reasons.append("Local agent")
        
        # Performance
        performance_score = self.get_performance_score(agent, complaint.category)
        if performance_score >= 0.8:
            reasons.append("Strong track record")
        
        return " • ".join(reasons) if reasons else "General assignment"
    
    def auto_assign_best_agent(self, complaint):
        """Automatically assign to the best agent if confidence is high enough"""
        try:
            recommendations = self.get_agent_recommendations(complaint)
            
            if recommendations and recommendations[0]['confidence_score'] >= 0.6:  # Lower threshold for better assignment
                best_agent = recommendations[0]['agent']
                complaint.assigned_to = best_agent
                complaint.status = 'IN_PROGRESS'
                complaint.save()
                
                return {
                    'assigned': True,
                    'agent': best_agent,
                    'confidence': recommendations[0]['confidence_score'],
                    'reasoning': recommendations[0]['reasoning']
                }
            
            return {'assigned': False, 'recommendations': recommendations}
        except Exception as e:
            logger.error(f"Auto assignment failed: {e}")
            return {'assigned': False, 'recommendations': []}
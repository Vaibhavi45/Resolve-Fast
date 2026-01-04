from django.contrib import admin
from .models import Complaint, Attachment, Comment, Timeline, Feedback, EscalationRule, ComplaintTemplate, TriageRule

@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ('complaint_number', 'title', 'category', 'priority', 'status', 'customer', 'assigned_to', 'created_at')
    list_filter = ('category', 'priority', 'status', 'sla_breached', 'created_at')
    search_fields = ('complaint_number', 'title', 'customer__email')
    readonly_fields = ('complaint_number', 'created_at', 'updated_at')

@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ('original_filename', 'complaint', 'uploaded_by', 'uploaded_at')
    list_filter = ('uploaded_at',)

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('complaint', 'user', 'is_internal', 'created_at')
    list_filter = ('is_internal', 'created_at')

@admin.register(Timeline)
class TimelineAdmin(admin.ModelAdmin):
    list_display = ('complaint', 'action', 'performed_by', 'created_at')
    list_filter = ('action', 'created_at')

@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('complaint', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')

@admin.register(EscalationRule)
class EscalationRuleAdmin(admin.ModelAdmin):
    list_display = ('category', 'priority', 'escalation_time_hours', 'escalate_to_role', 'is_active')
    list_filter = ('category', 'priority', 'is_active')

@admin.register(ComplaintTemplate)
class ComplaintTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'default_priority', 'usage_count', 'is_active', 'created_at')
    list_filter = ('category', 'default_priority', 'is_active')
    search_fields = ('name', 'title_template', 'description_template')

@admin.register(TriageRule)
class TriageRuleAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'priority', 'auto_assign_to', 'priority_order', 'is_active')
    list_filter = ('category', 'priority', 'is_active')
    search_fields = ('name',)
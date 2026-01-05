from django.contrib import admin
from .models import Notification, NotificationPreference
from .fcm_models import FCMToken

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'notification_type', 'is_read', 'sent_at')
    list_filter = ('notification_type', 'is_read', 'sent_at')
    search_fields = ('title', 'user__email')
    readonly_fields = ('sent_at',)

@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'inapp_all_notifications', 'daily_digest', 'weekly_digest']
    search_fields = ['user__email']

@admin.register(FCMToken)
class FCMTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'device_type', 'device_name', 'is_active', 'created_at', 'last_used']
    list_filter = ['device_type', 'is_active', 'created_at']
    search_fields = ['user__email', 'token', 'device_name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'last_used']
    date_hierarchy = 'created_at'
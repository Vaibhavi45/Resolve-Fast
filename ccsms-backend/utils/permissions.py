from rest_framework import permissions

class IsCustomer(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'CUSTOMER'

class IsAgent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'AGENT'

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'

class IsComplaintOwnerOrAgent(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        if request.user.role == 'AGENT':
            return True
        if request.user.role == 'CUSTOMER':
            return obj.customer == request.user
        return False

class IsComplaintOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.customer == request.user or request.user.role in ['ADMIN', 'AGENT']
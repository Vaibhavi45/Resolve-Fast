from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
# Temporarily disabled - causing hang on startup
# from drf_yasg.views import get_schema_view
# from drf_yasg import openapi

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_health(request):
    return Response({'status': 'ok', 'message': 'API is working'})

# Temporarily disabled - drf_yasg causing hang
# schema_view = get_schema_view(
#     openapi.Info(
#         title="CCSMS API",
#         default_version='v1',
#         description="Customer Complaint System Management API",
#         contact=openapi.Contact(email="admin@ccsms.com"),
#     ),
#     public=True,
#     permission_classes=(permissions.AllowAny,),
# )

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api_health, name='api-health'),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/users/', include('apps.users.urls')),
    path('api/complaints/', include('apps.complaints.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/audit/', include('apps.audit.urls')),
    # path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
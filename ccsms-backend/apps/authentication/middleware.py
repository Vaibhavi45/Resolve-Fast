from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication


class TokenAuthMiddleware:
    """Custom middleware that takes a `token` query parameter and authenticates
    the user using DRF SimpleJWT.

    Usage: wrap your `URLRouter` with `TokenAuthMiddleware(URLRouter(...))` in
    `asgi.py` so `scope['user']` is populated for websocket connections.
    """

    def __init__(self, inner):
        self.inner = inner

    def __call__(self, scope):
        return TokenAuthMiddlewareInstance(scope, self.inner)


class TokenAuthMiddlewareInstance:
    def __init__(self, scope, inner):
        self.scope = dict(scope)
        self.inner = inner

    async def __call__(self, receive, send):
        # parse token from querystring: ws://.../path/?token=xxx
        query_string = self.scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]

        if token:
            try:
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(token)
                user = await database_sync_to_async(jwt_auth.get_user)(validated_token)
                self.scope['user'] = user
            except Exception:
                self.scope['user'] = AnonymousUser()
        else:
            self.scope['user'] = AnonymousUser()

        inner = self.inner(self.scope)
        return await inner(receive, send)

# ─── core/middleware.py ───────────────────────────────────────────────────────
#
# PortalSessionMiddleware
# =======================
# Drop-in replacement for Django's built-in SessionMiddleware.
#
# PROBLEM
# -------
# Browsers scope cookies to the DOMAIN, not the port.
# So http://localhost:8081 (patient) and http://localhost:8082 (provider)
# share the same browser cookie jar.  Both portals talk to the same Django
# backend (localhost:8000), which by default uses the cookie name "sessionid".
# When the provider admin logs in, the browser overwrites the single
# "sessionid" cookie, and the patient session is immediately invalidated
# (and vice-versa).
#
# FIX
# ---
# Use a different session-cookie name per portal:
#   Provider portal (port 8082)  →  "provider_sessionid"
#   Patient  portal (port 8081)  →  "sessionid"   (unchanged, backward-compat)
#
# The portal is identified from the HTTP Origin header (always present on
# CORS requests).  The fix is fully thread-safe: we never mutate global
# Django settings; the cookie name is stored on the request object and read
# back in process_response.
#
# USAGE
# -----
# In config/settings.py replace:
#   "django.contrib.sessions.middleware.SessionMiddleware"
# with:
#   "core.middleware.PortalSessionMiddleware"
#
# To add more portals extend PROVIDER_ORIGINS below.
# ─────────────────────────────────────────────────────────────────────────────

import time

from django.conf import settings
from django.contrib.sessions.backends.base import UpdateError
from django.contrib.sessions.middleware import SessionMiddleware
from django.core.exceptions import SuspiciousOperation
from django.utils.cache import patch_vary_headers
from django.utils.http import http_date


# ── Portal identification ─────────────────────────────────────────────────────

# Origins (scheme + host + port) that belong to the provider portal.
# Add production URLs here when you deploy.
_PROVIDER_ORIGINS = frozenset([
    'http://localhost:8082',
    'http://127.0.0.1:8082',
    # 'https://provider.gonep.co.ke',  # uncomment when live
])

# Cookie names — provider gets its own name; patient keeps the Django default.
PROVIDER_SESSION_COOKIE = 'provider_sessionid'
PATIENT_SESSION_COOKIE  = getattr(settings, 'SESSION_COOKIE_NAME', 'sessionid')


def _portal_cookie_name(request) -> str:
    """
    Return the session-cookie name appropriate for this request's origin.

    Checks HTTP_ORIGIN first (always set on CORS requests from a browser).
    Falls back to HTTP_REFERER for same-origin or non-browser clients.
    """
    origin = (
        request.META.get('HTTP_ORIGIN')
        or request.META.get('HTTP_REFERER', '').split('?')[0].rstrip('/')
    )
    if any(origin.startswith(o) for o in _PROVIDER_ORIGINS):
        return PROVIDER_SESSION_COOKIE
    return PATIENT_SESSION_COOKIE


# ── Middleware ────────────────────────────────────────────────────────────────

class PortalSessionMiddleware(SessionMiddleware):
    """
    Portal-aware session middleware.

    Extends Django's SessionMiddleware to pick the right session-cookie name
    based on which portal the request originates from.  All other behaviour
    (session loading, saving, cookie attributes) is identical to the built-in
    middleware.
    """

    # ── Request phase ─────────────────────────────────────────────────────────

    def process_request(self, request):
        cookie_name = _portal_cookie_name(request)
        # Store the name on the request so process_response reuses it.
        # This avoids any shared-state mutation and is fully thread-safe.
        request._portal_session_cookie = cookie_name
        session_key = request.COOKIES.get(cookie_name)
        request.session = self.SessionStore(session_key)

    # ── Response phase ────────────────────────────────────────────────────────

    def process_response(self, request, response):
        """
        Mirrors Django's own process_response but substitutes the
        portal-specific cookie name for settings.SESSION_COOKIE_NAME.
        """
        cookie_name = getattr(
            request,
            '_portal_session_cookie',
            PATIENT_SESSION_COOKIE,
        )

        try:
            accessed = request.session.accessed
            modified = request.session.modified
            empty    = request.session.is_empty()
        except AttributeError:
            return response

        # ── Delete the cookie when the session becomes empty ──────────────────
        if cookie_name in request.COOKIES and empty:
            response.delete_cookie(
                cookie_name,
                path=settings.SESSION_COOKIE_PATH,
                domain=settings.SESSION_COOKIE_DOMAIN,
                samesite=settings.SESSION_COOKIE_SAMESITE,
            )
            patch_vary_headers(response, ('Cookie',))
        else:
            if accessed:
                patch_vary_headers(response, ('Cookie',))

            if (modified or settings.SESSION_SAVE_EVERY_REQUEST) and not empty:
                if request.session.get_expire_at_browser_close():
                    max_age = None
                    expires = None
                else:
                    max_age = request.session.get_expiry_age()
                    expires = http_date(time.time() + max_age)

                # Never persist a session on a 500 — avoids stale partial writes.
                if response.status_code != 500:
                    try:
                        request.session.save()
                    except UpdateError:
                        raise SuspiciousOperation(
                            'The request\'s session was deleted before the '
                            'request completed. The user may have logged out '
                            'in a concurrent request, for example.'
                        )
                    response.set_cookie(
                        cookie_name,
                        request.session.session_key,
                        max_age=max_age,
                        expires=expires,
                        domain=settings.SESSION_COOKIE_DOMAIN,
                        path=settings.SESSION_COOKIE_PATH,
                        secure=settings.SESSION_COOKIE_SECURE,
                        httponly=settings.SESSION_COOKIE_HTTPONLY,
                        samesite=settings.SESSION_COOKIE_SAMESITE,
                    )

        return response

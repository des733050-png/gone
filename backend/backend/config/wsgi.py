"""
WSGI config for Gonep backend.

All environment variables are set here so PythonAnywhere picks them up
without needing a separate .env file or manual dashboard configuration.

Deployed at: https://vsifdd.pythonanywhere.com
"""

import os
import sys

from django.core.wsgi import get_wsgi_application

# ── Path (only needed when running under PythonAnywhere's WSGI runner) ────────
# Uncomment if manage.py is not already on sys.path:
# path = '/home/vsifdd/gonep-pharma/backend'
# if path not in sys.path:
#     sys.path.insert(0, path)

# ── Django ────────────────────────────────────────────────────────────────────
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'

# Generate a real secret key:  python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
os.environ.setdefault('DJANGO_SECRET_KEY', 'django-insecure-x3__fb505knw7r+uj_mr1^1n!m#1)=*v0zbkgpwj7c2@ye#2n=')

os.environ.setdefault('DJANGO_DEBUG', 'False')

# ── Allowed hosts ─────────────────────────────────────────────────────────────
os.environ.setdefault(
    'DJANGO_ALLOWED_HOSTS',
    'vsifdd.pythonanywhere.com,127.0.0.1,localhost',
)

# ── CSRF trusted origins ──────────────────────────────────────────────────────
# Every origin that sends POST / PATCH / DELETE requests to this backend.
os.environ.setdefault(
    'DJANGO_CSRF_TRUSTED_ORIGINS',
    (
        'https://vsifdd.pythonanywhere.com,'
        'https://gone-gules.vercel.app,'
        'https://patient-rosy.vercel.app,'
        'http://127.0.0.1:8081,http://localhost:8081,'
        'http://127.0.0.1:8082,http://localhost:8082,'
        'http://127.0.0.1:8083,http://localhost:8083'
    ),
)

# ── CORS allowed origins ──────────────────────────────────────────────────────
# Exact scheme + host the browser sends requests FROM.
# No trailing slash. No wildcards. Must match the Vercel deployment URLs exactly.
os.environ.setdefault(
    'DJANGO_CORS_ALLOWED_ORIGINS',
    (
        'https://gone-gules.vercel.app,'
        'https://patient-rosy.vercel.app,'
        'http://127.0.0.1:8081,http://localhost:8081,'
        'http://127.0.0.1:8082,http://localhost:8082,'
        'http://127.0.0.1:8083,http://localhost:8083'
    ),
)

# ── Email / SMTP ──────────────────────────────────────────────────────────────
# Gmail: enable 2-Step Verification then create an App Password at
# https://myaccount.google.com/apppasswords
# SendGrid: EMAIL_HOST=smtp.sendgrid.net, USER=apikey, PASSWORD=<api-key>
os.environ.setdefault('EMAIL_BACKEND',       'django.core.mail.backends.smtp.EmailBackend')
os.environ.setdefault('EMAIL_HOST',          'smtp-relay.brevo.com')
os.environ.setdefault('EMAIL_PORT',          '587')
os.environ.setdefault('EMAIL_USE_TLS',       'True')
os.environ.setdefault('EMAIL_USE_SSL',       'False')
os.environ.setdefault('EMAIL_HOST_USER',     'a176bb001@smtp-brevo.com')   # your-gmail@gmail.com
os.environ.setdefault('EMAIL_HOST_PASSWORD', '')   # Gmail App Password (16 chars, no spaces)
os.environ.setdefault('DEFAULT_FROM_EMAIL',  'Gonep Healthcare <sidokyalo@gmail.com>')
# Where support-ticket alerts are delivered (can be a team inbox)
os.environ.setdefault('SUPPORT_NOTIFY_EMAIL', '')  # support@yourdomain.com

# ── Portal URLs (used inside email links) ─────────────────────────────────────
os.environ.setdefault('GONEP_PORTAL_LOGIN_URL',  'https://gone-gules.vercel.app')
os.environ.setdefault('GONEP_PATIENT_LOGIN_URL', 'https://patient-rosy.vercel.app')

# ── Third-party integrations ──────────────────────────────────────────────────
os.environ.setdefault('DAILY_API_KEY', '')   # daily.co video call API key

# ── Launch Django ─────────────────────────────────────────────────────────────
application = get_wsgi_application()

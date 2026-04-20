"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
import sys

path = "/home/vsifdd/gone/backend/backend"
if path not in sys.path:
    sys.path.append(path)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

os.environ["DJANGO_DEBUG"] = "False"
os.environ["DJANGO_ALLOWED_HOSTS"] = "vsifdd.pythonanywhere.com,.vercel.app,127.0.0.1,localhost"
os.environ["DJANGO_CSRF_TRUSTED_ORIGINS"] = "https://vsifdd.pythonanywhere.com,https://*.vercel.app"
os.environ["DJANGO_CORS_ALLOWED_ORIGINS"] = "https://patient-rosy.vercel.app,https://gone-gules.vercel.app"
os.environ["DJANGO_SECRET_KEY"] = "django-insecure-x3__fb505knw7r+uj_mr1^1n!m#1)=*v0zbkgpwj7c2@ye#2n="

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()

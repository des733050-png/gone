from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = 'core'
    verbose_name = "GONEP Operations"

    def ready(self):
        # Wire signals (e.g. notify facility admins when verification is
        # approved or rejected by a super admin).
        from . import signals  # noqa: F401

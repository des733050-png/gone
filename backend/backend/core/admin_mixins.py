import csv

from django.contrib import admin, messages
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from django.utils.html import format_html

from core.models import (
    AuditEvent,
    PayoutState,
    ProviderSubRole,
    SeverityLevel,
    WorkflowStatus,
)


class TimeStampedAdminMixin:
    readonly_fields = ("created_at", "updated_at")


class SuperuserOnlyAdminMixin:
    def has_module_permission(self, request):
        return request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


class GroupScopedAdminMixin:
    required_roles = ()
    ownership_field = None
    facility_lookup = None

    def _membership(self, request):
        if not hasattr(request, "_command_centre_membership"):
            request._command_centre_membership = (
                request.user.provider_memberships.select_related("facility")
                .filter(is_active=True)
                .first()
            )
        return request._command_centre_membership

    def _has_facility_field(self):
        try:
            self.model._meta.get_field("facility")
            return True
        except Exception:
            return False

    def _has_role_access(self, request):
        if request.user.is_superuser:
            return True
        if not request.user.is_authenticated or not request.user.is_staff:
            return False
        membership = self._membership(request)
        if membership is None or not membership.is_active:
            return False
        if self.required_roles:
            return membership.role in set(self.required_roles)
        return self._has_facility_field() or bool(self.facility_lookup) or bool(
            self.ownership_field
        )

    def _scope_queryset(self, queryset, membership, request):
        if self._has_facility_field():
            return queryset.filter(facility=membership.facility)
        if self.facility_lookup:
            lookup_value = (
                membership.facility_id
                if self.facility_lookup in {"pk", "id"}
                else membership.facility
            )
            return queryset.filter(**{self.facility_lookup: lookup_value}).distinct()
        if self.ownership_field:
            try:
                self.model._meta.get_field(self.ownership_field)
            except Exception:
                return queryset.none()
            return queryset.filter(
                Q(**{self.ownership_field: request.user})
                | Q(**{f"{self.ownership_field}__isnull": True})
            )
        return queryset.none()

    def has_module_permission(self, request):
        return self._has_role_access(request)

    def has_view_permission(self, request, obj=None):
        return self._has_role_access(request)

    def has_add_permission(self, request):
        return self._has_role_access(request)

    def has_change_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        if not self._has_role_access(request):
            return False
        if obj is None:
            return True
        membership = self._membership(request)
        if membership is None:
            return False
        scoped = self._scope_queryset(self.model.objects.all(), membership, request)
        return scoped.filter(pk=obj.pk).exists()

    def has_delete_permission(self, request, obj=None):
        return self.has_change_permission(request, obj=obj)

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if request.user.is_superuser:
            return queryset
        if not self._has_role_access(request):
            return queryset.none()
        membership = self._membership(request)
        if membership is None:
            return queryset.none()
        return self._scope_queryset(queryset, membership, request)

    def get_readonly_fields(self, request, obj=None):
        readonly = list(super().get_readonly_fields(request, obj))
        if request.user.is_superuser:
            return tuple(readonly)
        if self._has_facility_field() and "facility" not in readonly:
            readonly.append("facility")
        return tuple(readonly)

    def save_model(self, request, obj, form, change):
        membership = self._membership(request)
        if not request.user.is_superuser and membership and self._has_facility_field():
            obj.facility = membership.facility
        super().save_model(request, obj, form, change)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        membership = self._membership(request)
        if (
            membership
            and not request.user.is_superuser
            and db_field.remote_field
            and db_field.remote_field.model
        ):
            related_model = db_field.remote_field.model
            related_queryset = kwargs.get("queryset", related_model.objects.all())
            related_field_names = {field.name for field in related_model._meta.fields}
            if db_field.name == "facility":
                kwargs["queryset"] = related_queryset.filter(pk=membership.facility_id)
            elif "facility" in related_field_names:
                kwargs["queryset"] = related_queryset.filter(facility=membership.facility)
            elif related_model._meta.model_name == "patientprofile":
                kwargs["queryset"] = related_queryset.filter(
                    facility_access__facility=membership.facility
                ).distinct()
            elif related_model._meta.model_name == "riderprofile":
                kwargs["queryset"] = related_queryset.filter(
                    facility_access__facility=membership.facility
                ).distinct()
            elif related_model._meta.model_name == "patientuserlink":
                kwargs["queryset"] = related_queryset.filter(default_facility=membership.facility)
            elif related_model._meta.model_name == "rideruserlink":
                kwargs["queryset"] = related_queryset.filter(default_facility=membership.facility)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class StatusBadgeMixin:
    @admin.display(description="Status")
    def status_badge(self, obj):
        value = getattr(obj, "status", "-")
        color_map = {
            "idle": "#64748B",
            "draft": "#0EA5E9",
            "confirmed": "#0284C7",
            "in_progress": "#D97706",
            "completed": "#059669",
            "cancelled": "#DC2626",
            "approved": "#059669",
            "paid": "#0EA5E9",
            "rejected": "#DC2626",
            "pending_approval": "#D97706",
        }
        color = color_map.get(value, "#64748B")
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:9999px;font-size:12px;">{}</span>',
            color,
            value.replace("_", " ").title(),
        )


class SafeAdminActionsMixin:
    actions = (
        "transition_to_in_progress",
        "transition_to_completed",
        "transition_to_cancelled",
        "assign_to_me",
        "export_selected",
    )

    @admin.action(description="Transition status to In Progress")
    def transition_to_in_progress(self, request, queryset):
        self._transition_status(request, queryset, WorkflowStatus.IN_PROGRESS)

    @admin.action(description="Transition status to Completed")
    def transition_to_completed(self, request, queryset):
        self._transition_status(request, queryset, WorkflowStatus.COMPLETED)

    @admin.action(description="Transition status to Cancelled")
    def transition_to_cancelled(self, request, queryset):
        self._transition_status(request, queryset, WorkflowStatus.CANCELLED)

    def _transition_status(self, request, queryset, status):
        if not hasattr(queryset.model, "status"):
            self.message_user(
                request,
                "Selected records do not expose a status field.",
                level=messages.WARNING,
            )
            return

        update_kwargs = {"status": status}
        if any(field.name == "updated_at" for field in queryset.model._meta.fields):
            update_kwargs["updated_at"] = timezone.now()
        updated = queryset.update(**update_kwargs)
        self.message_user(request, f"{updated} record(s) updated.")
        self._log_audit(
            request,
            queryset,
            action=f"transition_status:{status}",
            severity=SeverityLevel.MEDIUM,
            metadata={"updated_count": updated},
        )

    @admin.action(description="Assign selected to me")
    def assign_to_me(self, request, queryset):
        fields = {field.name for field in queryset.model._meta.fields}
        if "owner" in fields:
            update_kwargs = {"owner": request.user}
        elif "assigned_to" in fields:
            update_kwargs = {"assigned_to": request.user}
        else:
            self.message_user(
                request,
                "Selected records do not expose owner or assigned_to fields.",
                level=messages.WARNING,
            )
            return

        if "updated_at" in fields:
            update_kwargs["updated_at"] = timezone.now()
        updated = queryset.update(**update_kwargs)
        self.message_user(request, f"{updated} record(s) assigned.")
        self._log_audit(
            request,
            queryset,
            action="assign_to_me",
            severity=SeverityLevel.MEDIUM,
            metadata={"updated_count": updated},
        )

    @admin.action(description="Export selected as CSV")
    def export_selected(self, request, queryset):
        fields = [field.name for field in queryset.model._meta.fields]
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="{queryset.model._meta.model_name}_export.csv"'
        )
        writer = csv.writer(response)
        writer.writerow(fields)
        for item in queryset:
            writer.writerow([getattr(item, field) for field in fields])
        self._log_audit(
            request,
            queryset,
            action="export_selected",
            severity=SeverityLevel.LOW,
            metadata={"export_count": queryset.count()},
        )
        return response

    def _log_audit(self, request, queryset, action, severity, metadata=None):
        AuditEvent.objects.create(
            module="command_centre",
            action=action,
            severity=severity,
            actor=request.user if request.user.is_authenticated else None,
            model_label=queryset.model._meta.label,
            object_identifier=f"bulk:{queryset.count()}",
            metadata=metadata or {},
            message=f"Command centre action {action} on {queryset.model._meta.label}",
        )


class PayoutActionMixin:
    actions = ("approve_selected", "reject_selected", "mark_paid")

    @admin.action(description="Approve selected payouts")
    def approve_selected(self, request, queryset):
        updated = queryset.update(
            status=PayoutState.APPROVED,
            approved_at=timezone.now(),
            approved_by=request.user,
            updated_at=timezone.now(),
        )
        self.message_user(request, f"{updated} payout(s) approved.")
        self._log_payout_audit(
            request,
            queryset,
            action="approve_payout",
            severity=SeverityLevel.HIGH,
            metadata={"updated_count": updated},
        )

    @admin.action(description="Reject selected payouts")
    def reject_selected(self, request, queryset):
        updated = queryset.update(status=PayoutState.REJECTED, updated_at=timezone.now())
        self.message_user(request, f"{updated} payout(s) rejected.")
        self._log_payout_audit(
            request,
            queryset,
            action="reject_payout",
            severity=SeverityLevel.HIGH,
            metadata={"updated_count": updated},
        )

    @admin.action(description="Mark selected payouts as paid")
    def mark_paid(self, request, queryset):
        updated = queryset.update(status=PayoutState.PAID, updated_at=timezone.now())
        self.message_user(request, f"{updated} payout(s) marked as paid.")
        self._log_payout_audit(
            request,
            queryset,
            action="mark_payout_paid",
            severity=SeverityLevel.CRITICAL,
            metadata={"updated_count": updated},
        )

    def _log_payout_audit(self, request, queryset, action, severity, metadata=None):
        AuditEvent.objects.create(
            module="finance",
            action=action,
            severity=severity,
            actor=request.user if request.user.is_authenticated else None,
            model_label=queryset.model._meta.label,
            object_identifier=f"bulk:{queryset.count()}",
            metadata=metadata or {},
            message=f"Finance payout action {action}",
        )

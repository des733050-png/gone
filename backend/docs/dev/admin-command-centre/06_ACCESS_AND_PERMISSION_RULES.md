# Access And Permission Rules

- Doc Class: Dev Permission Spec
- Authority: Active access model for the new command centre
- Change Policy: Update if internal role policy changes
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: user direction on 2026-04-04; `backend/core/admin_mixins.py`; `backend/core/management/commands/bootstrap_control_groups.py`

## Active Groups
- `admin_user`
- `patient_user`
- `provider_user`
- `rider_user`

## Rules
- `superuser` remains the technical full override.
- `admin_user` is the internal command-centre group and should have broad visibility across operational models.
- `patient_user`, `provider_user`, and `rider_user` may be granted scoped visibility to their domain models when staff access is appropriate.
- User and group management may remain more restricted than general operations if needed for safety.
- Legacy alias names should not be used in active admin reasoning after the reset.

## Queryset Policy
- `superuser` sees full querysets.
- `admin_user` should see full querysets for operational models.
- Domain-scoped staff users can be limited by model ownership where the admin class declares an ownership field.

## Goal
Permissions should be simple enough that a future contributor can inspect admin access without having to translate an old role-alias layer from a previous migration program.

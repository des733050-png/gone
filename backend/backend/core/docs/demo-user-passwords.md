# Demo User Credentials

Last updated: 2026-03-07

Use for local/dev/UAT only.

## Shared Password

-   `Demo@12345`

## Users

-   `demo_superadmin`
-   `demo_admin_user`
-   `demo_patient_user`
-   `demo_provider_user`
-   `demo_rider_user`

## Role Mapping

-   `demo_superadmin`: Technical superuser (full platform access)
-   `demo_admin_user`: `admin_user`
-   `demo_patient_user`: `patient_user`
-   `demo_provider_user`: `provider_user`
-   `demo_rider_user`: `rider_user`

## Reset/Rotate

-   Re-apply same password to all demo users:
    -   `python manage.py seed_demo_data --password "NewPassword123!"`
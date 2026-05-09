# Provider Verification API

## Overview
Provider portal access is verification-gated at the facility level. Provider users can sign in with the existing session and CSRF flow, but provider dashboard endpoints return `VERIFICATION_REQUIRED` until the latest facility verification submission is approved in Django admin.

Patient and rider APIs are not affected by this gate.

## Authentication
The backend keeps the current session-based contract:

- `GET /api/v1/auth/csrf/` sets the CSRF cookie.
- `POST /api/v1/auth/login/` authenticates the user and returns the session payload.
- `GET /api/v1/auth/session/` returns the current session user.
- `POST /api/v1/auth/logout/` clears the session.

Provider login/session payloads include:

```json
{
  "verification_status": "PENDING",
  "access": "RESTRICTED",
  "can_upload_verification_documents": false
}
```

`access` is `FULL` only when `verification_status` is `VERIFIED`.

## Verification Lifecycle
Statuses:

- `UNVERIFIED`: no facility verification submission exists.
- `PENDING`: documents were submitted and are locked for admin review.
- `VERIFIED`: an admin approved the latest submission.
- `REJECTED`: an admin rejected the latest submission and the facility admin may upload again.

Rules:

- Only provider users with role `facility_admin` can submit documents.
- Submitted documents are immutable and locked.
- Pending submissions block re-upload.
- Rejected submissions remain as audit history.
- Approval/rejection happens in Django admin through `ProviderVerificationSubmission` actions.

## Endpoints
### Get Provider Verification Status
`GET /api/v1/provider/verification/status/`

Permissions: authenticated provider user.

Response:

```json
{
  "success": true,
  "data": {
    "verification_status": "UNVERIFIED",
    "access": "RESTRICTED",
    "can_upload_verification_documents": true,
    "reviewed_at": null,
    "rejection_reason": ""
  },
  "message": "Provider verification status retrieved."
}
```

### Submit Provider Verification Document
`POST /api/v1/provider/verification/submit/`

Permissions: authenticated provider user with `facility_admin` role.

Content type: `multipart/form-data`

Request fields:

- `document_type`: one of `LICENSE`, `REGISTRATION`, `ID`, `OTHER`
- `file`: uploaded document file

Success response:

```json
{
  "success": true,
  "data": {
    "verification_status": "PENDING",
    "access": "RESTRICTED",
    "can_upload_verification_documents": false,
    "reviewed_at": null,
    "rejection_reason": ""
  },
  "message": "Verification documents submitted for review."
}
```

Locked response:

```json
{
  "success": false,
  "error": "Verification documents cannot be uploaded right now.",
  "code": "VERIFICATION_UPLOAD_LOCKED",
  "data": {
    "verification_status": "PENDING",
    "access": "RESTRICTED",
    "can_upload_verification_documents": false
  }
}
```

### Provider Gate Error
All provider dashboard endpoints except `provider/me` and verification endpoints require approved verification.

```json
{
  "success": false,
  "error": "Verification required",
  "code": "VERIFICATION_REQUIRED",
  "data": {
    "verification_status": "PENDING",
    "access": "RESTRICTED"
  }
}
```

## Appointment CRUD
Provider appointment endpoints remain facility-scoped and verification-gated.

- `GET /api/v1/provider/appointments/`: list appointments.
- `POST /api/v1/provider/appointments/`: create an appointment. Roles: `facility_admin`, `receptionist`.
- `PATCH /api/v1/provider/appointments/{appointment_ref}/`: update an appointment. Roles: `facility_admin`, `receptionist`.
- `DELETE /api/v1/provider/appointments/{appointment_ref}/`: soft-delete by setting status to cancelled. Roles: `facility_admin`, `receptionist`.

Create/update fields:

```json
{
  "doctor_id": "staff membership id or provider code",
  "patient_id": "patient uuid or patient code",
  "scheduled_for": "2026-05-10T10:00:00Z",
  "type": "In Facility",
  "phone": "+254700000000",
  "reason": "Initial consultation",
  "notes": "Patient prefers morning slots",
  "status": "confirmed"
}
```

Alternatively, clients may send `date` and `time` instead of `scheduled_for`.

## Constants
Verification statuses:

```json
{
  "UNVERIFIED": "No documents submitted",
  "PENDING": "Documents submitted, awaiting review",
  "VERIFIED": "Approved",
  "REJECTED": "Invalid documents"
}
```

Access levels:

```json
{
  "RESTRICTED": "Limited provider portal access",
  "FULL": "Full provider dashboard access"
}
```

Provider roles:

```json
{
  "facility_admin": "Facility Admin",
  "doctor": "Doctor",
  "billing_manager": "Billing Manager",
  "lab_manager": "Lab Manager",
  "receptionist": "Receptionist",
  "pos": "POS"
}
```

Document types:

```json
{
  "LICENSE": "License",
  "REGISTRATION": "Registration",
  "ID": "ID",
  "OTHER": "Other"
}
```

Error codes:

- `VERIFICATION_REQUIRED`
- `VERIFICATION_UPLOAD_LOCKED`
- `INVALID_DOCUMENT`
- `UNAUTHORIZED`

## Frontend Integration Notes
- After login/session load, inspect `user.access` and `user.verification_status`.
- If a provider has `access !== "FULL"`, show the provider verification screen instead of dashboard modules.
- Use `GET /api/v1/provider/verification/status/` to refresh review state.
- Show upload controls only when `can_upload_verification_documents` is true.
- Submit verification documents as `multipart/form-data`.
- Continue sending CSRF headers for unsafe methods, matching the existing session auth flow.

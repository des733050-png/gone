# UUID Identity Spec

- Doc Class: Dev Identity Spec
- Authority: UUID and public identifier rules for the reset
- Change Policy: Update only if identity strategy changes
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/core/models.py`; `backend/portal_api/utils.py`

## Rules
- All concrete `core` models that inherit the shared tracked-model base must use `UUIDField(primary_key=True, default=uuid4, editable=False)`.
- Django auth/admin internals are excluded from this reset.
- Public API payloads must not expose Django `User.pk` as the business identifier.
- Human-readable business references remain separate from UUID identity.

## Human-Readable Reference Examples
- `booking_ref`
- `consultation_ref`
- `rx_number`
- `order_number`
- `ticket_number`
- `notification_code`
- `transaction_code`

## Portal UID Policy
- `portal_uid` is retired from active ownership, authorization, and public identity flow.
- Existing `portal_uid` fields should be removed from active domain models where practical in the reset.
- No new API contract may depend on `portal_uid`.

## API Rule
- `id` = UUID string
- `reference` or `code` = human-readable business ref when the UI needs readable labels

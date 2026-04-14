# GONEP Provider — POS System

## Overview
The POS (Point of Sale) role provides a dedicated terminal interface for
dispensing medications and collecting payment in-person. It bypasses the
standard provider shell entirely and renders a full-screen sales interface.

## Account lifecycle
1. **Hospital admin** creates a POS account in Staff → POS Terminals section.
   Required fields: terminal name, login email. Password is set by admin.
2. The POS user logs in — `MainShell.js` detects `user.role === 'pos'` and renders
   `POSScreen` directly (no sidebar, no nav tree).
3. Admin can reset the password, deactivate, or reactivate any terminal.
4. Multiple POS accounts can exist per facility (e.g. reception till + pharmacy counter).

## POS screen layout
```
┌─────────────────────────────────────────────────────┐
│  GONEP Pharmacy  │  Main Reception Till  │  KSh today  │ [Logout]
├─────────────────────────────────────────────────────┤
│  New Sale  │  History  │  Shift Summary              │ (tabs)
├──────────────────┬──────────────────────────────────┤
│  Product search  │  Cart                            │
│  ─────────────   │  ─────────────                   │
│  [Amlodipine]    │  Amlodipine 5mg   × 30   KSh 360 │
│  [Metformin]     │  Paracetamol      ×  10   KSh  45 │
│  [Paracetamol]   │  ─────────────────────────────   │
│                  │  Subtotal         KSh 405         │
│                  │  Discount          -10            │
│                  │  TOTAL            KSh 395         │
│                  │                                  │
│                  │  [Cash] [M-Pesa] [Card]          │
│                  │  [Complete sale & print receipt] │
└──────────────────┴──────────────────────────────────┘
```

## Stock deduction
On checkout, `savePosTransaction` is called. In mock mode this directly mutates
`_inventory` — each sold item reduces `stock` by the quantity sold, recalculates
`status` (ok/low/out), and prepends a history entry with `action: 'POS sale'`.
In production, the backend endpoint handles this atomically.

## Receipt
Generated in `ReceiptModal`. On web, `window.print()` triggers the browser print
dialog — include a `@media print` CSS rule that hides non-receipt elements.
Receipt content: facility name, receipt number, cashier, date/time, line items
(name, qty, unit price, line total), subtotal, discount, grand total, payment method.

## Logging
POS transactions are stored separately in `_posTransactions` (mock) or
`/pos-transactions/` endpoint (prod). Activity log entries are written for
terminal creation, password resets, and deactivation — visible to hospital_admin
in the Activity Logs screen.

## Security considerations
- POS passwords are set and reset only by hospital_admin — POS users have no
  self-service password reset.
- POS users cannot access any clinical, billing, staff, or analytics data.
- All POS transactions are timestamped and associated with the terminal ID.
- In production, consider token rotation on each shift start.

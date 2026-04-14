// ─── constants/inventory.js ───────────────────────────────────────────────────
// Shared across InventoryScreen and PharmacyScreen

export const CATEGORIES = [
  'Cardiovascular', 'Diabetes', 'Antibiotics',
  'Pain Relief', 'Gastro', 'Dermatology', 'Respiratory', 'Other',
];

export const UNITS = ['tabs', 'caps', 'ml', 'vials', 'sachets', 'units'];

export const ADD_REASONS    = ['New delivery', 'Stock correction', 'Transfer in', 'Opening stock'];
export const REDUCE_REASONS = ['Dispensed via Rx', 'Expired / damaged', 'Write-off', 'Stock correction', 'Transfer out'];

export const statusColor  = s => s === 'ok' ? 'success' : s === 'low' ? 'warning' : 'danger';
export const statusLabel  = s => s === 'ok' ? 'In stock' : s === 'low' ? 'Low stock' : 'Out of stock';
export const derivedStatus = (stock, reorder) =>
  stock <= 0 ? 'out' : stock <= reorder ? 'low' : 'ok';

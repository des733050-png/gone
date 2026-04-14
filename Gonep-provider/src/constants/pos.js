// ─── constants/pos.js ────────────────────────────────────────────────────────

export const PAYMENT_METHODS = [
  { id: 'cash',  label: 'Cash',   icon: 'dollar-sign' },
  { id: 'mpesa', label: 'M-Pesa', icon: 'smartphone'  },
  { id: 'card',  label: 'Card',   icon: 'credit-card' },
];

export const safeNum = v => {
  const n = Number(v);
  return isFinite(n) && !isNaN(n) ? n : 0;
};

export const fmt = n =>
  `KSh ${safeNum(n).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

export const calcLineTotal = (unitPrice, qty, discType, discValue) => {
  const price = safeNum(unitPrice);
  const q     = safeNum(qty);
  const disc  = safeNum(discValue);
  if (discType === 'percent') return price * q * (1 - Math.min(disc, 100) / 100);
  return Math.max(0, price * q - disc);
};

export const receiptNo = () =>
  `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

export const nowTs = () => {
  const d = new Date();
  return `${d.toLocaleDateString('en-KE')} ${d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`;
};

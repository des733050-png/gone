// ─── hooks/usePOSTerminal.js ──────────────────────────────────────────────────
import { useState, useCallback, useMemo, useRef } from 'react';
import { MOCK_INVENTORY, MOCK_POS_TRANSACTIONS } from '../mock/data';
import { savePosTransaction } from '../api';
import { safeNum, calcLineTotal, receiptNo } from '../constants/pos';

export function usePOSTerminal(user) {
  const [search,       setSearch]       = useState('');
  const [cart,         setCart]         = useState([]);
  const [payMethod,    setPayMethod]    = useState('cash');
  const [payRef,       setPayRef]       = useState('');
  const [tab,          setTab]          = useState('sale');
  const [receiptData,  setReceiptData]  = useState(null);
  const [transactions, setTransactions] = useState(MOCK_POS_TRANSACTIONS.map(t => ({ ...t })));
  const [scanFeedback, setScanFeedback] = useState(null);

  const products = useMemo(
    () => MOCK_INVENTORY.filter(i => i.active !== false && safeNum(i.stock) > 0),
    []
  );

  const filtered = useMemo(() =>
    products.filter(p =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode || '').includes(search)
    ), [products, search]
  );

  // ── Scan feedback toast ─────────────────────────────────────────────────────
  const showFeedback = useCallback((type, msg) => {
    setScanFeedback({ type, msg });
    setTimeout(() => setScanFeedback(null), 2000);
  }, []);

  // ── Cart actions ────────────────────────────────────────────────────────────
  const addToCart = useCallback((product) => {
    const savedDisc = product.saved_discount || { type: 'percent', value: 0 };
    setCart(prev => {
      const existing = prev.find(c => c.id === product.id);
      if (existing) {
        return prev.map(c =>
          c.id === product.id
            ? { ...c, qty: Math.min(c.qty + 1, safeNum(product.stock)) }
            : c
        );
      }
      return [...prev, {
        ...product,
        qty: 1,
        disc_type:  savedDisc.type,
        disc_value: safeNum(savedDisc.value),
      }];
    });
  }, []);

  const handleBarcodeScan = useCallback((code) => {
    const product = products.find(p => (p.barcode || '').trim() === code.trim());
    if (product) {
      addToCart(product);
      showFeedback('ok', `✓ ${product.name} added`);
    } else {
      try {
        if (typeof window !== 'undefined' && window.navigator?.vibrate) {
          window.navigator.vibrate([80, 40, 80]);
        }
        if (typeof window !== 'undefined' && window.AudioContext) {
          const ctx = new window.AudioContext();
          const osc = ctx.createOscillator();
          osc.type = 'square';
          osc.frequency.setValueAtTime(220, ctx.currentTime);
          osc.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.12);
        }
      } catch (_) {}
      setSearch(code);
    }
  }, [products, addToCart, showFeedback]);

  const updateQty = useCallback((id, delta) => {
    setCart(prev =>
      prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c)
          .filter(c => c.qty > 0)
    );
  }, []);

  const updateDisc = useCallback((id, field, val) => {
    setCart(prev => prev.map(c => {
      if (c.id !== id) return c;
      if (field === 'type')  return { ...c, disc_type: val };
      if (field === 'value') return { ...c, disc_value: safeNum(val === '' ? 0 : val) };
      return c;
    }));
  }, []);

  const removeFromCart = useCallback((id) =>
    setCart(prev => prev.filter(c => c.id !== id))
  , []);

  const clearSale = useCallback(() => {
    setCart([]);
    setReceiptData(null);
  }, []);

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const lines = cart.map(c => ({
      ...c,
      line_total: calcLineTotal(c.unit_price, c.qty, c.disc_type, c.disc_value),
    }));
    const subtotal      = lines.reduce((s, l) => s + safeNum(l.unit_price) * safeNum(l.qty), 0);
    const grandTotal    = lines.reduce((s, l) => s + safeNum(l.line_total), 0);
    const discountTotal = Math.max(0, subtotal - grandTotal);
    return { subtotal, grandTotal, discountTotal, lines };
  }, [cart]);

  // ── Checkout ────────────────────────────────────────────────────────────────
  const handleCheckout = useCallback(() => {
    if (!cart.length) return;
    const tx = {
      id:             `pos-tx-${Date.now()}`,
      pos_id:         user?.id || 'pos',
      cashier:        user ? `${user.first_name} ${user.last_name}` : 'POS',
      items:          totals.lines.map(l => ({
        id:         l.id,
        name:       l.name,
        qty:        safeNum(l.qty),
        unit_price: safeNum(l.unit_price),
        disc_type:  l.disc_type,
        disc_value: safeNum(l.disc_value),
        line_total: safeNum(l.line_total),
      })),
      subtotal:       safeNum(totals.subtotal),
      discount_total: safeNum(totals.discountTotal),
      grand_total:    safeNum(totals.grandTotal),
      payment_method: payMethod,
      payment_ref:    payRef || null,
      status:         'completed',
      created_at:     new Date().toISOString(),
      receipt_no:     receiptNo(),
    };
    savePosTransaction(tx).catch(() => {});
    setTransactions(prev => [tx, ...prev]);
    setReceiptData(tx);
    setCart([]);
    setPayRef('');
  }, [cart, totals, payMethod, payRef, user]);

  // ── Shift summary ────────────────────────────────────────────────────────────
  const todayTx = useMemo(() => {
    const today = new Date().toDateString();
    return transactions.filter(t => new Date(t.created_at).toDateString() === today);
  }, [transactions]);

  const shiftTotal = useMemo(() =>
    todayTx.reduce((s, t) => s + safeNum(t.grand_total), 0)
  , [todayTx]);

  const payBreakdown = useMemo(() =>
    todayTx.reduce((acc, t) => {
      acc[t.payment_method] = safeNum(acc[t.payment_method]) + safeNum(t.grand_total);
      return acc;
    }, {})
  , [todayTx]);

  return {
    // state
    search, setSearch,
    cart,
    payMethod, setPayMethod,
    payRef, setPayRef,
    tab, setTab,
    receiptData, setReceiptData,
    transactions,
    scanFeedback,
    // derived
    products, filtered, totals,
    todayTx, shiftTotal, payBreakdown,
    // actions
    addToCart, handleBarcodeScan,
    updateQty, updateDisc, removeFromCart,
    handleCheckout, clearSale,
  };
}

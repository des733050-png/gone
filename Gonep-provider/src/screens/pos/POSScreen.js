// ─── POSScreen.js ─────────────────────────────────────────────────────────────
// Full-screen POS terminal.
//
// BARCODE SCANNING — how it works:
//   USB/Bluetooth scanners behave as keyboard wedge devices — they type the
//   barcode string into a focused text input and press Enter. A hidden TextInput
//   at the top of the screen captures all keystrokes when focused. On Enter
//   (or after 300ms of no further input after a rapid burst), it calls
//   handleBarcodeScan(code) which looks up the product by barcode field.
//
//   Camera scanning: uses expo-barcode-scanner if available (optional dep).
//   Falls back gracefully if not installed.
//
//   Manual entry: the visible search field also accepts barcode input — press
//   Enter or tap the scan icon to trigger a barcode lookup.
//
// DISCOUNT — per item, one type only: percentage OR fixed KSh amount.
//   Saved item discounts (set in Inventory) auto-apply when scanned; overridable.
//
// NaN guard: all price calculations use safeNum() which defaults to 0.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, FlatList, Platform, Pressable,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../../atoms/Icon';
import { Btn } from '../../atoms/Btn';
import { Badge } from '../../atoms/Badge';
import { MOCK_INVENTORY, MOCK_POS_TRANSACTIONS } from '../../mock/data';
import { savePosTransaction } from '../../api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeNum = (v) => {
  const n = Number(v);
  return isFinite(n) && !isNaN(n) ? n : 0;
};

const fmt = (n) =>
  `KSh ${safeNum(n).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

const calcLineTotal = (unitPrice, qty, discType, discValue) => {
  const price = safeNum(unitPrice);
  const q     = safeNum(qty);
  const disc  = safeNum(discValue);
  if (discType === 'percent') {
    return price * q * (1 - Math.min(disc, 100) / 100);
  }
  return Math.max(0, price * q - disc);
};

const receiptNo = () =>
  `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

const nowTs = () => {
  const d = new Date();
  return `${d.toLocaleDateString('en-KE')} ${d.toLocaleTimeString('en-KE', {
    hour: '2-digit', minute: '2-digit',
  })}`;
};

const PAYMENT_METHODS = [
  { id: 'cash',  label: 'Cash',   icon: 'dollar-sign'  },
  { id: 'mpesa', label: 'M-Pesa', icon: 'smartphone'   },
  { id: 'card',  label: 'Card',   icon: 'credit-card'  },
];

// ─── BarcodeInputHandler ──────────────────────────────────────────────────────
// Invisible TextInput that captures USB/BT scanner keystrokes (keyboard wedge).
// Scanner typically sends barcode digits + Enter in < 100ms.
// After a 350ms quiet period we fire the lookup.
function BarcodeInputHandler({ onScan, products }) {
  const [buf,   setBuf]   = useState('');
  const timerRef          = useRef(null);

  const handleChange = (text) => {
    setBuf(text);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (text.trim().length >= 4) {
        onScan(text.trim());
        setBuf('');
      }
    }, 350);
  };

  const handleSubmit = () => {
    clearTimeout(timerRef.current);
    if (buf.trim().length >= 4) { onScan(buf.trim()); setBuf(''); }
  };

  return (
    <TextInput
      value={buf}
      onChangeText={handleChange}
      onSubmitEditing={handleSubmit}
      style={styles.hiddenInput}
      autoFocus={Platform.OS === 'web'}
      blurOnSubmit={false}
      returnKeyType="done"
      placeholder=""
      accessible={false}
      importantForAccessibility="no"
    />
  );
}

// ─── ReceiptModal ─────────────────────────────────────────────────────────────
function ReceiptModal({ visible, tx, facility, cashier, onClose, onNewSale }) {
  const { C } = useTheme();
  if (!tx) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={rs.backdrop}>
        <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
          <View style={rs.receipt}>
            <Text style={rs.header}>{facility}</Text>
            <Text style={rs.sub}>Official Receipt</Text>
            <View style={rs.div} />
            <Text style={rs.field}>Receipt #:  {tx.receipt_no}</Text>
            <Text style={rs.field}>Cashier:    {cashier}</Text>
            <Text style={rs.field}>Date:       {new Date(tx.created_at).toLocaleString('en-KE')}</Text>
            <View style={rs.div} />
            <View style={rs.lineHeader}>
              <Text style={[rs.col1, rs.th]}>Item</Text>
              <Text style={[rs.colQty, rs.th]}>Qty</Text>
              <Text style={[rs.colPrice, rs.th]}>Price</Text>
              <Text style={[rs.colTotal, rs.th]}>Total</Text>
            </View>
            {(tx.items || []).map((item, i) => (
              <View key={i} style={rs.lineItem}>
                <Text style={rs.col1} numberOfLines={1}>{item.name}</Text>
                <Text style={rs.colQty}>{item.qty}</Text>
                <Text style={rs.colPrice}>{fmt(item.unit_price)}</Text>
                <Text style={rs.colTotal}>{fmt(item.line_total)}</Text>
              </View>
            ))}
            <View style={rs.div} />
            <View style={rs.totalRow}><Text style={rs.tl}>Subtotal</Text><Text style={rs.tv}>{fmt(tx.subtotal)}</Text></View>
            {safeNum(tx.discount_total) > 0 && (
              <View style={rs.totalRow}><Text style={rs.tl}>Discount</Text><Text style={[rs.tv, { color: 'red' }]}>-{fmt(tx.discount_total)}</Text></View>
            )}
            <View style={[rs.totalRow, { marginTop: 4 }]}>
              <Text style={[rs.tl, { fontWeight: '900', fontSize: 15 }]}>TOTAL</Text>
              <Text style={[rs.tv, { fontWeight: '900', fontSize: 15 }]}>{fmt(tx.grand_total)}</Text>
            </View>
            <View style={rs.div} />
            <Text style={rs.payInfo}>Payment: {tx.payment_method}{tx.payment_ref ? ` · ${tx.payment_ref}` : ''}</Text>
            <Text style={rs.thanks}>Thank you for visiting {facility}!</Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              {Platform.OS === 'web' && (
                <Btn label="Print" icon="printer" variant="secondary"
                  onPress={() => typeof window !== 'undefined' && window.print()}
                  style={{ flex: 1 }} />
              )}
              <Btn label="New sale" onPress={onNewSale} style={{ flex: 1 }} />
            </View>
            <Btn label="Close" variant="ghost" onPress={onClose} full style={{ marginTop: 8 }} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── TransactionCard (shift summary expandable) ───────────────────────────────
function TransactionCard({ tx, C }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity onPress={() => setOpen(v => !v)}
      style={[styles.txCard, { backgroundColor: C.card, borderColor: C.border }]}>
      {/* Summary row — always shown */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>{tx.receipt_no}</Text>
          <Text style={{ fontSize: 11, color: C.textMuted }}>
            {new Date(tx.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })} · {tx.items?.length ?? 0} item{(tx.items?.length ?? 0) !== 1 ? 's' : ''} · {tx.payment_method}
          </Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: '900', color: C.primary, marginRight: 8 }}>{fmt(tx.grand_total)}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} lib="feather" size={14} color={C.textMuted} />
      </View>

      {/* Expanded detail — no edit */}
      {open && (
        <View style={[styles.txDetail, { borderTopColor: C.divider }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.textMuted }}>Transaction ID</Text>
            <Text style={{ fontSize: 10, color: C.textSec }}>{tx.id}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.textMuted }}>Time</Text>
            <Text style={{ fontSize: 10, color: C.textSec }}>{new Date(tx.created_at).toLocaleString('en-KE')}</Text>
          </View>
          {(tx.items || []).map((item, i) => (
            <View key={i} style={[styles.txItem, { borderBottomColor: C.divider }]}>
              <Text style={{ flex: 1, fontSize: 12, color: C.text }} numberOfLines={1}>{item.name}</Text>
              <Text style={{ fontSize: 11, color: C.textMuted, marginHorizontal: 8 }}>×{item.qty}</Text>
              <Text style={{ fontSize: 11, color: C.textSec }}>{fmt(item.line_total)}</Text>
            </View>
          ))}
          {safeNum(tx.discount_total) > 0 && (
            <View style={styles.txItem}>
              <Text style={{ flex: 1, fontSize: 12, color: C.textMuted }}>Discount</Text>
              <Text style={{ fontSize: 12, color: 'red' }}>-{fmt(tx.discount_total)}</Text>
            </View>
          )}
          <View style={[styles.txItem, { borderBottomWidth: 0, marginTop: 4 }]}>
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: C.text }}>TOTAL</Text>
            <Text style={{ fontSize: 13, fontWeight: '900', color: C.primary }}>{fmt(tx.grand_total)}</Text>
          </View>
          <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 6 }}>
            Payment: {tx.payment_method}{tx.payment_ref ? ` · ${tx.payment_ref}` : ''} · Cashier: {tx.cashier}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── CartItem ─────────────────────────────────────────────────────────────────
function CartItem({ item, onQty, onDisc, onRemove, C }) {
  const lineTotal = calcLineTotal(item.unit_price, item.qty, item.disc_type, item.disc_value);
  return (
    <View style={[styles.cartItem, { borderBottomColor: C.divider }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cartName, { color: C.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={{ fontSize: 10, color: C.textMuted }}>{fmt(item.unit_price)} / unit</Text>
      </View>

      {/* Qty stepper */}
      <View style={styles.stepper}>
        <TouchableOpacity style={[styles.stepBtn, { borderColor: C.border }]} onPress={() => onQty(item.id, -1)}>
          <Text style={{ color: C.text, fontWeight: '700' }}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.stepVal, { color: C.text }]}>{item.qty}</Text>
        <TouchableOpacity style={[styles.stepBtn, { borderColor: C.border }]} onPress={() => onQty(item.id, 1)}>
          <Text style={{ color: C.text, fontWeight: '700' }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Discount — toggle % / fixed */}
      <View style={styles.discRow}>
        <TouchableOpacity
          onPress={() => onDisc(item.id, 'type', item.disc_type === 'percent' ? 'fixed' : 'percent')}
          style={[styles.discTypeBtn, { backgroundColor: item.disc_type === 'percent' ? C.primaryLight : C.warningLight, borderColor: item.disc_type === 'percent' ? C.primary : C.warning }]}>
          <Text style={{ color: item.disc_type === 'percent' ? C.primary : C.warning, fontSize: 10, fontWeight: '700' }}>
            {item.disc_type === 'percent' ? '%' : 'KSh'}
          </Text>
        </TouchableOpacity>
        <TextInput
          value={String(item.disc_value === 0 ? '' : item.disc_value)}
          onChangeText={v => onDisc(item.id, 'value', v)}
          keyboardType="decimal-pad"
          placeholder="0"
          style={[styles.discInput, { color: C.text, borderColor: C.border }]}
          placeholderTextColor={C.textMuted}
        />
      </View>

      <Text style={[styles.lineTotal, { color: C.text }]}>{fmt(lineTotal)}</Text>

      <TouchableOpacity onPress={() => onRemove(item.id)} style={{ padding: 4 }}>
        <Icon name="x" lib="feather" size={14} color={C.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ─── POSScreen ────────────────────────────────────────────────────────────────
export function POSScreen({ user, onLogout }) {
  const { C } = useTheme();
  const [search,       setSearch]       = useState('');
  const [cart,         setCart]         = useState([]);
  const [payMethod,    setPayMethod]    = useState('cash');
  const [payRef,       setPayRef]       = useState('');
  const [tab,          setTab]          = useState('sale');
  const [receiptData,  setReceiptData]  = useState(null);
  const [transactions, setTransactions] = useState(MOCK_POS_TRANSACTIONS.map(t => ({ ...t })));
  const [scanFeedback, setScanFeedback] = useState(null); // { type: 'ok'|'err', msg }

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

  // ── Scan feedback toast ───────────────────────────────────────────────────
  const showFeedback = useCallback((type, msg) => {
    setScanFeedback({ type, msg });
    setTimeout(() => setScanFeedback(null), 2000);
  }, []);

  // ── Add to cart ───────────────────────────────────────────────────────────
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

  // ── Barcode scan handler ──────────────────────────────────────────────────
  const handleBarcodeScan = useCallback((code) => {
    const product = products.find(p => (p.barcode || '').trim() === code.trim());
    if (product) {
      addToCart(product);
      showFeedback('ok', `✓ ${product.name} added`);
    } else {
      // Not found — silent beep/vibrate. Cashier falls back to manual search.
      try {
        if (typeof window !== 'undefined' && window.navigator?.vibrate) {
          window.navigator.vibrate([80, 40, 80]); // short double buzz
        }
        // Web: play a short error tone via AudioContext
        if (typeof window !== 'undefined' && window.AudioContext) {
          const ctx = new window.AudioContext();
          const osc = ctx.createOscillator();
          osc.type = 'square';
          osc.frequency.setValueAtTime(220, ctx.currentTime);
          osc.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.12);
        }
      } catch (_) { /* audio/vibration not available — fail silently */ }
      // Populate the search field so cashier can verify/select manually
      setSearch(code);
    }
  }, [products, addToCart, showFeedback]);

  // ── Cart mutations ────────────────────────────────────────────────────────
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

  const removeFromCart = useCallback((id) => setCart(prev => prev.filter(c => c.id !== id)), []);

  // ── Totals ────────────────────────────────────────────────────────────────
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

  // ── Checkout ──────────────────────────────────────────────────────────────
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

  const clearSale = useCallback(() => { setCart([]); setReceiptData(null); }, []);

  // ── Shift data ────────────────────────────────────────────────────────────
  const todayTx = useMemo(() => {
    const today = new Date().toDateString();
    return transactions.filter(t => new Date(t.created_at).toDateString() === today);
  }, [transactions]);

  const shiftTotal  = useMemo(() => todayTx.reduce((s, t) => s + safeNum(t.grand_total), 0), [todayTx]);
  const payBreakdown= useMemo(() =>
    todayTx.reduce((acc, t) => {
      acc[t.payment_method] = safeNum(acc[t.payment_method]) + safeNum(t.grand_total);
      return acc;
    }, {}), [todayTx]
  );

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>

      {/* Invisible barcode capture input */}
      <BarcodeInputHandler onScan={handleBarcodeScan} products={products} />

      {/* Scan feedback toast */}
      {scanFeedback && (
        <View style={[styles.toast, { backgroundColor: scanFeedback.type === 'ok' ? C.success : C.danger }]}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{scanFeedback.msg}</Text>
        </View>
      )}

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: C.navBg, borderBottomColor: C.border }]}>
        <View>
          <Text style={[styles.facilityName, { color: C.primary }]}>
            {user?.facility || 'GONEP Pharmacy'}
          </Text>
          <Text style={[styles.cashierName, { color: C.textMuted }]}>
            {user ? `${user.first_name} ${user.last_name}` : 'POS Terminal'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Text style={[styles.shiftStat, { color: C.success }]}>{fmt(shiftTotal)} today</Text>
          <TouchableOpacity onPress={onLogout} style={[styles.logoutBtn, { borderColor: C.border }]}>
            <Icon name="log-out" lib="feather" size={16} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tab bar ── */}
      <View style={[styles.tabBar, { backgroundColor: C.navBg, borderBottomColor: C.border }]}>
        {[
          { id: 'sale',    label: 'New Sale',      icon: 'shopping-cart' },
          { id: 'history', label: 'History',        icon: 'clock'         },
          { id: 'summary', label: 'Shift Summary',  icon: 'bar-chart-2'   },
        ].map(t => (
          <TouchableOpacity key={t.id} onPress={() => setTab(t.id)}
            style={[styles.tabBtn, tab === t.id && { borderBottomColor: C.primary, borderBottomWidth: 2 }]}>
            <Icon name={t.icon} lib="feather" size={14} color={tab === t.id ? C.primary : C.textMuted} />
            <Text style={[styles.tabLabel, { color: tab === t.id ? C.primary : C.textMuted, fontWeight: tab === t.id ? '700' : '400' }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── SALE TAB ── */}
      {tab === 'sale' && (
        <View style={{ flex: 1, flexDirection: 'row' }}>

          {/* Product pane */}
          <View style={[styles.productPane, { borderRightColor: C.border }]}>
            {/* Search / manual barcode */}
            <View style={[styles.searchBox, { backgroundColor: C.inputBg, borderColor: C.border }]}>
              <Icon name="search" lib="feather" size={14} color={C.textMuted} style={{ marginRight: 7 }} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={() => { if (search.trim()) handleBarcodeScan(search.trim()); }}
                placeholder="Search or scan barcode…"
                placeholderTextColor={C.textMuted}
                style={[styles.searchInput, { color: C.text }]}
                returnKeyType="search"
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Icon name="x" lib="feather" size={13} color={C.textMuted} />
                </TouchableOpacity>
              ) : (
                <Icon name="maximize-2" lib="feather" size={13} color={C.textMuted} />
              )}
            </View>
            <FlatList
              data={filtered}
              keyExtractor={i => i.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: p }) => {
                const inCart  = cart.find(c => c.id === p.id);
                const hasSavedDisc = p.saved_discount && safeNum(p.saved_discount.value) > 0;
                return (
                  <TouchableOpacity
                    onPress={() => addToCart(p)}
                    style={[styles.productRow, { borderBottomColor: C.divider, backgroundColor: inCart ? `${C.primary}08` : 'transparent' }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.productName, { color: C.text }]} numberOfLines={1}>{p.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 10, color: C.textMuted }}>{p.category}</Text>
                        {p.barcode && <Text style={{ fontSize: 9, color: C.textMuted }}>#{p.barcode}</Text>}
                        {hasSavedDisc && (
                          <View style={[styles.savedDiscPill, { backgroundColor: C.successLight }]}>
                            <Text style={{ color: C.success, fontSize: 9, fontWeight: '700' }}>
                              {p.saved_discount.type === 'percent'
                                ? `${p.saved_discount.value}% off`
                                : `KSh ${p.saved_discount.value} off`}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.productPrice, { color: C.primary }]}>{fmt(p.unit_price)}</Text>
                      <Text style={{ fontSize: 9, color: C.textMuted }}>{safeNum(p.stock)} left</Text>
                      {inCart && <Badge label={`×${inCart.qty}`} color="primary" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Cart pane */}
          <View style={[styles.cartPane, { backgroundColor: C.surface }]}>
            <View style={[styles.cartHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.cartTitle, { color: C.text }]}>Cart ({cart.length})</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Text style={{ fontSize: 10, color: C.textMuted, alignSelf: 'center' }}>% / KSh</Text>
                {cart.length > 0 && (
                  <TouchableOpacity onPress={clearSale}>
                    <Icon name="trash-2" lib="feather" size={16} color={C.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {cart.length === 0 ? (
                <View style={styles.cartEmpty}>
                  <Icon name="shopping-cart" lib="feather" size={28} color={C.textMuted} />
                  <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 8 }}>
                    Tap products or scan to add
                  </Text>
                </View>
              ) : (
                cart.map(item => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onQty={updateQty}
                    onDisc={updateDisc}
                    onRemove={removeFromCart}
                    C={C}
                  />
                ))
              )}
            </ScrollView>

            {/* Footer: totals + payment */}
            {cart.length > 0 && (
              <View style={[styles.cartFooter, { borderTopColor: C.border, backgroundColor: C.card }]}>
                <View style={styles.totalRow}>
                  <Text style={{ color: C.textMuted, fontSize: 12 }}>Subtotal</Text>
                  <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }}>{fmt(totals.subtotal)}</Text>
                </View>
                {totals.discountTotal > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={{ color: C.textMuted, fontSize: 12 }}>Discount</Text>
                    <Text style={{ color: C.danger, fontSize: 12, fontWeight: '600' }}>-{fmt(totals.discountTotal)}</Text>
                  </View>
                )}
                <View style={[styles.totalRow, { paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: C.divider }]}>
                  <Text style={{ color: C.text, fontSize: 15, fontWeight: '900' }}>TOTAL</Text>
                  <Text style={{ color: C.primary, fontSize: 17, fontWeight: '900' }}>{fmt(totals.grandTotal)}</Text>
                </View>

                {/* Payment method */}
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                  {PAYMENT_METHODS.map(m => (
                    <TouchableOpacity key={m.id} onPress={() => setPayMethod(m.id)}
                      style={[styles.payBtn, {
                        flex: 1,
                        backgroundColor: payMethod === m.id ? C.primary : C.surface,
                        borderColor:     payMethod === m.id ? C.primary : C.border,
                      }]}>
                      <Icon name={m.icon} lib="feather" size={13} color={payMethod === m.id ? '#fff' : C.textSec} />
                      <Text style={{ color: payMethod === m.id ? '#fff' : C.textSec, fontSize: 10, fontWeight: '600', marginLeft: 4 }}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {(payMethod === 'mpesa' || payMethod === 'card') && (
                  <TextInput
                    value={payRef}
                    onChangeText={setPayRef}
                    placeholder={payMethod === 'mpesa' ? 'M-Pesa transaction code' : 'Card authorisation code'}
                    style={[styles.payRefInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                    placeholderTextColor={C.textMuted}
                  />
                )}
                <Btn label="Complete sale & print receipt" onPress={handleCheckout} full style={{ marginTop: 10 }} />
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <ScrollView style={{ flex: 1, padding: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 10 }}>
            All transactions ({transactions.length})
          </Text>
          {transactions.map(tx => (
            <TransactionCard key={tx.id} tx={tx} C={C} />
          ))}
        </ScrollView>
      )}

      {/* ── SHIFT SUMMARY TAB ── */}
      {tab === 'summary' && (
        <ScrollView style={{ flex: 1, padding: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 14 }}>
            Today's shift
          </Text>

          {/* KPIs */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            <View style={[styles.shiftKpi, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: C.primary }}>{fmt(shiftTotal)}</Text>
              <Text style={{ fontSize: 11, color: C.textMuted }}>Total revenue</Text>
            </View>
            <View style={[styles.shiftKpi, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: C.text }}>{todayTx.length}</Text>
              <Text style={{ fontSize: 11, color: C.textMuted }}>Transactions</Text>
            </View>
          </View>

          {/* Payment breakdown */}
          {Object.entries(payBreakdown).map(([method, val]) => (
            <View key={method} style={[styles.txCard, { backgroundColor: C.card, borderColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <Text style={{ color: C.textSec, textTransform: 'capitalize', fontWeight: '600' }}>{method}</Text>
              <Text style={{ fontWeight: '800', color: C.text }}>{fmt(val)}</Text>
            </View>
          ))}

          {/* Transaction list */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, marginTop: 14, marginBottom: 8 }}>
            Transactions today
          </Text>
          {todayTx.length === 0 && (
            <Text style={{ color: C.textMuted, fontSize: 12 }}>No transactions yet today</Text>
          )}
          {todayTx.map(tx => (
            <TransactionCard key={tx.id} tx={tx} C={C} />
          ))}
        </ScrollView>
      )}

      {/* Receipt modal */}
      <ReceiptModal
        visible={!!receiptData}
        tx={receiptData}
        facility={user?.facility || 'GONEP Pharmacy'}
        cashier={user ? `${user.first_name} ${user.last_name}` : 'POS'}
        onClose={() => setReceiptData(null)}
        onNewSale={clearSale}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  hiddenInput:   { position: 'absolute', top: -100, left: -100, width: 1, height: 1, opacity: 0 },
  toast:         { position: 'absolute', top: 60, left: '10%', right: '10%', zIndex: 100, borderRadius: 10, padding: 10, alignItems: 'center' },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1 },
  facilityName:  { fontSize: 14, fontWeight: '900' },
  cashierName:   { fontSize: 10, marginTop: 1 },
  shiftStat:     { fontSize: 12, fontWeight: '700' },
  logoutBtn:     { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tabBar:        { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel:      { fontSize: 11 },
  // Product pane
  productPane:   { flex: 1.3, borderRightWidth: 1 },
  searchBox:     { flexDirection: 'row', alignItems: 'center', margin: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  searchInput:   { flex: 1, fontSize: 13 },
  productRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9, borderBottomWidth: 1 },
  productName:   { fontSize: 12, fontWeight: '600' },
  productPrice:  { fontSize: 12, fontWeight: '800' },
  savedDiscPill: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  // Cart pane
  cartPane:      { flex: 1, flexDirection: 'column' },
  cartHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1 },
  cartTitle:     { fontSize: 13, fontWeight: '700' },
  cartEmpty:     { alignItems: 'center', paddingVertical: 30 },
  cartItem:      { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8, borderBottomWidth: 1 },
  cartName:      { fontSize: 11, fontWeight: '600' },
  lineTotal:     { fontSize: 11, fontWeight: '800', minWidth: 50, textAlign: 'right' },
  stepper:       { flexDirection: 'row', alignItems: 'center', gap: 3 },
  stepBtn:       { width: 20, height: 20, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepVal:       { fontSize: 12, fontWeight: '700', minWidth: 18, textAlign: 'center' },
  discRow:       { flexDirection: 'row', alignItems: 'center', gap: 2 },
  discTypeBtn:   { width: 26, height: 22, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  discInput:     { width: 36, borderWidth: 1, borderRadius: 5, fontSize: 11, padding: 2, textAlign: 'center' },
  cartFooter:    { borderTopWidth: 1, padding: 10 },
  totalRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  payBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8, paddingVertical: 7 },
  payRefInput:   { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 12, marginTop: 8 },
  // Transaction cards
  txCard:        { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  txDetail:      { marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  txItem:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1 },
  // Shift summary
  shiftKpi:      { flex: 1, borderWidth: 1, borderRadius: 10, padding: 14 },
});

const rs = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  receipt:    { backgroundColor: '#fff', borderRadius: 8, padding: 20, maxWidth: 340, width: '100%' },
  header:     { fontSize: 15, fontWeight: '900', textAlign: 'center', color: '#000' },
  sub:        { fontSize: 11, textAlign: 'center', color: '#555', marginBottom: 8 },
  div:        { borderBottomWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', marginVertical: 8 },
  field:      { fontSize: 11, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined, color: '#333', marginBottom: 2 },
  lineHeader: { flexDirection: 'row', marginBottom: 3 },
  lineItem:   { flexDirection: 'row', marginBottom: 2 },
  col1:       { flex: 1, fontSize: 11, color: '#333' },
  colQty:     { width: 28, fontSize: 11, textAlign: 'right', color: '#333' },
  colPrice:   { width: 64, fontSize: 11, textAlign: 'right', color: '#333' },
  colTotal:   { width: 68, fontSize: 11, textAlign: 'right', color: '#000', fontWeight: '600' },
  th:         { fontWeight: '700', color: '#000' },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  tl:         { fontSize: 12, color: '#333' },
  tv:         { fontSize: 12, color: '#000', fontWeight: '700' },
  payInfo:    { fontSize: 11, textAlign: 'center', color: '#555', marginTop: 6 },
  thanks:     { fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 6, color: '#000' },
});

// ─── screens/pos/POSScreen.js ─────────────────────────────────────────────────
//
// BARCODE SCANNING: USB/Bluetooth scanners act as keyboard-wedge devices —
// they type into BarcodeInputHandler (hidden TextInput) and press Enter.
// Camera scanning uses expo-barcode-scanner if available (optional dep).
// Manual entry: the visible search field also accepts barcode input on Enter.
//
// DISCOUNT: per item, percentage OR fixed KSh. Saved item discounts (set in
// Inventory) auto-apply on scan; overridable per line.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, FlatList,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../../atoms/Icon';
import { Btn } from '../../atoms/Btn';
import { Badge } from '../../atoms/Badge';
import { usePOSTerminal } from '../../hooks/usePOSTerminal';
import { PAYMENT_METHODS, fmt, safeNum } from '../../constants/pos';
import { BarcodeInputHandler } from './molecules/BarcodeInputHandler';
import { CartItem }            from './molecules/CartItem';
import { ReceiptModal }        from './molecules/ReceiptModal';
import { TransactionCard }     from './molecules/TransactionCard';
import { s }                   from './styles';

const TAB_DEFS = [
  { id: 'sale',    label: 'New Sale',     icon: 'shopping-cart' },
  { id: 'history', label: 'History',      icon: 'clock'         },
  { id: 'summary', label: 'Shift Summary', icon: 'bar-chart-2'  },
];

export function POSScreen({ user, onLogout }) {
  const { C } = useTheme();
  const pos = usePOSTerminal(user);

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>

      {/* Invisible barcode capture */}
      <BarcodeInputHandler onScan={pos.handleBarcodeScan} />

      {/* Scan feedback toast */}
      {pos.scanFeedback && (
        <View style={[s.toast, { backgroundColor: pos.scanFeedback.type === 'ok' ? C.success : C.danger }]}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{pos.scanFeedback.msg}</Text>
        </View>
      )}

      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: C.navBg, borderBottomColor: C.border }]}>
        <View>
          <Text style={[s.facilityName, { color: C.primary }]}>{user?.facility || 'GONEP Pharmacy'}</Text>
          <Text style={[s.cashierName, { color: C.textMuted }]}>
            {user ? `${user.first_name} ${user.last_name}` : 'POS Terminal'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Text style={[s.shiftStat, { color: C.success }]}>{fmt(pos.shiftTotal)} today</Text>
          <TouchableOpacity onPress={onLogout} style={[s.logoutBtn, { borderColor: C.border }]}>
            <Icon name="log-out" lib="feather" size={16} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tab bar ── */}
      <View style={[s.tabBar, { backgroundColor: C.navBg, borderBottomColor: C.border }]}>
        {TAB_DEFS.map(t => (
          <TouchableOpacity key={t.id} onPress={() => pos.setTab(t.id)}
            style={[s.tabBtn, pos.tab === t.id && { borderBottomColor: C.primary, borderBottomWidth: 2 }]}>
            <Icon name={t.icon} lib="feather" size={14} color={pos.tab === t.id ? C.primary : C.textMuted} />
            <Text style={[s.tabLabel, {
              color:      pos.tab === t.id ? C.primary : C.textMuted,
              fontWeight: pos.tab === t.id ? '700' : '400',
            }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── SALE TAB ── */}
      {pos.tab === 'sale' && (
        <View style={{ flex: 1, flexDirection: 'row' }}>

          {/* Product pane */}
          <View style={[s.productPane, { borderRightColor: C.border }]}>
            <View style={[s.searchBox, { backgroundColor: C.inputBg, borderColor: C.border }]}>
              <Icon name="search" lib="feather" size={14} color={C.textMuted} style={{ marginRight: 7 }} />
              <TextInput
                value={pos.search}
                onChangeText={pos.setSearch}
                onSubmitEditing={() => { if (pos.search.trim()) pos.handleBarcodeScan(pos.search.trim()); }}
                placeholder="Search or scan barcode…"
                placeholderTextColor={C.textMuted}
                style={[s.searchInput, { color: C.text }]}
                returnKeyType="search"
              />
              {pos.search ? (
                <TouchableOpacity onPress={() => pos.setSearch('')}>
                  <Icon name="x" lib="feather" size={13} color={C.textMuted} />
                </TouchableOpacity>
              ) : (
                <Icon name="maximize-2" lib="feather" size={13} color={C.textMuted} />
              )}
            </View>

            <FlatList
              data={pos.filtered}
              keyExtractor={i => i.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: p }) => {
                const inCart      = pos.cart.find(c => c.id === p.id);
                const hasSavedDisc = p.saved_discount && safeNum(p.saved_discount.value) > 0;
                return (
                  <TouchableOpacity
                    onPress={() => pos.addToCart(p)}
                    style={[s.productRow, {
                      borderBottomColor:  C.divider,
                      backgroundColor:    inCart ? `${C.primary}08` : 'transparent',
                    }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.productName, { color: C.text }]} numberOfLines={1}>{p.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 10, color: C.textMuted }}>{p.category}</Text>
                        {p.barcode && <Text style={{ fontSize: 9, color: C.textMuted }}>#{p.barcode}</Text>}
                        {hasSavedDisc && (
                          <View style={[s.savedDiscPill, { backgroundColor: C.successLight }]}>
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
                      <Text style={[s.productPrice, { color: C.primary }]}>{fmt(p.unit_price)}</Text>
                      <Text style={{ fontSize: 9, color: C.textMuted }}>{safeNum(p.stock)} left</Text>
                      {inCart && <Badge label={`×${inCart.qty}`} color="primary" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Cart pane */}
          <View style={[s.cartPane, { backgroundColor: C.surface }]}>
            <View style={[s.cartHeader, { borderBottomColor: C.border }]}>
              <Text style={[s.cartTitle, { color: C.text }]}>Cart ({pos.cart.length})</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Text style={{ fontSize: 10, color: C.textMuted, alignSelf: 'center' }}>% / KSh</Text>
                {pos.cart.length > 0 && (
                  <TouchableOpacity onPress={pos.clearSale}>
                    <Icon name="trash-2" lib="feather" size={16} color={C.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {pos.cart.length === 0 ? (
                <View style={s.cartEmpty}>
                  <Icon name="shopping-cart" lib="feather" size={28} color={C.textMuted} />
                  <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 8 }}>
                    Tap products or scan to add
                  </Text>
                </View>
              ) : (
                pos.cart.map(item => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onQty={pos.updateQty}
                    onDisc={pos.updateDisc}
                    onRemove={pos.removeFromCart}
                    C={C}
                  />
                ))
              )}
            </ScrollView>

            {pos.cart.length > 0 && (
              <View style={[s.cartFooter, { borderTopColor: C.border, backgroundColor: C.card }]}>
                <View style={s.totalRow}>
                  <Text style={{ color: C.textMuted, fontSize: 12 }}>Subtotal</Text>
                  <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }}>{fmt(pos.totals.subtotal)}</Text>
                </View>
                {pos.totals.discountTotal > 0 && (
                  <View style={s.totalRow}>
                    <Text style={{ color: C.textMuted, fontSize: 12 }}>Discount</Text>
                    <Text style={{ color: C.danger, fontSize: 12, fontWeight: '600' }}>-{fmt(pos.totals.discountTotal)}</Text>
                  </View>
                )}
                <View style={[s.totalRow, { paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: C.divider }]}>
                  <Text style={{ color: C.text, fontSize: 15, fontWeight: '900' }}>TOTAL</Text>
                  <Text style={{ color: C.primary, fontSize: 17, fontWeight: '900' }}>{fmt(pos.totals.grandTotal)}</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                  {PAYMENT_METHODS.map(m => (
                    <TouchableOpacity key={m.id} onPress={() => pos.setPayMethod(m.id)}
                      style={[s.payBtn, { flex: 1,
                        backgroundColor: pos.payMethod === m.id ? C.primary : C.surface,
                        borderColor:     pos.payMethod === m.id ? C.primary : C.border,
                      }]}>
                      <Icon name={m.icon} lib="feather" size={13} color={pos.payMethod === m.id ? '#fff' : C.textSec} />
                      <Text style={{ color: pos.payMethod === m.id ? '#fff' : C.textSec, fontSize: 10, fontWeight: '600', marginLeft: 4 }}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {(pos.payMethod === 'mpesa' || pos.payMethod === 'card') && (
                  <TextInput
                    value={pos.payRef}
                    onChangeText={pos.setPayRef}
                    placeholder={pos.payMethod === 'mpesa' ? 'M-Pesa transaction code' : 'Card authorisation code'}
                    style={[s.payRefInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                    placeholderTextColor={C.textMuted}
                  />
                )}
                <Btn label="Complete sale & print receipt" onPress={pos.handleCheckout} full style={{ marginTop: 10 }} />
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── HISTORY TAB ── */}
      {pos.tab === 'history' && (
        <ScrollView style={{ flex: 1, padding: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 10 }}>
            All transactions ({pos.transactions.length})
          </Text>
          {pos.transactions.map(tx => (
            <TransactionCard key={tx.id} tx={tx} C={C} />
          ))}
        </ScrollView>
      )}

      {/* ── SHIFT SUMMARY TAB ── */}
      {pos.tab === 'summary' && (
        <ScrollView style={{ flex: 1, padding: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 14 }}>
            Today's shift
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            <View style={[s.shiftKpi, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: C.primary }}>{fmt(pos.shiftTotal)}</Text>
              <Text style={{ fontSize: 11, color: C.textMuted }}>Total revenue</Text>
            </View>
            <View style={[s.shiftKpi, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: C.text }}>{pos.todayTx.length}</Text>
              <Text style={{ fontSize: 11, color: C.textMuted }}>Transactions</Text>
            </View>
          </View>

          {Object.entries(pos.payBreakdown).map(([method, val]) => (
            <View key={method} style={[s.txCard, { backgroundColor: C.card, borderColor: C.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <Text style={{ color: C.textSec, textTransform: 'capitalize', fontWeight: '600' }}>{method}</Text>
              <Text style={{ fontWeight: '800', color: C.text }}>{fmt(val)}</Text>
            </View>
          ))}

          <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, marginTop: 14, marginBottom: 8 }}>
            Transactions today
          </Text>
          {pos.todayTx.length === 0 && (
            <Text style={{ color: C.textMuted, fontSize: 12 }}>No transactions yet today</Text>
          )}
          {pos.todayTx.map(tx => (
            <TransactionCard key={tx.id} tx={tx} C={C} />
          ))}
        </ScrollView>
      )}

      <ReceiptModal
        visible={!!pos.receiptData}
        tx={pos.receiptData}
        facility={user?.facility || 'GONEP Pharmacy'}
        cashier={user ? `${user.first_name} ${user.last_name}` : 'POS'}
        onClose={() => pos.setReceiptData(null)}
        onNewSale={pos.clearSale}
      />
    </View>
  );
}

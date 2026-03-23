import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  Modal, TextInput, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { useInventory } from '../../../hooks/useInventory';
import {
  addStock, reduceStock, updateInventoryItem,
  addInventoryItem, deactivateItem, toggleEcommerce,
  appendLog,
} from '../../../api';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['Cardiovascular','Diabetes','Antibiotics','Pain Relief','Gastro','Dermatology','Respiratory','Other'];
const UNITS      = ['tabs','caps','ml','vials','sachets','units'];
const ADD_REASONS    = ['New delivery','Stock correction','Transfer in','Opening stock'];
const REDUCE_REASONS = ['Dispensed via Rx','Expired / damaged','Write-off','Stock correction','Transfer out'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusColor  = s => s === 'ok' ? 'success' : s === 'low' ? 'warning' : 'danger';
const statusLabel  = s => s === 'ok' ? 'In stock' : s === 'low' ? 'Low stock' : 'Out of stock';
const derivedStatus = (stock, reorder) => stock <= 0 ? 'out' : stock <= reorder ? 'low' : 'ok';

// ─── StockModal ───────────────────────────────────────────────────────────────
function StockModal({ visible, mode, item, onClose, onDone, user }) {
  const { C } = useTheme();
  const [qty,    setQty]    = useState('');
  const [reason, setReason] = useState(mode === 'add' ? ADD_REASONS[0] : REDUCE_REASONS[0]);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const reasons = mode === 'add' ? ADD_REASONS : REDUCE_REASONS;
  const isAdd   = mode === 'add';

  const handleSave = async () => {
    const n = parseInt(qty, 10);
    if (!n || n < 1) { setErr('Enter a valid quantity (minimum 1).'); return; }
    if (!isAdd && n > item.stock) { setErr(`Cannot reduce by more than current stock (${item.stock}).`); return; }
    try {
      setSaving(true); setErr('');
      const fn = isAdd ? addStock : reduceStock;
      await fn({ id: item.id, qty: n, reason, by: `${user.first_name} ${user.last_name}` });
      appendLog({
        staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
        module: 'Inventory', action: isAdd ? 'Stock received' : 'Stock reduced',
        detail: `${item.name} ${isAdd ? '+' : '-'}${n} ${item.unit} (${reason})`, type: 'inventory',
      });
      onDone(); onClose();
    } catch (e) { setErr(e?.message || 'Failed to update stock.'); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sh.backdrop}>
        <View style={[sh.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={sh.handle} />
          <Text style={[sh.sheetTitle, { color: C.text }]}>{isAdd ? 'Receive stock' : 'Reduce stock'}</Text>
          {item && <Text style={[sh.sheetSub, { color: C.textMuted }]}>{item.name} · Current stock: {item.stock} {item.unit}</Text>}

          <Text style={[sh.fieldLbl, { color: C.textMuted }]}>Quantity ({item?.unit}) *</Text>
          <TextInput value={qty} onChangeText={v => { setQty(v); setErr(''); }} keyboardType="number-pad" placeholder="0"
            style={[sh.inp, { backgroundColor: C.inputBg, borderColor: err ? C.danger : C.border, color: C.text }]}
            placeholderTextColor={C.textMuted} />

          <Text style={[sh.fieldLbl, { color: C.textMuted }]}>Reason *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {reasons.map(r => (
              <TouchableOpacity key={r} onPress={() => setReason(r)}
                style={[sh.pill, { backgroundColor: reason === r ? C.primary : C.surface, borderColor: reason === r ? C.primary : C.border, marginRight: 6 }]}>
                <Text style={{ color: reason === r ? '#fff' : C.textSec, fontSize: 11, fontWeight: '600' }}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {err ? <Text style={[sh.errTxt, { color: C.danger }]}>{err}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
            <Btn label={saving ? 'Saving…' : isAdd ? 'Confirm receipt' : 'Confirm reduction'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── EditItemModal ─────────────────────────────────────────────────────────────
function EditItemModal({ visible, item, onClose, onDone, user }) {
  const { C } = useTheme();
  const [name,     setName]    = useState(item?.name     || '');
  const [category, setCategory]= useState(item?.category || CATEGORIES[0]);
  const [unit,     setUnit]    = useState(item?.unit      || UNITS[0]);
  const [price,    setPrice]   = useState(item?.unit_price != null ? String(item.unit_price) : '');
  const [reorder,  setReorder] = useState(item?.reorder  != null  ? String(item.reorder)    : '100');
  const [saving,   setSaving]  = useState(false);
  const [err,      setErr]     = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setErr('Item name is required.'); return; }
    const reorderN = parseInt(reorder, 10);
    if (isNaN(reorderN) || reorderN < 0) { setErr('Enter a valid reorder level.'); return; }
    try {
      setSaving(true); setErr('');
      await updateInventoryItem(item.id, { name: name.trim(), category, unit, unit_price: parseFloat(price) || 0, reorder: reorderN });
      appendLog({ staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role, module: 'Inventory', action: 'Item edited', detail: `${name.trim()} — details updated`, type: 'inventory' });
      onDone(); onClose();
    } catch (e) { setErr(e?.message || 'Failed to save changes.'); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sh.backdrop}>
        <ScrollView>
          <View style={{ flex: 1, justifyContent: 'flex-end', minHeight: 500 }}>
            <View style={[sh.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={sh.handle} />
              <Text style={[sh.sheetTitle, { color: C.text }]}>Edit item</Text>

              <Text style={[sh.fieldLbl, { color: C.textMuted }]}>Drug / item name *</Text>
              <TextInput value={name} onChangeText={v => { setName(v); setErr(''); }}
                style={[sh.inp, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]} placeholderTextColor={C.textMuted} />

              <Text style={[sh.fieldLbl, { color: C.textMuted }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c} onPress={() => setCategory(c)}
                    style={[sh.pill, { backgroundColor: category === c ? C.primary : C.surface, borderColor: category === c ? C.primary : C.border, marginRight: 6 }]}>
                    <Text style={{ color: category === c ? '#fff' : C.textSec, fontSize: 11, fontWeight: '600' }}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[sh.fieldLbl, { color: C.textMuted }]}>Unit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {UNITS.map(u => (
                  <TouchableOpacity key={u} onPress={() => setUnit(u)}
                    style={[sh.pill, { backgroundColor: unit === u ? C.primary : C.surface, borderColor: unit === u ? C.primary : C.border, marginRight: 6 }]}>
                    <Text style={{ color: unit === u ? '#fff' : C.textSec, fontSize: 11, fontWeight: '600' }}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[sh.fieldLbl, { color: C.textMuted }]}>Unit price (KSh)</Text>
                  <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0"
                    style={[sh.inp, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]} placeholderTextColor={C.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[sh.fieldLbl, { color: C.textMuted }]}>Reorder level</Text>
                  <TextInput value={reorder} onChangeText={setReorder} keyboardType="number-pad" placeholder="100"
                    style={[sh.inp, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]} placeholderTextColor={C.textMuted} />
                </View>
              </View>

              {err ? <Text style={[sh.errTxt, { color: C.danger }]}>{err}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
                <Btn label={saving ? 'Saving…' : 'Save changes'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── AddItemModal ─────────────────────────────────────────────────────────────
function AddItemModal({ visible, onClose, onDone, user }) {
  const { C } = useTheme();
  const [name,      setName]     = useState('');
  const [category,  setCategory] = useState(CATEGORIES[0]);
  const [unit,      setUnit]     = useState(UNITS[0]);
  const [price,     setPrice]    = useState('');
  const [stock,     setStock]    = useState('');
  const [reorder,   setReorder]  = useState('100');
  const [ecommerce, setEcommerce]= useState(false);
  const [saving,    setSaving]   = useState(false);
  const [err,       setErr]      = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setErr('Item name is required.'); return; }
    try {
      setSaving(true); setErr('');
      await addInventoryItem({
        name: name.trim(), category, unit,
        unit_price: parseFloat(price) || 0,
        stock: parseInt(stock, 10) || 0,
        reorder: parseInt(reorder, 10) || 0,
        ecommerce,
        addedBy: `${user.first_name} ${user.last_name}`,
      });
      appendLog({ staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role, module: 'Inventory', action: 'New item added', detail: `${name.trim()} added to formulary`, type: 'inventory' });
      onDone(); onClose();
    } catch (e) { setErr(e?.message || 'Failed to add item.'); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sh.backdrop}>
        <ScrollView>
          <View style={{ flex: 1, justifyContent: 'flex-end', minHeight: 600 }}>
            <View style={[sh.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={sh.handle} />
              <Text style={[sh.sheetTitle, { color: C.text }]}>Add to formulary</Text>
              <Text style={[sh.sheetSub,   { color: C.textMuted }]}>New drug or supply item</Text>

              <Text style={[sh.fieldLbl, { color: C.textMuted }]}>Drug / item name *</Text>
              <TextInput value={name} onChangeText={v => { setName(v); setErr(''); }} placeholder="e.g. Lisinopril 10mg"
                style={[sh.inp, { backgroundColor: C.inputBg, borderColor: err && !name ? C.danger : C.border, color: C.text }]}
                placeholderTextColor={C.textMuted} />

              <Text style={[sh.fieldLbl, { color: C.textMuted }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c} onPress={() => setCategory(c)}
                    style={[sh.pill, { backgroundColor: category === c ? C.primary : C.surface, borderColor: category === c ? C.primary : C.border, marginRight: 6 }]}>
                    <Text style={{ color: category === c ? '#fff' : C.textSec, fontSize: 11, fontWeight: '600' }}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[sh.fieldLbl, { color: C.textMuted }]}>Unit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {UNITS.map(u => (
                  <TouchableOpacity key={u} onPress={() => setUnit(u)}
                    style={[sh.pill, { backgroundColor: unit === u ? C.primary : C.surface, borderColor: unit === u ? C.primary : C.border, marginRight: 6 }]}>
                    <Text style={{ color: unit === u ? '#fff' : C.textSec, fontSize: 11, fontWeight: '600' }}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[sh.fieldLbl, { color: C.textMuted }]}>Opening stock</Text>
                  <TextInput value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="0"
                    style={[sh.inp, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]} placeholderTextColor={C.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[sh.fieldLbl, { color: C.textMuted }]}>Reorder level</Text>
                  <TextInput value={reorder} onChangeText={setReorder} keyboardType="number-pad" placeholder="100"
                    style={[sh.inp, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]} placeholderTextColor={C.textMuted} />
                </View>
              </View>

              <Text style={[sh.fieldLbl, { color: C.textMuted }]}>Unit price (KSh)</Text>
              <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0"
                style={[sh.inp, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text, marginBottom: 14 }]}
                placeholderTextColor={C.textMuted} />

              <View style={[sh.ecomRow, { borderColor: C.border }]}>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>List on ecommerce</Text>
                  <Text style={{ fontSize: 11, color: C.textMuted }}>Visible on Gonep pharmacy website</Text>
                </View>
                <Switch value={ecommerce} onValueChange={setEcommerce} trackColor={{ false: C.border, true: `${C.success}60` }} thumbColor={ecommerce ? C.success : C.textMuted} />
              </View>

              {err ? <Text style={[sh.errTxt, { color: C.danger }]}>{err}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
                <Btn label={saving ? 'Adding…' : 'Add to formulary'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── HistoryModal ─────────────────────────────────────────────────────────────
function HistoryModal({ visible, item, onClose }) {
  const { C } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sh.backdrop}>
        <View style={[sh.sheet, { backgroundColor: C.card, borderColor: C.border, maxHeight: '70%' }]}>
          <View style={sh.handle} />
          <Text style={[sh.sheetTitle, { color: C.text }]}>Stock history</Text>
          {item && <Text style={[sh.sheetSub, { color: C.textMuted }]}>{item.name} · Current: {item.stock} {item.unit}</Text>}
          <ScrollView style={{ marginTop: 8 }} showsVerticalScrollIndicator={false}>
            {(item?.history || []).length === 0 && (
              <Text style={{ color: C.textMuted, textAlign: 'center', marginVertical: 20, fontSize: 13 }}>No history available</Text>
            )}
            {(item?.history || []).map((h, i) => {
              const isPos = h.qty_change > 0;
              return (
                <View key={i} style={[sh.histRow, { borderBottomColor: C.divider }]}>
                  <View style={[sh.histDot, { backgroundColor: isPos ? C.success : C.danger }]} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>{h.action}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: isPos ? C.success : C.danger }}>{isPos ? '+' : ''}{h.qty_change}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>By {h.by} · {h.date}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <Btn label="Close" variant="ghost" onPress={onClose} style={{ marginTop: 14 }} full />
        </View>
      </View>
    </Modal>
  );
}

// ─── BarcodeModal ─────────────────────────────────────────────────────────────
// Single, deduplicated BarcodeModal — handles both Code128 and QR display,
// saved-discount configuration, and auto-generates + saves a barcode if the
// item has none.
function BarcodeModal({ visible, item, onClose, onSave, user }) {
  const { C } = useTheme();

  const generatedBarcode = React.useMemo(() => {
    if (item?.barcode) return item.barcode;
    const base = '601' + String(Math.abs(item?.id?.split('').reduce((a, c) => a + c.charCodeAt(0), 0) || 0)).padStart(9, '0');
    return base.slice(0, 12);
  }, [item]);

  React.useEffect(() => {
    if (item && !item.barcode && generatedBarcode) {
      updateInventoryItem(item.id, { barcode: generatedBarcode }).catch(() => {});
    }
  }, [item, generatedBarcode]);

  const [discType,  setDiscType]  = React.useState(item?.saved_discount?.type  || 'percent');
  const [discValue, setDiscValue] = React.useState(String(item?.saved_discount?.value || 0));
  const [mode,      setMode]      = React.useState('barcode');
  const [saving,    setSaving]    = React.useState(false);

  if (!item) return null;

  const barcode = item.barcode || generatedBarcode || '0000000000000';
  const bars    = barcode.split('').map((ch, i) => ({
    width: [2, 1, 3, 1, 2, 2, 1, 3][parseInt(ch, 16) % 8],
    dark:  i % 2 === 0,
  }));

  const handleSaveDiscount = async () => {
    setSaving(true);
    await updateInventoryItem(item.id, { saved_discount: { type: discType, value: parseFloat(discValue) || 0 } });
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Inventory', action: 'Item discount updated',
      detail: `${item.name} → ${discValue}${discType === 'percent' ? '%' : ' KSh'} off`, type: 'inventory',
    });
    setSaving(false);
    if (onSave) onSave();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={bc.backdrop}>
        <ScrollView>
          <View style={{ minHeight: 500, justifyContent: 'flex-end' }}>
            <View style={[bc.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={bc.handle} />
              <Text style={[bc.title, { color: C.text }]}>Barcode & label</Text>
              <Text style={[bc.sub, { color: C.textMuted }]}>{item.name}</Text>

              {/* Mode toggle */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {[{ id: 'barcode', lbl: 'Code128' }, { id: 'qr', lbl: 'QR Code' }].map(m => (
                  <TouchableOpacity key={m.id} onPress={() => setMode(m.id)}
                    style={[bc.pill, { flex: 1, backgroundColor: mode === m.id ? C.primary : C.surface, borderColor: mode === m.id ? C.primary : C.border }]}>
                    <Text style={{ color: mode === m.id ? '#fff' : C.textSec, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>{m.lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Label preview */}
              <View style={[bc.preview, { borderColor: C.border }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 6, color: '#000' }}>{item.name}</Text>
                {mode === 'barcode' ? (
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', height: 50 }}>
                      {bars.map((b, i) => (
                        <View key={i} style={{ width: b.width * 2, height: 50, backgroundColor: b.dark ? '#000' : '#fff' }} />
                      ))}
                    </View>
                    <Text style={{ fontSize: 9, textAlign: 'center', marginTop: 4, color: '#000' }}>{barcode}</Text>
                  </>
                ) : (
                  <View style={{ alignItems: 'center', marginBottom: 4 }}>
                    {Array.from({ length: 7 }).map((_, row) => (
                      <View key={row} style={{ flexDirection: 'row' }}>
                        {Array.from({ length: 7 }).map((__, col) => {
                          const finder = (row < 2 && col < 2) || (row < 2 && col > 4) || (row > 4 && col < 2);
                          const data   = (row + col + parseInt(barcode[row + col] || '0', 10)) % 2 === 0;
                          return <View key={col} style={{ width: 8, height: 8, backgroundColor: (finder || data) ? '#000' : '#fff' }} />;
                        })}
                      </View>
                    ))}
                  </View>
                )}
                <Text style={{ fontSize: 11, textAlign: 'center', color: '#000', marginTop: 4 }}>KSh {item.unit_price || '—'} / {item.unit}</Text>
              </View>

              {/* Print */}
              {Platform.OS === 'web' && (
                <Btn label="Print label" size="sm" icon="printer" variant="secondary"
                  onPress={() => typeof window !== 'undefined' && window.print()} style={{ marginBottom: 14 }} />
              )}

              {/* Saved discount */}
              <Text style={[bc.sectionLbl, { color: C.textMuted }]}>SAVED DISCOUNT (auto-applies on POS scan)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                {[{ id: 'percent', lbl: '% Percent' }, { id: 'fixed', lbl: 'KSh Fixed' }].map(dt => (
                  <TouchableOpacity key={dt.id} onPress={() => setDiscType(dt.id)}
                    style={[bc.pill, { flex: 1, backgroundColor: discType === dt.id ? C.primary : C.surface, borderColor: discType === dt.id ? C.primary : C.border }]}>
                    <Text style={{ color: discType === dt.id ? '#fff' : C.textSec, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>{dt.lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput value={discValue} onChangeText={setDiscValue} keyboardType="decimal-pad"
                placeholder={discType === 'percent' ? 'e.g. 10 for 10% off' : 'e.g. 50 for KSh 50 off'}
                style={[bc.inp, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                placeholderTextColor={C.textMuted} />

              {parseFloat(discValue) > 0 && (
                <View style={[bc.discPreview, { backgroundColor: C.successLight, borderColor: C.success }]}>
                  <Icon name="check-circle" lib="feather" size={13} color={C.success} />
                  <Text style={{ color: C.success, fontSize: 12, marginLeft: 6 }}>
                    {'At POS: '}
                    {discType === 'percent' ? `${discValue}% discount auto-applied` : `KSh ${discValue} off auto-applied`}
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Btn label="Close" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
                <Btn label={saving ? 'Saving…' : 'Save discount'} onPress={handleSaveDiscount} loading={saving} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── InventoryScreen ──────────────────────────────────────────────────────────
export function InventoryScreen({ user, filter: propFilter }) {
  const { C } = useTheme();
  const { inventory, loading, error, reload } = useInventory();
  const canAdd = user?.role === 'hospital_admin' || user?.role === 'lab_manager';

  const [stockFilter,  setStockFilter]  = useState(propFilter || 'all');
  const [stockModal,   setStockModal]   = useState({ visible: false, mode: 'add', item: null });
  const [editModal,    setEditModal]    = useState({ visible: false, item: null });
  const [histModal,    setHistModal]    = useState({ visible: false, item: null });
  const [barcodeModal, setBarcodeModal] = useState({ visible: false, item: null });
  const [addModal,     setAddModal]     = useState(false);

  useEffect(() => { if (propFilter) setStockFilter(propFilter); }, [propFilter]);

  const displayed = inventory.filter(item => {
    const st = derivedStatus(item.stock, item.reorder);
    if (stockFilter === 'low') return st === 'low';
    if (stockFilter === 'out') return st === 'out';
    return true;
  });

  const handleToggleEcom = useCallback(async (item) => {
    await toggleEcommerce(item.id);
    appendLog({ staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role, module: 'Inventory', action: item.ecommerce ? 'Ecommerce delisted' : 'Listed on ecommerce', detail: item.name, type: 'inventory' });
    reload();
  }, [user, reload]);

  const handleDeactivate = useCallback(async (item) => {
    try {
      await deactivateItem(item.id);
      appendLog({ staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role, module: 'Inventory', action: 'Item discontinued', detail: `${item.name} removed from formulary`, type: 'inventory' });
      reload();
    } catch (_) {}
  }, [user, reload]);

  if (loading) return (
    <ScreenContainer>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
        <ActivityIndicator color={C.primary} />
        <Text style={{ color: C.textMuted, marginTop: 12, fontSize: 13 }}>Loading inventory…</Text>
      </View>
    </ScreenContainer>
  );

  if (error) return (
    <ScreenContainer>
      <View style={{ alignItems: 'center', paddingTop: 60 }}>
        <Icon name="alert-circle" lib="feather" size={36} color={C.danger} />
        <Text style={{ color: C.danger, marginTop: 12, fontSize: 13 }}>{error}</Text>
        <Btn label="Retry" onPress={reload} style={{ marginTop: 16 }} />
      </View>
    </ScreenContainer>
  );

  return (
    <ScreenContainer scroll>
      {/* Header */}
      <View style={s.pageHeader}>
        <View>
          <Text style={[s.pageTitle, { color: C.text }]}>Inventory</Text>
          <Text style={[s.pageSub, { color: C.textMuted }]}>{inventory.length} active items</Text>
        </View>
        {canAdd && <Btn label="+ New item" size="sm" onPress={() => setAddModal(true)} />}
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {[
          { id: 'all', label: 'All items' },
          { id: 'low', label: `Low stock (${inventory.filter(i => derivedStatus(i.stock, i.reorder) === 'low').length})` },
          { id: 'out', label: `Out of stock (${inventory.filter(i => derivedStatus(i.stock, i.reorder) === 'out').length})` },
        ].map(f => (
          <Btn key={f.id} label={f.label} variant={stockFilter === f.id ? 'primary' : 'ghost'}
            size="sm" onPress={() => setStockFilter(f.id)} style={{ marginRight: 8 }} />
        ))}
      </ScrollView>

      {/* Ecommerce banner */}
      <View style={[s.infoBanner, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
        <Icon name="store" lib="mc" size={14} color={C.primary} style={{ marginRight: 8 }} />
        <Text style={{ color: C.primary, fontSize: 12, flex: 1 }}>
          Toggle ecommerce to control visibility on the Gonep pharmacy website.
        </Text>
      </View>

      {displayed.map(item => {
        const st     = derivedStatus(item.stock, item.reorder);
        const iconBg = st === 'out' ? C.dangerLight : st === 'low' ? C.warningLight : C.primaryLight;
        const iconCl = st === 'out' ? C.danger      : st === 'low' ? C.warning      : C.primary;
        return (
          <Card key={item.id} style={s.itemCard}>
            <View style={s.itemRow}>
              <View style={[s.itemIcon, { backgroundColor: iconBg }]}>
                <Icon name="package-variant" lib="mc" size={20} color={iconCl} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.itemName, { color: C.text }]}>{item.name}</Text>
                <Text style={[s.itemSub, { color: C.textMuted }]}>
                  {item.category} · {item.unit}{item.unit_price ? ` · KSh ${item.unit_price}/unit` : ''}
                </Text>
                <Text style={[s.itemStock, { color: C.textSec }]}>
                  {'Stock: '}
                  <Text style={{ fontWeight: '800', color: st === 'out' ? C.danger : st === 'low' ? C.warning : C.text }}>{item.stock}</Text>
                  {`  ·  Reorder at ${item.reorder}`}
                </Text>
              </View>
              <Badge label={statusLabel(st)} color={statusColor(st)} />
            </View>

            {/* Ecommerce toggle */}
            <View style={[s.ecomRow, { borderTopColor: C.divider, borderTopWidth: 1, marginTop: 12, paddingTop: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="store" lib="mc" size={14} color={item.ecommerce ? C.success : C.textMuted} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, color: item.ecommerce ? C.success : C.textMuted, fontWeight: '600' }}>
                  {item.ecommerce ? 'Listed on ecommerce' : 'Not listed'}
                </Text>
              </View>
              <Switch value={item.ecommerce} onValueChange={() => handleToggleEcom(item)}
                trackColor={{ false: C.border, true: `${C.success}60` }} thumbColor={item.ecommerce ? C.success : C.textMuted} />
            </View>

            {/* Actions */}
            <View style={s.actionRow}>
              <TouchableOpacity onPress={() => setStockModal({ visible: true, mode: 'add', item })} style={[s.actionBtn, { backgroundColor: C.primaryLight }]}>
                <Icon name="plus" lib="feather" size={13} color={C.primary} />
                <Text style={[s.actionBtnTxt, { color: C.primary }]}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStockModal({ visible: true, mode: 'reduce', item })} style={[s.actionBtn, { backgroundColor: C.dangerLight }]}>
                <Icon name="minus" lib="feather" size={13} color={C.danger} />
                <Text style={[s.actionBtnTxt, { color: C.danger }]}>Reduce</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditModal({ visible: true, item })} style={[s.actionBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }]}>
                <Icon name="edit-2" lib="feather" size={13} color={C.textSec} />
                <Text style={[s.actionBtnTxt, { color: C.textSec }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setHistModal({ visible: true, item })} style={[s.actionBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }]}>
                <Icon name="clock" lib="feather" size={13} color={C.textSec} />
                <Text style={[s.actionBtnTxt, { color: C.textSec }]}>History</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setBarcodeModal({ visible: true, item })} style={[s.actionBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }]}>
                <Icon name="grid" lib="feather" size={13} color={C.textSec} />
                <Text style={[s.actionBtnTxt, { color: C.textSec }]}>Barcode</Text>
              </TouchableOpacity>
              {user?.role === 'hospital_admin' && (
                <TouchableOpacity onPress={() => handleDeactivate(item)} style={[s.actionBtn, { backgroundColor: C.dangerLight }]}>
                  <Icon name="trash-2" lib="feather" size={13} color={C.danger} />
                  <Text style={[s.actionBtnTxt, { color: C.danger }]}>Discontinue</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        );
      })}

      {/* Modals — each declared exactly once */}
      <StockModal
        visible={stockModal.visible} mode={stockModal.mode} item={stockModal.item} user={user}
        onClose={() => setStockModal(m => ({ ...m, visible: false }))} onDone={reload} />
      <EditItemModal
        visible={editModal.visible} item={editModal.item} user={user}
        onClose={() => setEditModal(m => ({ ...m, visible: false }))} onDone={reload} />
      <HistoryModal
        visible={histModal.visible} item={histModal.item}
        onClose={() => setHistModal(m => ({ ...m, visible: false }))} />
      <BarcodeModal
        visible={barcodeModal.visible} item={barcodeModal.item} user={user}
        onClose={() => setBarcodeModal({ visible: false, item: null })} onSave={reload} />
      {addModal && (
        <AddItemModal visible={addModal} user={user}
          onClose={() => setAddModal(false)} onDone={reload} />
      )}
    </ScreenContainer>
  );
}

// ─── Shared sheet styles ──────────────────────────────────────────────────────
const sh = StyleSheet.create({
  backdrop:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:     { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, paddingBottom: 36 },
  handle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  sheetTitle:{ fontSize: 16, fontWeight: '800', marginBottom: 4 },
  sheetSub:  { fontSize: 12, marginBottom: 14 },
  fieldLbl:  { fontSize: 11, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  inp:       { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14, marginBottom: 14 },
  pill:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  errTxt:    { fontSize: 12, marginBottom: 10 },
  ecomRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 14 },
  histRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  histDot:   { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
});

// ─── BarcodeModal styles ──────────────────────────────────────────────────────
const bc = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, paddingBottom: 36 },
  handle:      { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 14 },
  title:       { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  sub:         { fontSize: 12, marginBottom: 14 },
  preview:     { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 14, alignItems: 'center', backgroundColor: '#fff' },
  sectionLbl:  { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  pill:        { paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  inp:         { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 4 },
  discPreview: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 8, marginBottom: 4 },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  pageHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  pageTitle:   { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  pageSub:     { fontSize: 12 },
  infoBanner:  { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 },
  itemCard:    { marginBottom: 12, padding: 14 },
  itemRow:     { flexDirection: 'row', alignItems: 'center' },
  itemIcon:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemName:    { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  itemSub:     { fontSize: 12, marginBottom: 2 },
  itemStock:   { fontSize: 12 },
  ecomRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  actionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  actionBtnTxt:{ fontSize: 12, fontWeight: '600' },
});

// ─── screens/operations/Inventory/InventoryScreen.js ─────────────────────────
import React from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { PageHeader }  from '../../../molecules/PageHeader';
import { EmptyState }  from '../../../molecules/EmptyState';
import { useInventoryActions } from '../../../hooks/useInventoryActions';
import { derivedStatus, statusColor, statusLabel } from '../../../constants/inventory';
import { StockModal }   from './molecules/StockModal';
import { EditItemModal } from './molecules/EditItemModal';
import { AddItemModal }  from './molecules/AddItemModal';
import { HistoryModal }  from './molecules/HistoryModal';
import { BarcodeModal }  from './molecules/BarcodeModal';
import { s }             from './styles';

export function InventoryScreen({ user, filter: propFilter }) {
  const { C } = useTheme();
  const inv = useInventoryActions(user, propFilter);
  const canAdd = user?.role === 'hospital_admin' || user?.role === 'lab_manager';

  if (inv.loading) return (
    <ScreenContainer>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
        <ActivityIndicator color={C.primary} />
        <Text style={{ color: C.textMuted, marginTop: 12, fontSize: 13 }}>Loading inventory…</Text>
      </View>
    </ScreenContainer>
  );

  if (inv.error) return (
    <ScreenContainer>
      <View style={{ alignItems: 'center', paddingTop: 60 }}>
        <Icon name="alert-circle" lib="feather" size={36} color={C.danger} />
        <Text style={{ color: C.danger, marginTop: 12, fontSize: 13 }}>{inv.error}</Text>
        <Btn label="Retry" onPress={inv.reload} style={{ marginTop: 16 }} />
      </View>
    </ScreenContainer>
  );

  const displayed = inv.inventory.filter(item => {
    const st = derivedStatus(item.stock, item.reorder);
    if (inv.stockFilter === 'low') return st === 'low';
    if (inv.stockFilter === 'out') return st === 'out';
    return true;
  });

  return (
    <ScreenContainer scroll>
      <PageHeader
        title="Inventory"
        subtitle={`${inv.inventory.length} active items`}
        action={canAdd ? <Btn label="+ New item" size="sm" onPress={() => inv.setAddModal(true)} /> : null}
      />

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {[
          { id: 'all', label: 'All items' },
          { id: 'low', label: `Low stock (${inv.inventory.filter(i => derivedStatus(i.stock, i.reorder) === 'low').length})` },
          { id: 'out', label: `Out of stock (${inv.inventory.filter(i => derivedStatus(i.stock, i.reorder) === 'out').length})` },
        ].map(f => (
          <Btn key={f.id} label={f.label}
            variant={inv.stockFilter === f.id ? 'primary' : 'ghost'}
            size="sm" onPress={() => inv.setStockFilter(f.id)}
            style={{ marginRight: 8 }} />
        ))}
      </ScrollView>

      {/* Ecommerce banner */}
      <View style={[s.infoBanner, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
        <Icon name="store" lib="mc" size={14} color={C.primary} style={{ marginRight: 8 }} />
        <Text style={{ color: C.primary, fontSize: 12, flex: 1 }}>
          Toggle ecommerce to control visibility on the Gonep pharmacy website.
        </Text>
      </View>

      {displayed.length === 0 && <EmptyState icon="package" message="No items match this filter" />}

      {displayed.map(item => {
        const st     = derivedStatus(item.stock, item.reorder);
        const iconBg = st === 'out' ? C.dangerLight  : st === 'low' ? C.warningLight : C.primaryLight;
        const iconCl = st === 'out' ? C.danger       : st === 'low' ? C.warning      : C.primary;
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
                  <Text style={{ fontWeight: '800', color: st === 'out' ? C.danger : st === 'low' ? C.warning : C.text }}>
                    {item.stock}
                  </Text>
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
              <Switch
                value={item.ecommerce}
                onValueChange={() => inv.handleToggleEcom(item)}
                trackColor={{ false: C.border, true: `${C.success}60` }}
                thumbColor={item.ecommerce ? C.success : C.textMuted}
              />
            </View>

            {/* Actions */}
            <View style={s.actionRow}>
              <TouchableOpacity onPress={() => inv.setStockModal({ visible: true, mode: 'add', item })} style={[s.actionBtn, { backgroundColor: C.primaryLight }]}>
                <Icon name="plus"   lib="feather" size={13} color={C.primary} />
                <Text style={[s.actionBtnTxt, { color: C.primary }]}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => inv.setStockModal({ visible: true, mode: 'reduce', item })} style={[s.actionBtn, { backgroundColor: C.dangerLight }]}>
                <Icon name="minus"  lib="feather" size={13} color={C.danger} />
                <Text style={[s.actionBtnTxt, { color: C.danger }]}>Reduce</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => inv.setEditModal({ visible: true, item })} style={[s.actionBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }]}>
                <Icon name="edit-2" lib="feather" size={13} color={C.textSec} />
                <Text style={[s.actionBtnTxt, { color: C.textSec }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => inv.setHistModal({ visible: true, item })} style={[s.actionBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }]}>
                <Icon name="clock"  lib="feather" size={13} color={C.textSec} />
                <Text style={[s.actionBtnTxt, { color: C.textSec }]}>History</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => inv.setBarcodeModal({ visible: true, item })} style={[s.actionBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }]}>
                <Icon name="grid"   lib="feather" size={13} color={C.textSec} />
                <Text style={[s.actionBtnTxt, { color: C.textSec }]}>Barcode</Text>
              </TouchableOpacity>
              {user?.role === 'hospital_admin' && (
                <TouchableOpacity onPress={() => inv.handleDeactivate(item)} style={[s.actionBtn, { backgroundColor: C.dangerLight }]}>
                  <Icon name="trash-2" lib="feather" size={13} color={C.danger} />
                  <Text style={[s.actionBtnTxt, { color: C.danger }]}>Discontinue</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        );
      })}

      {/* Modals */}
      <StockModal
        visible={inv.stockModal.visible} mode={inv.stockModal.mode} item={inv.stockModal.item} user={user}
        onClose={() => inv.setStockModal(m => ({ ...m, visible: false }))} onDone={inv.reload} />
      <EditItemModal
        visible={inv.editModal.visible} item={inv.editModal.item} user={user}
        onClose={() => inv.setEditModal(m => ({ ...m, visible: false }))} onDone={inv.reload} />
      <HistoryModal
        visible={inv.histModal.visible} item={inv.histModal.item}
        onClose={() => inv.setHistModal(m => ({ ...m, visible: false }))} />
      <BarcodeModal
        visible={inv.barcodeModal.visible} item={inv.barcodeModal.item} user={user}
        onClose={() => inv.setBarcodeModal({ visible: false, item: null })} onSave={inv.reload} />
      {inv.addModal && (
        <AddItemModal visible={inv.addModal} user={user}
          onClose={() => inv.setAddModal(false)} onDone={inv.reload} />
      )}
    </ScreenContainer>
  );
}

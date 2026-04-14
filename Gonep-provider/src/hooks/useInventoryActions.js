// ─── hooks/useInventoryActions.js ────────────────────────────────────────────
import { useState, useCallback, useEffect } from 'react';
import { useInventory } from './useInventory';
import { toggleEcommerce, deactivateItem, appendLog } from '../api';

export function useInventoryActions(user, propFilter) {
  const { inventory, loading, error, reload } = useInventory();
  const [stockFilter,  setStockFilter]  = useState(propFilter || 'all');
  const [stockModal,   setStockModal]   = useState({ visible: false, mode: 'add', item: null });
  const [editModal,    setEditModal]    = useState({ visible: false, item: null });
  const [histModal,    setHistModal]    = useState({ visible: false, item: null });
  const [barcodeModal, setBarcodeModal] = useState({ visible: false, item: null });
  const [addModal,     setAddModal]     = useState(false);

  useEffect(() => { if (propFilter) setStockFilter(propFilter); }, [propFilter]);

  const handleToggleEcom = useCallback(async (item) => {
    await toggleEcommerce(item.id);
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Inventory',
      action: item.ecommerce ? 'Ecommerce delisted' : 'Listed on ecommerce',
      detail: item.name,
      type:   'inventory',
    });
    reload();
  }, [user, reload]);

  const handleDeactivate = useCallback(async (item) => {
    try {
      await deactivateItem(item.id);
      appendLog({
        staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
        module: 'Inventory', action: 'Item discontinued',
        detail: `${item.name} removed from formulary`,
        type:   'inventory',
      });
      reload();
    } catch (_) {}
  }, [user, reload]);

  return {
    // from useInventory
    inventory, loading, error, reload,
    // filter
    stockFilter, setStockFilter,
    // modal state
    stockModal,   setStockModal,
    editModal,    setEditModal,
    histModal,    setHistModal,
    barcodeModal, setBarcodeModal,
    addModal,     setAddModal,
    // actions
    handleToggleEcom, handleDeactivate,
  };
}

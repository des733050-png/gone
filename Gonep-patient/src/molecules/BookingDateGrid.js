/**
 * BookingDateGrid — patient app
 * Shows a monthly calendar where ONLY dates present in `availableDates` are
 * selectable; every other cell is visually greyed-out and non-pressable.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// ── date helpers (no external deps) ──────────────────────────────────────────
function isoFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function parseIso(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function mondayOffset(d) {
  const dow = d.getDay(); // Sun=0
  return (dow + 6) % 7;  // Mon=0 … Sun=6
}

function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

const HEADER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatMonthYear(d) {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
// ─────────────────────────────────────────────────────────────────────────────

export function BookingDateGrid({ availableDates, value, onChange, minDateIso }) {
  const { C } = useTheme();
  const availableSet = useMemo(() => new Set(availableDates || []), [availableDates]);

  const todayIso = useMemo(() => isoFromDate(new Date()), []);
  const minIso = minDateIso || todayIso;

  const initialMonth = useMemo(() => {
    if (value && parseIso(value)) return startOfMonth(parseIso(value));
    if (availableDates?.length) return startOfMonth(parseIso(availableDates[0]));
    return startOfMonth(new Date());
  }, [value, availableDates]); // eslint-disable-line react-hooks/exhaustive-deps

  const [viewMonth, setViewMonth] = useState(initialMonth);

  useEffect(() => {
    setViewMonth(initialMonth);
  }, [initialMonth]);

  const { year, monthIndex, cells } = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const first = new Date(y, m, 1);
    const offset = mondayOffset(first);
    const dim = daysInMonth(y, m);
    const list = [];
    for (let i = 0; i < offset; i += 1) list.push({ type: 'pad' });
    for (let day = 1; day <= dim; day += 1) {
      const iso = isoFromDate(new Date(y, m, day));
      const isPast = iso < minIso;
      const isAvailable = availableSet.has(iso) && !isPast;
      list.push({ type: 'day', day, iso, isPast, isAvailable });
    }
    while (list.length % 7 !== 0) list.push({ type: 'pad' });
    return { year: y, monthIndex: m, cells: list };
  }, [viewMonth, availableSet, minIso]);

  return (
    <View style={styles.wrap}>
      {/* Month navigation */}
      <View style={[styles.monthBar, { borderColor: C.border }]}>
        <TouchableOpacity
          onPress={() => setViewMonth(new Date(year, monthIndex - 1, 1))}
          style={styles.navBtn}
          hitSlop={10}
        >
          <Text style={{ color: C.primary, fontSize: 20, fontWeight: '700' }}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: C.text }]}>
          {formatMonthYear(viewMonth)}
        </Text>
        <TouchableOpacity
          onPress={() => setViewMonth(new Date(year, monthIndex + 1, 1))}
          style={styles.navBtn}
          hitSlop={10}
        >
          <Text style={{ color: C.primary, fontSize: 20, fontWeight: '700' }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={styles.headerRow}>
        {HEADER.map((h) => (
          <Text key={h} style={[styles.headerCell, { color: C.textMuted }]}>{h}</Text>
        ))}
      </View>

      {/* Date cells */}
      <View style={styles.grid}>
        {cells.map((cell, idx) => {
          if (cell.type === 'pad') {
            return <View key={`p-${idx}`} style={styles.cell} />;
          }
          const selected = value === cell.iso;
          const disabled = !cell.isAvailable;
          return (
            <TouchableOpacity
              key={cell.iso}
              style={[
                styles.cell,
                {
                  backgroundColor: selected
                    ? C.primary
                    : cell.isAvailable
                    ? C.card
                    : 'transparent',
                  borderColor: selected ? C.primary : cell.isAvailable ? C.border : 'transparent',
                  borderWidth: cell.isAvailable ? 1.5 : 0,
                  opacity: disabled ? 0.3 : 1,
                },
              ]}
              disabled={disabled}
              onPress={() => onChange?.(cell.iso)}
            >
              <Text
                style={{
                  color: selected ? '#fff' : disabled ? C.textMuted : C.text,
                  fontWeight: selected ? '700' : '500',
                  fontSize: 13,
                }}
              >
                {cell.day}
              </Text>
              {/* Dot indicator for available dates */}
              {!selected && cell.isAvailable && (
                <View style={[styles.dot, { backgroundColor: C.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {availableDates?.length === 0 && (
        <Text style={[styles.emptyHint, { color: C.textMuted }]}>
          No available dates this month.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  navBtn: { minWidth: 36, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontSize: 15, fontWeight: '700' },
  headerRow: { flexDirection: 'row', marginBottom: 2 },
  headerCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingVertical: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    flexBasis: '14.28%',
    maxWidth: '14.28%',
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 2,
  },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  emptyHint: { textAlign: 'center', fontSize: 12, paddingVertical: 12 },
});

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { isoDateFromLocalDate, parseLocalIsoDate } from '../utils/bookingAvailability';

const WEEK_START_MON = true;
const HEADER = WEEK_START_MON ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Monday-first column index 0..6 for the first day of month */
function mondayOffset(d) {
  const dow = d.getDay(); // Sun=0
  return WEEK_START_MON ? (dow + 6) % 7 : dow;
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function formatMonthYear(d) {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function BookingDateGrid({ availableDates, value, onChange, minDateIso }) {
  const { C } = useTheme();
  const availableSet = useMemo(() => new Set(availableDates || []), [availableDates]);
  const todayIso = useMemo(() => {
    const n = new Date();
    return isoDateFromLocalDate(new Date(n.getFullYear(), n.getMonth(), n.getDate()));
  }, []);

  const initialMonth = useMemo(() => {
    if (value && parseLocalIsoDate(value)) return startOfMonth(parseLocalIsoDate(value));
    if (availableDates?.length) return startOfMonth(parseLocalIsoDate(availableDates[0]));
    return startOfMonth(new Date());
  }, [value, availableDates]);

  const [viewMonth, setViewMonth] = useState(initialMonth);

  useEffect(() => {
    setViewMonth(initialMonth);
  }, [initialMonth]);

  const minIso = minDateIso || todayIso;

  const { year, monthIndex, cells } = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const first = new Date(y, m, 1);
    const offset = mondayOffset(first);
    const dim = daysInMonth(y, m);
    const list = [];
    for (let i = 0; i < offset; i += 1) list.push({ type: 'pad' });
    for (let day = 1; day <= dim; day += 1) {
      const cellDate = new Date(y, m, day);
      const iso = isoDateFromLocalDate(cellDate);
      const inMonth = true;
      const isPast = iso < minIso;
      const isAvailable = availableSet.has(iso) && !isPast;
      list.push({ type: 'day', day, iso, inMonth, isPast, isAvailable });
    }
    while (list.length % 7 !== 0) list.push({ type: 'pad' });
    while (list.length < 42) list.push({ type: 'pad' });
    return { year: y, monthIndex: m, cells: list };
  }, [viewMonth, availableSet, minIso]);

  const goPrev = () => {
    setViewMonth(new Date(year, monthIndex - 1, 1));
  };

  const goNext = () => {
    setViewMonth(new Date(year, monthIndex + 1, 1));
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>Date</Text>
      <View style={[styles.monthBar, { borderColor: C.border }]}>
        <TouchableOpacity onPress={goPrev} style={styles.navBtn} hitSlop={8}>
          <Text style={{ color: C.primary, fontSize: 18 }}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: C.text }]}>{formatMonthYear(viewMonth)}</Text>
        <TouchableOpacity onPress={goNext} style={styles.navBtn} hitSlop={8}>
          <Text style={{ color: C.primary, fontSize: 18 }}>{'›'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.headerRow}>
        {HEADER.map((h) => (
          <Text key={h} style={[styles.headerCell, { color: C.textMuted }]}>
            {h}
          </Text>
        ))}
      </View>
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
                  backgroundColor: selected ? C.primary : C.surface,
                  borderColor: selected ? C.primary : C.border,
                  opacity: disabled ? 0.35 : 1,
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
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  navBtn: {
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  headerCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    flexBasis: '14.28%',
    maxWidth: '14.28%',
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
  },
});

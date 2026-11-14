import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { SavedItem } from '@/lib/contracts';
import { UNKNOWN_GROUP, getGroups } from '@/lib/rules';
import { theme } from '@/lib/theme';

export interface GroupCount {
  id: string;
  short: string;
  color: string;
  count: number;
}

/** Đếm món theo từng nhóm của file luật; món chưa rõ nhóm gom vào một dòng riêng (chỉ hiện khi có). */
export function countByGroup(items: readonly SavedItem[]): GroupCount[] {
  const groups = getGroups();
  const rows: GroupCount[] = groups.map((g) => ({
    id: g.id,
    short: g.short,
    color: g.color_hex,
    count: 0,
  }));
  let unknown = 0;
  for (const it of items) {
    const row = rows.find((r) => r.id === it.groupId);
    if (row) {
      row.count += 1;
    } else {
      unknown += 1;
    }
  }
  if (unknown > 0) {
    rows.push({
      id: UNKNOWN_GROUP.id,
      short: UNKNOWN_GROUP.short,
      color: UNKNOWN_GROUP.color_hex,
      count: unknown,
    });
  }
  return rows;
}

interface Props {
  items: readonly SavedItem[];
}

/** Thanh ngang: số món theo từng nhóm, màu theo file luật. */
export function GroupBars({ items }: Props): React.JSX.Element {
  const rows = countByGroup(items);
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
  return (
    <View style={styles.wrap}>
      {rows.map((r) => (
        <View
          key={r.id}
          style={styles.row}
          accessible
          accessibilityLabel={`${r.short}: ${r.count} món`}
        >
          <View style={styles.labelRow}>
            <View style={[styles.dot, { backgroundColor: r.color }]} />
            <Text style={styles.label}>
              {r.short}
            </Text>
            <Text style={styles.count}>{r.count}</Text>
          </View>
          <View style={styles.track}>
            {r.count > 0 ? <View style={{ flex: r.count, backgroundColor: r.color }} /> : null}
            {max - r.count > 0 || max === 0 ? (
              <View style={{ flex: max === 0 ? 1 : max - r.count }} />
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  row: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  label: {
    flex: 1,
    color: theme.text,
    fontSize: 15,
  },
  count: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '700',
  },
  track: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.border,
    overflow: 'hidden',
  },
});

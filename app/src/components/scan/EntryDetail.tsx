// Bảng chi tiết khi chạm một thẻ đã xong: lý do + mẹo của từng món (đúng chữ AI trả về, không thêm thắt).
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { safeGroupColor, safeGroupShort, textOn } from '@/components/scan/labels';
import type { ScanEntry } from '@/lib/contracts';
import { getHazardous } from '@/lib/rules';
import { theme } from '@/lib/theme';

type Props = {
  entry: ScanEntry;
  onClose: () => void;
  onRemove: (id: string) => void;
};

export function EntryDetail({ entry, onClose, onRemove }: Props) {
  const hazardNote = getHazardous().note;
  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <Text style={styles.title}>
          {entry.items.length > 1 ? `${entry.items.length} món trong ảnh` : 'Vì sao là nhóm này?'}
        </Text>
        <Pressable style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Đóng chi tiết ảnh">
          <Ionicons name="close" size={26} color={theme.text} />
        </Pressable>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody}>
        {entry.items.map((item, i) => {
          const color = safeGroupColor(item.groupId);
          return (
            <View key={`${entry.id}-${i}`} style={[styles.item, { borderLeftColor: color }]}>
              <View style={styles.itemHead}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={[styles.chip, { backgroundColor: color }]}>
                  <Text style={[styles.chipText, { color: textOn(color) }]}>{safeGroupShort(item.groupId)}</Text>
                </View>
              </View>
              {item.misplaced ? <Text style={styles.warn}>Đang nằm sai túi</Text> : null}
              {item.reason ? <Text style={styles.reason}>{item.reason}</Text> : null}
              {item.tip ? <Text style={styles.tip}>Mẹo: {item.tip}</Text> : null}
              {item.sellable ? <Text style={styles.tip}>Bán ve chai được</Text> : null}
              {item.hazardous ? <Text style={styles.hazard}>{hazardNote}</Text> : null}
            </View>
          );
        })}
      </ScrollView>
      <Pressable
        style={styles.removeBtn}
        onPress={() => {
          onRemove(entry.id);
          onClose();
        }}
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={16} color={theme.danger} />
        <Text style={styles.removeText}>Bỏ ảnh này</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: theme.radius,
    backgroundColor: theme.card,
    maxHeight: 320,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, fontSize: 16, fontWeight: '800', color: theme.text },
  closeBtn: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  scroll: { marginTop: 8 },
  scrollBody: { paddingBottom: 4 },
  item: { marginBottom: 10, paddingLeft: 10, borderLeftWidth: 4 },
  itemHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  name: { fontSize: 16, fontWeight: '800', color: theme.text },
  chip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  chipText: { fontSize: 13, fontWeight: '800' },
  reason: { marginTop: 4, fontSize: 14, lineHeight: 20, color: theme.text },
  tip: { marginTop: 4, fontSize: 14, lineHeight: 20, color: theme.textDim },
  warn: { marginTop: 4, fontSize: 13, fontWeight: '800', color: theme.warn },
  hazard: { marginTop: 4, fontSize: 14, lineHeight: 20, fontWeight: '700', color: theme.danger },
  removeBtn: { minHeight: 48, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 8 },
  removeText: { fontSize: 14, fontWeight: '700', color: theme.danger },
});

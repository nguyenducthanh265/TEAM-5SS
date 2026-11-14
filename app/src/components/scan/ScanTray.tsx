// Khay đáy cuộn ngang: mỗi ảnh một thẻ. Thẻ chỉ có nhãn nhóm khi AI thật đã trả kết quả.
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  errorText,
  hasHazard,
  misplacedCount,
  safeGroupColor,
  safeGroupShort,
  textOn,
} from '@/components/scan/labels';
import type { ScanEntry } from '@/lib/contracts';
import { theme } from '@/lib/theme';

type Props = {
  entries: ScanEntry[];
  onOpen: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
};

type CardProps = {
  entry: ScanEntry;
  onOpen: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
};

const CARD_W = 180;

function Card({ entry, onOpen, onRetry, onRemove }: CardProps) {
  const first = entry.items.length > 0 ? entry.items[0] : undefined;

  if (entry.status === 'pending') {
    return (
      <View style={[styles.card, styles.cardPending]}>
        <Image source={{ uri: entry.uri }} style={styles.thumb} />
        <View style={styles.body}>
          <View style={styles.row}>
            <ActivityIndicator size="small" color={theme.forest} />
            <Text style={styles.pendingText}>đang soi…</Text>
          </View>
        </View>
      </View>
    );
  }

  if (entry.status === 'error') {
    return (
      <View style={[styles.card, styles.cardError]}>
        <Image source={{ uri: entry.uri }} style={styles.thumb} />
        <View style={styles.body}>
          <Text style={styles.errorTitle}>
            Chưa phân tích được
          </Text>
          <Text style={styles.dim}>
            {errorText(entry.errorKind)}
          </Text>
          <View style={styles.actions}>
            <Pressable
              style={styles.retryBtn}
              onPress={() => onRetry(entry.id)}
              accessibilityRole="button"
            >
              <Ionicons name="refresh" size={14} color={theme.primaryText} />
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => onRemove(entry.id)} accessibilityRole="button" accessibilityLabel="Bỏ ảnh này">
              <Ionicons name="close-circle" size={24} color={theme.textDim} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (!first) {
    return (
      <View style={[styles.card, styles.cardPending]}>
        <Image source={{ uri: entry.uri }} style={styles.thumb} />
        <View style={styles.body}>
          <Text style={styles.emptyText}>
            Chưa thấy rõ món, chụp lại gần hơn
          </Text>
          <Pressable style={styles.dropBtn} onPress={() => onRemove(entry.id)} accessibilityRole="button" hitSlop={6}>
            <Text style={styles.dropText}>Bỏ ảnh</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const color = safeGroupColor(first.groupId);
  const wrong = entry.mode === 'bag' ? misplacedCount(entry.items) : 0;
  const more = entry.items.length - 1;
  return (
    <Pressable
      style={[styles.card, { borderColor: color, borderWidth: 3 }]}
      onPress={() => onOpen(entry.id)}
      accessibilityRole="button"
      accessibilityLabel={`${first.name}, ${safeGroupShort(first.groupId)}. Chạm để xem lý do`}
    >
      <Image source={{ uri: entry.uri }} style={styles.thumbDone} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {first.name}
          {more > 0 ? ` +${more}` : ''}
        </Text>
        <View style={[styles.chip, { backgroundColor: color }]}>
          <Text style={[styles.chipText, { color: textOn(color) }]}>
            {safeGroupShort(first.groupId)}
          </Text>
        </View>
        {wrong > 0 ? (
          <View style={styles.badgeWarn}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {wrong} món sai túi
            </Text>
          </View>
        ) : null}
        {hasHazard(entry.items) ? (
          <View style={styles.badgeDanger}>
            <Ionicons name="warning" size={12} color="#FFFFFF" />
            <Text style={styles.badgeText} numberOfLines={1}>
              Nguy hại
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function ScanTray({ entries, onOpen, onRetry, onRemove }: Props) {
  if (entries.length === 0) {
    return (
      <View style={styles.hintWrap}>
        <Text style={styles.hint}>Đưa món rác vào giữa khung rồi bấm chụp</Text>
      </View>
    );
  }
  // Ảnh mới nhất nằm đầu khay để luôn nhìn thấy thẻ vừa chụp.
  const data = [...entries].reverse();
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => <Card entry={item} onOpen={onOpen} onRetry={onRetry} onRemove={onRemove} />}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      style={styles.tray}
    />
  );
}

const styles = StyleSheet.create({
  tray: { flexGrow: 0 },
  list: { paddingHorizontal: 12, alignItems: 'flex-end' },
  hintWrap: { paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  hint: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  card: {
    width: CARD_W,
    marginHorizontal: 4,
    borderRadius: 14,
    backgroundColor: theme.card,
    overflow: 'hidden',
  },
  cardPending: { borderWidth: 1, borderColor: theme.border },
  cardError: { borderWidth: 2, borderColor: theme.danger },
  thumb: { width: '100%', height: 64, backgroundColor: theme.border },
  thumbDone: { width: '100%', height: 60, backgroundColor: theme.border },
  body: { padding: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  pendingText: { marginLeft: 8, fontSize: 14, color: theme.textDim, fontWeight: '600' },
  name: { fontSize: 14, fontWeight: '800', color: theme.text },
  chip: { marginTop: 4, alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '800' },
  badgeWarn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: theme.warn,
  },
  badgeDanger: {
    marginTop: 4,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: theme.danger,
  },
  badgeText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  errorTitle: { fontSize: 13, fontWeight: '800', color: theme.danger },
  dim: { marginTop: 2, fontSize: 12, color: theme.textDim },
  actions: { marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  retryBtn: {
    minHeight: 48,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.primary,
  },
  retryText: { color: theme.primaryText, fontSize: 13, fontWeight: '800' },
  iconBtn: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, lineHeight: 17, color: theme.text, fontWeight: '600' },
  dropBtn: {
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
  },
  dropText: { fontSize: 12, fontWeight: '700', color: theme.textDim },
});

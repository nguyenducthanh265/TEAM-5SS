import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GroupPickerSheet } from '@/components/review/GroupPickerSheet';
import { ReviewItemCard } from '@/components/review/ReviewItemCard';
import { runWithSaveLock } from '@/components/review/saveLock';
import type { ScanEntry } from '@/lib/contracts';
import { postGroupScore } from '@/lib/groupApi';
import { MAX_ITEMS_PER_DAY, XP_PER_ITEM } from '@/lib/progress';
import type { ReviewItem } from '@/lib/progress';
import { claimProgress } from '@/lib/rewardsApi';
import { UNKNOWN_GROUP } from '@/lib/rules';
import { remove } from '@/lib/scanQueue';
import { getSessionEntries } from '@/lib/session';
import { getDeviceId, getGroupCode, saveSession } from '@/lib/store';
import { theme } from '@/lib/theme';
import { canSaveReview, correctReviewItem } from '@/lib/presentation';

// Bản sao cục bộ của phiên quét: items mang thêm cờ removed/corrected của màn này.
type ReviewEntry = Omit<ScanEntry, 'items'> & { items: ReviewItem[] };

interface Row {
  key: string;
  entryId: string;
  index: number;
  uri: string;
  item: ReviewItem;
}

function loadEntries(): ReviewEntry[] {
  return getSessionEntries()
    .filter((e) => e.status === 'done')
    .map((e) => ({
      ...e,
      items: e.items.map((it) => ({ ...it, removed: false, corrected: false })),
    }));
}

export default function ReviewScreen(): React.JSX.Element {
  const router = useRouter();
  const [hasPending] = useState(() => getSessionEntries().some((entry) => entry.status === 'pending'));
  const [entries, setEntries] = useState<ReviewEntry[]>(loadEntries);
  const [picked, setPicked] = useState<{ entryId: string; index: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef<boolean>(false);
  const [saveError, setSaveError] = useState(false);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const e of entries) {
      e.items.forEach((item, index) => {
        if (item.removed === true) return;
        out.push({ key: `${e.id}:${index}`, entryId: e.id, index, uri: e.uri, item });
      });
    }
    return out;
  }, [entries]);

  const unknownCount = rows.filter((r) => r.item.groupId === UNKNOWN_GROUP.id).length;
  const needsConfirmation = !canSaveReview(rows.map(row => row.item));
  // Điểm món dự kiến (tối đa MAX_ITEMS_PER_DAY món/ngày). Điểm thật, gồm cả thưởng chuỗi, do server tính khi lưu.
  const expectedXp = Math.min(rows.length, MAX_ITEMS_PER_DAY) * XP_PER_ITEM;
  const pickedRow = picked
    ? rows.find((r) => r.entryId === picked.entryId && r.index === picked.index)
    : undefined;

  const updateItem = useCallback(
    (entryId: string, index: number, change: (item: ReviewItem) => ReviewItem) => {
      setEntries((prev) =>
        prev.map((e) => {
          if (e.id !== entryId) return e;
          const items = e.items.map((it, i) => (i === index ? change(it) : it));
          return { ...e, items, corrected: items.some((it) => it.corrected === true) };
        }),
      );
    },
    [],
  );

  const onPick = useCallback(
    (groupId: string) => {
      if (picked) {
        updateItem(picked.entryId, picked.index, (it) =>
          correctReviewItem(it, groupId),
        );
      }
      setPicked(null);
    },
    [picked, updateItem],
  );

  const onRemove = useCallback(() => {
    if (picked) {
      updateItem(picked.entryId, picked.index, (it) => ({ ...it, removed: true, corrected: false }));
    }
    setPicked(null);
  }, [picked, updateItem]);

  const goBackToScan = useCallback(() => {
    if (saving) return;
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/scan');
    }
  }, [router, saving]);

  const onSave = useCallback(async () => {
    if (saving || savingRef.current || hasPending || !canSaveReview(rows.map(row => row.item))) return;
    setSaving(true);
    setSaveError(false);
    try {
      await runWithSaveLock(savingRef, async () => {
        // Điểm và chuỗi do SERVER tính (chống gian lận). Không hỏi được server thì vẫn lưu ảnh nhưng KHÔNG cộng điểm giả.
        const reward = await claimProgress(await getDeviceId(), rows.length);
        const { gained } = await saveSession(entries, reward);
        if (reward === null) {
          Alert.alert('Chưa cộng được điểm', 'Mất kết nối máy chủ nên điểm chưa được tính. Các món đã được lưu trên máy.');
        }
        // Điểm nhóm: gửi nền, lỗi mạng bỏ qua, không chặn việc lưu trên máy.
        if (gained > 0) {
          const itemCount = rows.length;
          void (async () => {
            try {
              const code = await getGroupCode();
              if (!code) return;
              const deviceId = await getDeviceId();
              await postGroupScore(code, deviceId, gained, itemCount);
            } catch {
              // bỏ qua
            }
          })();
        }
        for (const entry of entries) remove(entry.id);
        router.replace({
          pathname: '/(tabs)/garden',
          params: {
            gained: String(gained),
            gainedBonus: String(reward?.gainedBonus ?? 0),
            gainedItems: String(reward?.gainedItems ?? 0),
            restored: reward?.restored === true ? '1' : '0',
          },
        });
      });
    } catch {
      setSaveError(true);
      setSaving(false);
    }
  }, [entries, hasPending, rows.length, router, saving]);

  const header = (
    <View style={styles.header}>
      <Pressable
        onPress={goBackToScan}
        disabled={saving}
        accessibilityState={{ disabled: saving }}
        accessibilityRole="button"
        accessibilityLabel="Quay lại Quét"
        hitSlop={12}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Text style={styles.backText}>‹ Quét</Text>
      </Pressable>
      <Text style={styles.title}>Kết quả phân loại</Text>
      <View style={styles.back} />
    </View>
  );

  if (rows.length === 0) {
    const hadItems = entries.length > 0;
    return (
      <SafeAreaView style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        {header}
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {hadItems ? 'Không còn món nào để lưu' : 'Chưa có món nào để xem lại'}
          </Text>
          <Text style={styles.emptyText}>Quét vài món rác rồi quay lại đây để lưu.</Text>
          <Pressable
            onPress={goBackToScan}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.primaryBtnText}>Quay lại Quét</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      {header}
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        numColumns={1}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.sub}>
              {rows.length} món · Bạn là người xác nhận cuối cùng. Chạm “Sửa” nếu cần đổi nhóm.
            </Text>
            {hasPending ? (
              <Text style={styles.error} accessibilityRole="alert">
                Còn ảnh đang phân loại. Quay lại Quét, chờ xong rồi mở Xem lại để lưu đủ các món.
              </Text>
            ) : null}
            {unknownCount > 0 ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  {unknownCount} món AI chưa chắc. Chạm vào món có viền cam để chọn nhóm bằng tay.
                </Text>
              </View>
            ) : null}
            {needsConfirmation && unknownCount === 0 ? <Text style={styles.error}>Món nguy hại cần xác nhận nhóm Còn lại và chuyển giao riêng. Chạm “Sửa” để xác nhận.</Text> : null}
          </View>
        }
        renderItem={({ item: row }) => (
          <View style={[styles.cell, styles.fullCell]}>
            <ReviewItemCard
              uri={row.uri}
              item={row.item}
              onPress={() => { if (!saving) setPicked({ entryId: row.entryId, index: row.index }); }}
            />
          </View>
        )}
      />
      <View style={styles.footer}>
        {saveError ? (
          <Text style={styles.error} accessibilityRole="alert">Chưa lưu được. Bấm lại để thử lần nữa.</Text>
        ) : null}
        <Pressable
          onPress={onSave}
          disabled={saving || hasPending || needsConfirmation}
          accessibilityState={{ disabled: saving || hasPending || needsConfirmation, busy: saving }}
          accessibilityLabel={saving ? 'Đang lưu phiên quét' : `Lưu và nuôi cây, dự kiến ${expectedXp} XP`}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.primaryBtn,
            (pressed || saving || hasPending || needsConfirmation) && styles.pressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator color={theme.primaryText} />
          ) : (
            <Text style={styles.primaryBtnText}>
              Lưu & Nuôi cây · +{expectedXp} XP
            </Text>
          )}
        </Pressable>
      </View>
      <GroupPickerSheet
        visible={pickedRow !== undefined}
        itemName={pickedRow ? pickedRow.item.name : ''}
        currentGroupId={pickedRow ? pickedRow.item.groupId : ''}
        hazardous={pickedRow?.item.hazardous}
        onPick={onPick}
        onRemove={onRemove}
        onClose={() => setPicked(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.pad,
    paddingVertical: 10,
  },
  back: {
    minWidth: 64,
    minHeight: 48,
    justifyContent: 'center',
  },
  backText: {
    color: theme.forest,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    flexShrink: 1,
    textAlign: 'center',
    color: theme.text,
    fontSize: 20,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: theme.pad,
    paddingBottom: 16,
    gap: 12,
  },
  listHeader: {
    gap: 10,
  },
  column: {
    gap: 12,
  },
  cell: {
    flex: 1,
    maxWidth: '50%',
  },
  fullCell: { maxWidth: '100%' },
  sub: {
    color: theme.textDim,
    fontSize: 14,
  },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.warn,
    backgroundColor: theme.card,
    padding: 10,
  },
  noticeText: {
    color: theme.text,
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: theme.pad,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.bg,
  },
  error: {
    color: theme.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  primaryBtn: {
    minHeight: 56,
    borderRadius: theme.radius,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    color: theme.primaryText,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  emptyTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    color: theme.textDim,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
});

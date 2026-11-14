import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GroupBars } from '@/components/stats/GroupBars';
import { TeamCard } from '@/components/stats/TeamCard';
import type { SavedItem } from '@/lib/contracts';
import { dayKey } from '@/lib/progress';
import { getGroups } from '@/lib/rules';
import { getHistory, getSampleMode, setSampleMode } from '@/lib/store';
import { theme } from '@/lib/theme';

const HISTORY_DAYS = 30;

// Món mẫu chỉ để xem bố cục khi bật công tắc "Dữ liệu mẫu". Không ghi vào kho, không trộn với dữ liệu thật.
const SAMPLE_COUNTS = [6, 4, 2];

function buildSampleItems(): SavedItem[] {
  const now = new Date();
  const day = dayKey(now);
  const savedAt = now.getTime();
  const out: SavedItem[] = [];
  getGroups().forEach((g, gi) => {
    const n = SAMPLE_COUNTS[gi % SAMPLE_COUNTS.length] ?? 1;
    for (let i = 0; i < n; i += 1) {
      out.push({
        name: `Món mẫu ${out.length + 1}`,
        groupId: g.id,
        day,
        savedAt,
        corrected: i === 0,
        hazardous: false,
        sellable: gi === 0 && i < 3,
      });
    }
  });
  return out;
}

export default function StatsScreen(): React.JSX.Element {
  const router = useRouter();
  const navigation = useNavigation();
  const [history, setHistory] = useState<SavedItem[]>([]);
  const [sample, setSample] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setRefreshKey((k) => k + 1);
      void (async () => {
        try {
          const [items, sampleOn] = await Promise.all([getHistory(HISTORY_DAYS), getSampleMode()]);
          if (!alive) return;
          setHistory(items);
          setSample(sampleOn);
        } catch {
          if (!alive) return;
          setHistory([]);
        } finally {
          if (alive) setLoaded(true);
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const onToggleSample = useCallback((on: boolean) => {
    setSample(on);
    setSampleMode(on).catch(() => undefined);
  }, []);

  const items = sample ? buildSampleItems() : history;
  const total = items.length;
  const corrected = items.filter((it) => it.corrected).length;
  const sellable = items.filter((it) => it.sellable).length;
  const isEmpty = loaded && total === 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <Text style={styles.title}>Thống kê</Text>
          {sample ? (
            <View style={styles.sampleTag}>
              <Text style={styles.sampleTagText}>Dữ liệu mẫu</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.sub}>{HISTORY_DAYS} ngày gần nhất</Text>

        {sample ? (
          <View style={styles.sampleBanner}>
            <Text style={styles.sampleBannerText}>
              Đang xem dữ liệu mẫu để thử bố cục. Đây không phải số liệu của bạn.
            </Text>
          </View>
        ) : null}

        {isEmpty ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>Chưa có lượt quét nào</Text>
            <Text style={styles.text}>Quét và lưu vài món rác, số liệu sẽ hiện ở đây.</Text>
            <Pressable
              onPress={() => router.navigate('/(tabs)/scan')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            >
              <Text style={styles.primaryBtnText}>Sang Quét</Text>
            </Pressable>
          </View>
        ) : null}

        {loaded && total > 0 ? (
          <>
            <View style={styles.tiles}>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>{total}</Text>
                <Text style={styles.tileLabel}>Tổng món</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>{corrected}</Text>
                <Text style={styles.tileLabel}>Đã tự sửa nhãn</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>{sellable}</Text>
                <Text style={styles.tileLabel}>Bán ve chai được</Text>
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Số món theo nhóm</Text>
              <GroupBars items={items} />
            </View>
          </>
        ) : null}

        <TeamCard refreshKey={refreshKey} />

        <View style={[styles.card, styles.switchRow]}>
          <View style={styles.switchText}>
            <Text style={styles.cardTitle}>Dữ liệu mẫu</Text>
            <Text style={styles.text}>Chỉ để xem thử bố cục. Không ảnh hưởng điểm của bạn.</Text>
          </View>
          <Switch
            value={sample}
            onValueChange={onToggleSample}
            trackColor={{ true: theme.primary, false: theme.border }}
            accessibilityLabel="Bật dữ liệu mẫu"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    padding: theme.pad,
    paddingBottom: 32,
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: theme.text,
    fontSize: 26,
    fontWeight: '700',
  },
  sub: {
    color: theme.textDim,
    fontSize: 14,
    marginTop: -8,
  },
  sampleTag: {
    backgroundColor: theme.warn,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sampleTagText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '700',
  },
  sampleBanner: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.warn,
    backgroundColor: theme.card,
    padding: 10,
  },
  sampleBannerText: {
    color: theme.text,
    fontSize: 14,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: theme.pad,
    gap: 12,
  },
  cardTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '700',
  },
  text: {
    color: theme.textDim,
    fontSize: 14,
  },
  emptyTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  primaryBtn: {
    minHeight: 52,
    borderRadius: theme.radius,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: theme.primaryText,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
  tiles: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  tileValue: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '700',
  },
  tileLabel: {
    color: theme.textDim,
    fontSize: 12,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {
    flex: 1,
    gap: 4,
  },
});

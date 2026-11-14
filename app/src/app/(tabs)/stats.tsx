import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GroupBars } from '@/components/stats/GroupBars';
import { TeamCard } from '@/components/stats/TeamCard';
import { GroupIcon } from '@/components/ui/Elements';
import type { SavedItem } from '@/lib/contracts';
import { dayKey } from '@/lib/progress';
import { getGroups, groupShort } from '@/lib/rules';
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
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [sampleError, setSampleError] = useState(false);
  const [days, setDays] = useState(7);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoaded(false);
      setLoadError(false);
      setRefreshKey((k) => k + 1);
      void (async () => {
        try {
          const [items, sampleOn] = await Promise.all([getHistory(days), getSampleMode()]);
          if (!alive) return;
          setHistory(items);
          setSample(sampleOn);
        } catch {
          if (!alive) return;
          setLoadError(true);
        } finally {
          if (alive) setLoaded(true);
        }
      })();
      return () => {
        alive = false;
      };
    }, [reloadKey, days]),
  );

  const onToggleSample = useCallback((on: boolean) => {
    setSampleError(false);
    setSampleMode(on).then(() => setSample(on)).catch(() => setSampleError(true));
  }, []);

  const items = sample ? buildSampleItems() : history;
  const total = items.length;
  const corrected = items.filter((it) => it.corrected).length;
  const sellable = items.filter((it) => it.sellable).length;
  const isEmpty = loaded && !loadError && total === 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <Text style={styles.title}>Nhỏ mỗi ngày.{ '\n' }Nhiều điều thay đổi.</Text>
          {sample ? (
            <View style={styles.sampleTag}>
              <Text style={styles.sampleTagText}>Dữ liệu mẫu</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.sub}>Mỗi lần đặt đúng chỗ đều đáng được ghi nhận.</Text>
        <View style={styles.rangeRow}>{[{value:7,label:'7 ngày gần đây'},{value:0,label:'Tất cả'}].map(option=><Pressable key={option.value} accessibilityRole="button" accessibilityState={{selected:days===option.value}} onPress={()=>setDays(option.value)} style={[styles.rangeButton,days===option.value&&styles.rangeSelected]}><Text style={styles.rangeText}>{option.label}</Text></Pressable>)}</View>
        {!loaded ? <ActivityIndicator color={theme.forest} accessibilityLabel="Đang tải thống kê" /> : null}
        {loadError ? (
          <View style={styles.card}>
            <Text style={styles.error} accessibilityRole="alert">Chưa đọc được lịch sử đã lưu.</Text>
            <Pressable style={styles.primaryBtn} accessibilityRole="button" onPress={() => setReloadKey((key) => key + 1)}>
              <Text style={styles.primaryBtnText}>Tải lại thống kê</Text>
            </Pressable>
          </View>
        ) : null}

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

        {loaded && !loadError && total > 0 ? (
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
        {loaded&&!loadError&&items.length>0?<View style={{gap:12}}><Text style={styles.cardTitle}>Nhật ký phân loại</Text>{[...items].reverse().slice(0,30).map((item,index)=><View style={styles.historyRow} key={`${item.savedAt}-${index}`}><GroupIcon id={item.groupId}/><View style={{flex:1}}><Text style={styles.historyName}>{item.name}</Text><Text style={styles.text}>{groupShort(item.groupId)}{sample?' · Mẫu':` · ${item.day}`}{item.corrected?' · Đã sửa':''}</Text></View></View>)}</View>:null}

        <View style={[styles.card, styles.switchRow]}>
          <View style={styles.switchText}>
            <Text style={styles.cardTitle}>Dữ liệu mẫu</Text>
            <Text style={styles.text}>Chỉ để xem thử bố cục. Không ảnh hưởng điểm của bạn.</Text>
            {sampleError ? <Text style={styles.error} accessibilityRole="alert">Chưa lưu được chế độ xem. Thử lại.</Text> : null}
          </View>
          <Switch
            value={sample}
            onValueChange={onToggleSample}
            trackColor={{ true: theme.forest, false: theme.border }}
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
    flexWrap: 'wrap',
  },
  title: {
    color: theme.text,
    fontSize: 31,
    lineHeight: 39,
    letterSpacing: -1,
    fontWeight: '700',
  },
  sub: {
    color: theme.textDim,
    fontSize: 14,
    marginTop: -8,
  },
  rangeRow:{flexDirection:'row',backgroundColor:theme.soft,padding:4,borderRadius:15,gap:4},rangeButton:{flex:1,minHeight:48,borderRadius:12,alignItems:'center',justifyContent:'center',padding:8},rangeSelected:{backgroundColor:theme.card},rangeText:{fontSize:13,fontWeight:'600',color:theme.text},historyRow:{flexDirection:'row',gap:12,paddingVertical:13,borderBottomWidth:1,borderBottomColor:theme.border,alignItems:'center'},historyName:{fontSize:14,lineHeight:22,fontWeight:'600',color:theme.text},
  sampleTag: {
    backgroundColor: theme.warn,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sampleTagText: {
    color: theme.primaryText,
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
  error: { color: theme.danger, fontSize: 14 },
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

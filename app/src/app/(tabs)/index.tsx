import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TreeIllustration } from '@/components/tree/TreeIllustration';
import type { Progress } from '@/lib/contracts';
import { EMPTY_PROGRESS, dayKey } from '@/lib/progress';
import { getProgress, getSampleMode } from '@/lib/store';
import { theme } from '@/lib/theme';
import { isThirsty, nextThreshold, stageFor } from '@/lib/tree';

const XP_COUNT_DURATION_MS = 500;

function parseGained(raw: string | string[] | undefined): number {
  const val = Array.isArray(raw) ? raw[0] : raw;
  if (!val) return 0;
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export default function TreeScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ gained?: string | string[] }>();

  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [displayXp, setDisplayXp] = useState(0);
  const [sample, setSample] = useState(false);
  const [wateringKey, setWateringKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const countTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gainedRef = useRef(0);
  gainedRef.current = parseGained(params.gained);

  const stopCountAnimation = useCallback(() => {
    if (countTimerRef.current !== null) {
      clearInterval(countTimerRef.current);
      countTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCountAnimation();
    };
  }, [stopCountAnimation]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      setLoadError(false);
      const pendingGained = gainedRef.current;

      if (pendingGained > 0) {
        router.setParams({ gained: undefined });
      }

      void (async () => {
        try {
          const [nextProgress, sampleOn] = await Promise.all([getProgress(), getSampleMode()]);
          if (!alive) return;

          setProgress(nextProgress);
          setSample(sampleOn);
          stopCountAnimation();

          if (pendingGained > 0) {
            const endXp = nextProgress.xp;
            const startXp = Math.max(0, endXp - pendingGained);
            setDisplayXp(startXp);
            setWateringKey((k) => k + 1);

            const startedAt = Date.now();
            countTimerRef.current = setInterval(() => {
              const elapsed = Date.now() - startedAt;
              const ratio = Math.min(1, elapsed / XP_COUNT_DURATION_MS);
              const nextVal = Math.round(startXp + (endXp - startXp) * ratio);
              setDisplayXp(nextVal);
              if (ratio >= 1) {
                stopCountAnimation();
              }
            }, 25);
          } else {
            setDisplayXp(nextProgress.xp);
          }
        } catch {
          if (!alive) return;
          setLoadError(true);
        } finally {
          if (alive) setLoading(false);
        }
      })();

      return () => {
        alive = false;
        stopCountAnimation();
      };
    }, [reloadKey, router, stopCountAnimation]),
  );

  const stage = stageFor(displayXp);
  const nextXp = nextThreshold(displayXp);
  const thirsty = isThirsty(progress, dayKey(new Date()));
  const progressRatio =
    nextXp === null
      ? 1
      : Math.max(0, Math.min(1, (displayXp - stage.minXp) / Math.max(1, nextXp - stage.minXp)));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Cây EcoHanoi</Text>
          {sample ? (
            <View style={styles.sampleTag}>
              <Text style={styles.sampleTagText}>Dữ liệu mẫu</Text>
            </View>
          ) : null}
        </View>

        {loading ? <ActivityIndicator color={theme.primary} accessibilityLabel="Đang tải tiến độ cây" /> : null}
        {loadError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText} accessibilityRole="alert">Chưa đọc được tiến độ đã lưu. Thử tải lại trước khi xem điểm.</Text>
            <Pressable accessibilityRole="button" style={styles.retryBtn} onPress={() => setReloadKey((key) => key + 1)}>
              <Text style={styles.stageBadgeText}>Tải lại tiến độ</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !loadError ? <>
        <View style={styles.treeCard}>
          <View style={styles.stageBadgeRow}>
            <View style={styles.stageBadge}>
              <Ionicons name="leaf" size={14} color={theme.primary} />
              <Text style={styles.stageBadgeText}>{stage.name}</Text>
            </View>
            <View style={[styles.statusPill, thirsty ? styles.thirstyPill : styles.hydratedPill]}>
              <Ionicons
                name={thirsty ? 'water-outline' : 'checkmark-circle'}
                size={14}
                color={thirsty ? theme.warn : theme.primary}
              />
              <Text style={[styles.statusText, thirsty ? styles.thirstyText : styles.hydratedText]}>
                {thirsty ? 'Khát nước' : 'Đã tưới hôm nay'}
              </Text>
            </View>
          </View>

          <TreeIllustration stageId={stage.id} thirsty={thirsty} wateringKey={wateringKey} />

          <Text style={styles.thirstHint}>
            {thirsty ? 'Quét và lưu 1 món hôm nay để tưới cây' : 'Tuyệt vời! Cây đang xanh tốt'}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{displayXp} XP</Text>
            <Text style={styles.statLabel}>
              {nextXp === null ? 'Cấp cao nhất' : `Mốc kế: ${nextXp} XP`}
            </Text>
            <View style={styles.barTrack} accessibilityRole="progressbar" accessibilityLabel="Tiến độ cấp cây" accessibilityValue={{ min: 0, max: 100, now: Math.round(progressRatio * 100) }}>
              <View style={[styles.barFill, { width: `${Math.round(progressRatio * 100)}%` }]} />
            </View>
          </View>

          <View style={styles.streakCard}>
            <View style={styles.streakTop}>
              <Ionicons name="flame" size={20} color={theme.warn} />
              <Text style={styles.statValue}>{progress.streakDays}</Text>
            </View>
            <Text style={styles.statLabel}>Chuỗi ngày</Text>
          </View>
        </View>
        </> : null}

        <Pressable
          onPress={() => router.navigate('/(tabs)/scan')}
          accessibilityRole="button"
          accessibilityLabel="Quét rác"
          style={({ pressed }) => [styles.scanBtn, pressed && styles.scanBtnPressed]}
        >
          <Ionicons name="camera" size={24} color={theme.primaryText} />
          <Text style={styles.scanBtnText}>QUÉT RÁC</Text>
        </Pressable>
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
    gap: 16,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
  },
  sampleTag: {
    backgroundColor: '#FFF3E0',
    borderColor: theme.warn,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sampleTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.warn,
  },
  treeCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: theme.pad,
    alignItems: 'center',
    gap: 12,
  },
  stageBadgeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  stageBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.primary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  thirstyPill: {
    backgroundColor: '#FFF4E5',
  },
  hydratedPill: {
    backgroundColor: '#E8F5ED',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  thirstyText: {
    color: theme.warn,
  },
  hydratedText: {
    color: theme.primary,
  },
  thirstHint: {
    fontSize: 13,
    color: theme.textDim,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  errorCard: { padding: 12, backgroundColor: theme.card, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.danger },
  errorText: { color: theme.danger, fontSize: 14 },
  retryBtn: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 8 },
  statCard: {
    flex: 2,
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: theme.pad,
    gap: 6,
  },
  streakCard: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: theme.pad,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  streakTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.textDim,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E6ECE4',
    overflow: 'hidden',
    marginTop: 2,
  },
  barFill: {
    height: '100%',
    backgroundColor: theme.primary,
    borderRadius: 4,
  },
  scanBtn: {
    backgroundColor: theme.primary,
    borderRadius: theme.radius,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scanBtnPressed: {
    opacity: 0.88,
  },
  scanBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.primaryText,
    letterSpacing: 0.5,
  },
});

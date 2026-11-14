import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RewardState } from '@/lib/contracts';
import { theme } from '@/lib/theme';
import { buildStreakViewModel } from './streakViewModel';

export interface StreakCardProps {
  reward: RewardState | null;
}

export function StreakCard({ reward }: StreakCardProps): React.JSX.Element {
  const vm = buildStreakViewModel(reward);

  if (vm.offline) {
    return (
      <View style={styles.offlineCard} accessibilityRole="text">
        <Ionicons name="cloud-offline-outline" size={18} color={theme.textDim} />
        <Text style={styles.offlineText}>{vm.offlineText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {vm.restoreBanner ? (
        <View style={styles.restoreBanner} accessibilityRole="alert">
          <Ionicons name="refresh-circle-outline" size={20} color={theme.warn} />
          <Text style={styles.restoreText}>{vm.restoreBanner}</Text>
        </View>
      ) : null}

      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Ionicons name="flame-outline" size={18} color={theme.forest} />
          <Text style={styles.todayText}>{vm.todayText}</Text>
        </View>
        <Text style={styles.nextBonusText}>{vm.nextBonusText}</Text>
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityLabel={vm.todayText}
        accessibilityValue={{ min: 0, max: 100, now: vm.progressPercent }}
      >
        <View style={[styles.fill, { width: `${vm.progressPercent}%` }]} />
      </View>

      <View style={styles.daysRow}>
        {vm.days.map((cell) => (
          <View
            key={cell.day}
            style={[styles.dayCell, cell.active && styles.dayCellActive]}
            accessibilityLabel={`Ngày ${cell.day}${cell.bonus !== null ? `, +${cell.bonus} XP` : ''}${cell.active ? ', hiện tại' : ''}`}
          >
            <Text style={[styles.dayLabel, cell.active && styles.dayLabelActive]}>
              N{cell.day}
            </Text>
            {cell.bonus !== null ? (
              <Text style={[styles.dayBonus, cell.active && styles.dayBonusActive]}>
                +{cell.bonus}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 15,
    gap: 12,
  },
  offlineCard: {
    backgroundColor: theme.soft,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  offlineText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: theme.textDim,
  },
  restoreBanner: {
    backgroundColor: '#FFF5E5',
    borderRadius: 12,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  restoreText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: theme.warn,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  todayText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: theme.text,
    flexShrink: 1,
  },
  nextBonusText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    color: theme.forest,
    backgroundColor: theme.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  track: {
    height: 7,
    borderRadius: 7,
    backgroundColor: theme.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.forest,
    borderRadius: 7,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 5,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
    gap: 2,
  },
  dayCellActive: {
    backgroundColor: theme.forest,
    borderColor: theme.forest,
  },
  dayLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    color: theme.textDim,
  },
  dayLabelActive: {
    color: theme.forestDim,
  },
  dayBonus: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    color: theme.text,
  },
  dayBonusActive: {
    color: theme.primary,
  },
});

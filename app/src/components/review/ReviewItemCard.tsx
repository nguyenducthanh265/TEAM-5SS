import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ReviewItem } from '@/lib/progress';
import { UNKNOWN_GROUP, groupColor, groupShort } from '@/lib/rules';
import { theme } from '@/lib/theme';

export function groupLabel(groupId: string): { short: string; color: string } {
  if (groupId === UNKNOWN_GROUP.id) {
    return { short: UNKNOWN_GROUP.short, color: UNKNOWN_GROUP.color_hex };
  }
  return { short: groupShort(groupId), color: groupColor(groupId) };
}

interface Props {
  uri: string;
  item: ReviewItem;
  onPress: () => void;
}

export function ReviewItemCard({ uri, item, onPress }: Props): React.JSX.Element {
  const label = groupLabel(item.groupId);
  const needsPick = item.groupId === UNKNOWN_GROUP.id;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${label.short}. Chạm để sửa nhóm`}
      style={({ pressed }) => [
        styles.card,
        needsPick && styles.cardNeedsPick,
        pressed && styles.pressed,
      ]}
    >
      <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.groupRow}>
          <View style={[styles.dot, { backgroundColor: label.color }]} />
          <Text style={styles.groupText}>
            {label.short}
          </Text>
        </View>
        <View style={styles.badges}>
          {item.corrected === true ? <Text style={styles.badge}>Đã sửa</Text> : null}
          {item.misplaced === true ? <Text style={styles.badge}>Sai túi</Text> : null}
          {needsPick ? <Text style={[styles.badge, styles.badgeWarn]}>Chọn nhóm</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  cardNeedsPick: {
    borderColor: theme.warn,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  thumb: {
    width: '100%',
    aspectRatio: 1.3,
    backgroundColor: theme.border,
  },
  body: {
    padding: 10,
    gap: 6,
  },
  name: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  groupText: {
    flex: 1,
    color: theme.textDim,
    fontSize: 13,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    fontSize: 11,
    color: theme.textDim,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  badgeWarn: {
    color: theme.warn,
    borderColor: theme.warn,
  },
});

import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { getGroups } from '@/lib/rules';
import { theme } from '@/lib/theme';

interface Props {
  visible: boolean;
  itemName: string;
  currentGroupId: string;
  onPick: (groupId: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

/** Bảng chọn lại nhóm cho một món. Danh sách nhóm lấy từ file luật. */
export function GroupPickerSheet({
  visible,
  itemName,
  currentGroupId,
  onPick,
  onRemove,
  onClose,
}: Props): React.JSX.Element {
  const groups = getGroups();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Đóng" />
        <View style={styles.sheet}>
          <Text style={styles.title} numberOfLines={2}>
            {itemName}
          </Text>
          <Text style={styles.hint}>Món này thuộc nhóm nào?</Text>
          {groups.map((g) => {
            const selected = g.id === currentGroupId;
            return (
              <Pressable
                key={g.id}
                onPress={() => onPick(g.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.optionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.dot, { backgroundColor: g.color_hex }]} />
                <View style={styles.optionText}>
                  <Text style={styles.optionShort}>{g.short}</Text>
                  <Text style={styles.optionName} numberOfLines={2}>
                    {g.name}
                  </Text>
                </View>
                {selected ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            );
          })}
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
          >
            <Text style={styles.removeText}>Bỏ món này</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Text style={styles.closeText}>Đóng</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.pad,
    paddingBottom: 28,
    gap: 10,
  },
  title: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  hint: {
    color: theme.textDim,
    fontSize: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
  },
  optionSelected: {
    borderColor: theme.primary,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  optionText: {
    flex: 1,
  },
  optionShort: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
  },
  optionName: {
    color: theme.textDim,
    fontSize: 12,
  },
  check: {
    color: theme.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  remove: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.danger,
  },
  removeText: {
    color: theme.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  close: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: theme.textDim,
    fontSize: 15,
  },
});

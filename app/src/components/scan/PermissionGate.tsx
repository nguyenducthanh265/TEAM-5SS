// Màn giải thích khi chưa có quyền camera: nói rõ vì sao cần, cho xin lại hoặc mở Cài đặt.
import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/lib/theme';

type Props = {
  canAskAgain: boolean;
  onAsk: () => void;
};

export function PermissionGate({ canAskAgain, onAsk }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="camera-outline" size={56} color={theme.primary} />
      <Text style={styles.title}>Cần quyền camera để quét rác</Text>
      <Text style={styles.body}>
        Ảnh chỉ gửi lên máy chủ để AI xem món rác thuộc nhóm nào, không lưu lại.
      </Text>
      {canAskAgain ? (
        <Pressable style={styles.primaryBtn} onPress={onAsk} accessibilityRole="button">
          <Text style={styles.primaryText}>Cho phép camera</Text>
        </Pressable>
      ) : null}
      <Pressable
        style={canAskAgain ? styles.ghostBtn : styles.primaryBtn}
        onPress={() => {
          Linking.openSettings().catch(() => undefined);
        }}
        accessibilityRole="button"
      >
        <Text style={canAskAgain ? styles.ghostText : styles.primaryText}>Mở Cài đặt</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  title: { marginTop: 16, fontSize: 20, fontWeight: '800', color: theme.text, textAlign: 'center' },
  body: { marginTop: 8, fontSize: 15, lineHeight: 22, color: theme.textDim, textAlign: 'center' },
  primaryBtn: {
    marginTop: 20,
    minWidth: 220,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: theme.radius,
    backgroundColor: theme.primary,
    alignItems: 'center',
  },
  primaryText: { color: theme.primaryText, fontSize: 16, fontWeight: '800' },
  ghostBtn: {
    marginTop: 12,
    minWidth: 220,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    alignItems: 'center',
  },
  ghostText: { color: theme.text, fontSize: 16, fontWeight: '700' },
});

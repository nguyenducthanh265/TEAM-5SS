import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';

export function Screen({ children }: React.PropsWithChildren): React.JSX.Element {
  return <SafeAreaView style={styles.root} edges={['top']}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>{children}</View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { flexGrow: 1, paddingBottom: 32 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: theme.pad, gap: 24 },
});

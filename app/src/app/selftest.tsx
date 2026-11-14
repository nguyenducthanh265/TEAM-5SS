// Deep link ecohanoi://selftest — chạy ĐÚNG luồng quét chính (prepareImageBase64 + classifyImage) trên ảnh đóng kèm.
// ml/scripts/demo_check.py tìm đúng một trong hai dòng log:
//   HACKCHECK SELFTEST PASS          chỉ khi AI thật trả kết quả, có >= 1 món và groupId thuộc file luật
//   HACKCHECK SELFTEST FAIL <lý do>  mọi trường hợp khác
// Không có nhánh giả: không mạng / server lỗi / fallback đều là FAIL.
import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { safeGroupColor, safeGroupShort, textOn } from '@/components/scan/labels';
import type { ClassifiedItem } from '@/lib/contracts';
import { isValidGroupId } from '@/lib/rules';
import { classifyImage, prepareImageBase64 } from '@/lib/scanQueue';
import { theme } from '@/lib/theme';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SAMPLE = require('../../assets/selftest.jpg') as number;

const WATCHDOG_MS = 35000; // demo_check chờ 40 giây: báo FAIL có lý do trước khi nó hết giờ

type Outcome =
  | { ok: true; items: ClassifiedItem[]; latencyMs: number }
  | { ok: false; reason: string };

function oneLine(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, 160);
}

async function runSelftest(): Promise<Outcome> {
  let uri: string;
  try {
    const asset = Asset.fromModule(SAMPLE);
    await asset.downloadAsync();
    uri = asset.localUri ?? asset.uri;
    if (!uri) return { ok: false, reason: 'asset-no-uri' };
  } catch (e) {
    return { ok: false, reason: oneLine(`asset-load ${String(e)}`) };
  }

  let base64: string;
  try {
    base64 = await prepareImageBase64(uri);
  } catch (e) {
    return { ok: false, reason: oneLine(`image-prepare ${String(e)}`) };
  }

  const result = await classifyImage(base64, 'item');
  if (result.kind !== 'ai') {
    return { ok: false, reason: oneLine(`kind=${result.kind} ${result.message}`) };
  }
  if (result.items.length === 0) {
    return { ok: false, reason: 'ai-no-items' };
  }
  const valid = result.items.every((i) => i.groupId !== 'unknown' && isValidGroupId(i.groupId));
  if (!valid) {
    return { ok: false, reason: 'ai-group-not-in-rules' };
  }
  return { ok: true, items: result.items, latencyMs: result.latencyMs };
}

function withWatchdog(p: Promise<Outcome>): Promise<Outcome> {
  return new Promise<Outcome>((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, reason: `watchdog-${WATCHDOG_MS}ms` }), WATCHDOG_MS);
    p.then(
      (o) => {
        clearTimeout(timer);
        resolve(o);
      },
      (e: unknown) => {
        clearTimeout(timer);
        resolve({ ok: false, reason: oneLine(`exception ${String(e)}`) });
      },
    );
  });
}

export default function SelftestScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [running, setRunning] = useState(true);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const started = useRef(false);
  const alive = useRef(true);

  const run = useCallback(() => {
    setRunning(true);
    setOutcome(null);
    withWatchdog(runSelftest()).then((o) => {
      // Dòng log là kết quả thật của lượt gọi AI vừa xong; in đúng một dòng cho mỗi lượt chạy.
      if (o.ok) console.log('HACKCHECK SELFTEST PASS');
      else console.log('HACKCHECK SELFTEST FAIL ' + o.reason);
      if (!alive.current) return;
      setOutcome(o);
      setRunning(false);
    });
  }, []);

  useEffect(() => {
    alive.current = true;
    if (!started.current) {
      started.current = true;
      run();
    }
    return () => {
      alive.current = false;
    };
  }, [run]);

  return (
    <View style={[styles.root, { paddingTop: 16, paddingBottom: insets.bottom + 16 }]}>
      <Text style={styles.title}>Tự kiểm luồng AI</Text>
      <Text style={styles.sub}>Gửi ảnh mẫu đóng kèm tới máy chủ, đúng như khi bạn chụp.</Text>

      {running ? (
        <View style={styles.box}>
          <ActivityIndicator size="large" color={theme.forest} />
          <Text style={styles.wait}>Đang gọi AI…</Text>
        </View>
      ) : null}

      {outcome && outcome.ok ? (
        <ScrollView style={styles.scroll}>
          <View style={[styles.box, styles.pass]}>
            <Text style={styles.passText}>ĐẠT — AI trả kết quả thật</Text>
            <Text style={styles.meta}>{Math.round(outcome.latencyMs)} ms</Text>
          </View>
          {outcome.items.map((item, i) => {
            const color = safeGroupColor(item.groupId);
            return (
              <View key={i} style={[styles.item, { borderLeftColor: color }]}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={[styles.chip, { backgroundColor: color }]}>
                  <Text style={[styles.chipText, { color: textOn(color) }]}>{safeGroupShort(item.groupId)}</Text>
                </View>
                {item.reason ? <Text style={styles.reason}>{item.reason}</Text> : null}
              </View>
            );
          })}
        </ScrollView>
      ) : null}

      {outcome && !outcome.ok ? (
        <View style={[styles.box, styles.fail]}>
          <Text style={styles.failText}>CHƯA ĐẠT</Text>
          <Text style={styles.reason}>{outcome.reason}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, running ? styles.btnOff : null]}
          disabled={running}
          onPress={run}
          accessibilityRole="button"
        >
          <Text style={styles.btnText}>Chạy lại</Text>
        </Pressable>
        <Pressable style={styles.ghost} onPress={() => router.replace('/')} accessibilityRole="button">
          <Text style={styles.ghostText}>Về trang chính</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: theme.pad },
  title: { fontSize: 22, fontWeight: '800', color: theme.text },
  sub: { marginTop: 4, fontSize: 14, color: theme.textDim },
  scroll: { flex: 1, marginTop: 4 },
  box: {
    marginTop: 16,
    padding: 16,
    borderRadius: theme.radius,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  wait: { marginTop: 10, fontSize: 15, color: theme.textDim, fontWeight: '600' },
  pass: { borderColor: theme.primary, borderWidth: 2 },
  passText: { fontSize: 18, fontWeight: '800', color: theme.forest },
  fail: { borderColor: theme.danger, borderWidth: 2, alignItems: 'flex-start' },
  failText: { fontSize: 18, fontWeight: '800', color: theme.danger },
  meta: { marginTop: 4, fontSize: 13, color: theme.textDim },
  item: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.card,
    borderLeftWidth: 5,
    alignItems: 'flex-start',
  },
  name: { fontSize: 16, fontWeight: '800', color: theme.text },
  chip: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  chipText: { fontSize: 13, fontWeight: '800' },
  reason: { marginTop: 6, fontSize: 14, lineHeight: 20, color: theme.text },
  actions: { marginTop: 'auto', paddingTop: 16 },
  btn: { paddingVertical: 14, borderRadius: theme.radius, backgroundColor: theme.primary, alignItems: 'center' },
  btnOff: { opacity: 0.5 },
  btnText: { color: theme.primaryText, fontSize: 16, fontWeight: '800' },
  ghost: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  ghostText: { color: theme.textDim, fontSize: 15, fontWeight: '700' },
});

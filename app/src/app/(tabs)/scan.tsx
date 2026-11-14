// Tab Quét: camera toàn màn hình, chụp liên tiếp, mỗi ảnh một thẻ trong khay đáy, AI chạy song song (tối đa 3).
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EntryDetail } from '@/components/scan/EntryDetail';
import { FlyLabel } from '@/components/scan/FlyLabel';
import { PermissionGate } from '@/components/scan/PermissionGate';
import { ScanTray } from '@/components/scan/ScanTray';
import { hasHazard, safeGroupColor, safeGroupShort } from '@/components/scan/labels';
import type { ScanEntry, ScanMode } from '@/lib/contracts';
import { XP_PER_ITEM } from '@/lib/progress';
import { getHazardous } from '@/lib/rules';
import { useScanQueue } from '@/lib/scanQueue';
import { theme } from '@/lib/theme';

type Flash = { key: number; label: string; xp: number; color: string };

const MAX_QUEUED_TAPS = 4;

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const { entries, enqueue, retry, remove } = useScanQueue();

  const [focused, setFocused] = useState(false);
  const [mode, setMode] = useState<ScanMode>('item');
  const [openId, setOpenId] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [hazardNote, setHazardNote] = useState<string | null>(null);
  const [shootError, setShootError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const camRef = useRef<CameraView>(null);
  const modeRef = useRef<ScanMode>(mode);
  modeRef.current = mode;
  const capturing = useRef(false);
  const wantedShots = useRef(0);
  const askedOnce = useRef(false);
  const seen = useRef<Map<string, ScanEntry['status']> | null>(null);
  const flashSeq = useRef(0);

  // Tắt camera khi tab không được nhìn thấy (tiết kiệm pin, nhả camera cho app khác).
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      setCameraReady(false);
      setCameraError(false);
      return () => {
        setFocused(false);
        wantedShots.current = 0;
      };
    }, []),
  );

  // Xin quyền ngay khi vào màn (một lần). Bị từ chối thì hiện màn giải thích.
  useEffect(() => {
    if (!focused || !permission || permission.granted || askedOnce.current) return;
    if (permission.canAskAgain) {
      askedOnce.current = true;
      requestPermission().catch(() => undefined);
    }
  }, [focused, permission, requestPermission]);

  // Người dùng bật quyền trong Cài đặt rồi quay lại app: đọc lại trạng thái quyền.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') getPermission().catch(() => undefined);
    });
    return () => sub.remove();
  }, [getPermission]);

  // Khoảnh khắc nhận diện: thẻ vừa chuyển từ 'pending' sang 'done' -> nhãn bay lên + rung.
  useEffect(() => {
    const prev = seen.current;
    const next = new Map<string, ScanEntry['status']>();
    for (const e of entries) next.set(e.id, e.status);
    seen.current = next;
    if (!prev || !focused) return;

    const fresh = entries.filter(
      (e) => e.status === 'done' && e.items.length > 0 && prev.get(e.id) === 'pending',
    );
    if (fresh.length === 0) return;
    const last = fresh[fresh.length - 1];
    const first = last.items[0];
    flashSeq.current += 1;
    setFlash({
      key: flashSeq.current,
      label: last.items.length > 1 ? `${last.items.length} món` : safeGroupShort(first.groupId),
      xp: XP_PER_ITEM * last.items.length,
      color: safeGroupColor(first.groupId),
    });
    if (fresh.some((e) => hasHazard(e.items))) {
      setHazardNote(getHazardous().note);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  }, [entries, focused]);

  // Bấm liên tiếp được: lượt bấm trong lúc máy đang chụp được nhớ lại và chụp ngay sau đó.
  const shoot = useCallback(async () => {
    wantedShots.current = Math.min(wantedShots.current + 1, MAX_QUEUED_TAPS);
    if (capturing.current) return;
    capturing.current = true;
    try {
      while (wantedShots.current > 0) {
        wantedShots.current -= 1;
        const cam = camRef.current;
        if (!cam) {
          wantedShots.current = 0;
          break;
        }
        try {
          const pic = await cam.takePictureAsync({ quality: 0.7 });
          if (pic && pic.uri) {
            setShootError(false);
            enqueue(pic.uri, modeRef.current, { width: pic.width, height: pic.height });
          } else {
            setShootError(true);
          }
        } catch {
          setShootError(true);
          wantedShots.current = 0;
        }
      }
    } finally {
      capturing.current = false;
    }
  }, [enqueue]);

  if (!permission) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.forest} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <PermissionGate
        canAskAgain={permission.canAskAgain}
        onAsk={() => {
          requestPermission().catch(() => undefined);
        }}
      />
    );
  }

  const openEntry = openId ? entries.find((e) => e.id === openId && e.status === 'done') : undefined;
  const reviewItems = entries.reduce((n, e) => (e.status === 'done' ? n + e.items.length : n), 0);
  const pendingCount = entries.filter((e) => e.status === 'pending').length;

  return (
    <View style={styles.root}>
      {focused ? <StatusBar style="light" /> : null}
      {focused ? (
        <CameraView
          ref={camRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
          onMountError={() => {
            setCameraError(true);
            setCameraReady(false);
          }}
        />
      ) : null}

      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.scanHeader}><Pressable accessibilityRole="button" accessibilityLabel="Về trang chủ" style={styles.closeScan} onPress={()=>router.navigate('/(tabs)')}><Ionicons name="arrow-back" size={23} color={theme.text}/></Pressable><Text style={styles.scanTitle}>PHÂN LOẠI RÁC</Text><View style={{width:48}}/></View>
        <View style={styles.switch} accessibilityRole="tablist">
          <Pressable
            style={[styles.switchBtn, mode === 'item' ? styles.switchOn : null]}
            onPress={() => setMode('item')}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'item' }}
          >
            <Text style={[styles.switchText, mode === 'item' ? styles.switchTextOn : null]}>Một món</Text>
          </Pressable>
          <Pressable
            style={[styles.switchBtn, mode === 'bag' ? styles.switchOn : null]}
            onPress={() => setMode('bag')}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'bag' }}
          >
            <Text style={[styles.switchText, mode === 'bag' ? styles.switchTextOn : null]}>Cả túi</Text>
          </Pressable>
        </View>
        {mode === 'bag' ? <Text style={styles.modeHint}>Chụp cả túi để soát món nằm sai túi</Text> : null}

        {hazardNote ? (
          <Pressable style={styles.hazard} onPress={() => setHazardNote(null)} accessibilityRole="button" accessibilityLabel={`${hazardNote}. Chạm để đóng cảnh báo`}>
            <Ionicons name="warning" size={20} color="#FFFFFF" />
            <Text style={styles.hazardText}>{hazardNote}</Text>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </Pressable>
        ) : null}
        {shootError ? (
          <Pressable style={styles.shootError} onPress={() => setShootError(false)} accessibilityRole="button" accessibilityLabel="Chưa chụp được. Chạm để đóng thông báo rồi thử lại">
            <Text style={styles.shootErrorText}>Chưa chụp được, thử bấm lại</Text>
          </Pressable>
        ) : null}
        {cameraError ? (
          <Text style={styles.cameraError} accessibilityRole="alert">
            Chưa mở được camera. Về Trang chủ rồi quay lại để thử lại.
          </Text>
        ) : null}
      </View>

      <View style={styles.frameLayer} pointerEvents="none"><View style={styles.viewfinder}><View style={[styles.corner,styles.topLeft]}/><View style={[styles.corner,styles.topRight]}/><View style={[styles.corner,styles.bottomLeft]}/><View style={[styles.corner,styles.bottomRight]}/></View><Text style={styles.frameHint}>Đặt vật thể vào giữa khung hình</Text></View>
      <View style={styles.flashLayer} pointerEvents="none">
        {flash ? <FlyLabel key={flash.key} label={flash.label} xp={flash.xp} color={flash.color} /> : null}
      </View>

      <View style={styles.bottom} pointerEvents="box-none">
        {openEntry ? (
          <EntryDetail entry={openEntry} onClose={() => setOpenId(null)} onRemove={remove} />
        ) : null}
        {!openEntry ? <ScanTray entries={entries} onOpen={setOpenId} onRetry={retry} onRemove={remove} /> : null}

        <View style={[styles.bar,{paddingBottom:Math.max(insets.bottom,14)}]}>
          <View style={styles.side}>
            {pendingCount > 0 ? <Text style={styles.sideText} accessibilityLiveRegion="polite">Đang phân loại {pendingCount} ảnh</Text> : null}
          </View>
          <Pressable
            onPress={() => {
              shoot().catch(() => undefined);
            }}
            disabled={!cameraReady || cameraError}
            accessibilityState={{ disabled: !cameraReady || cameraError }}
            style={({ pressed }) => [styles.shutter, pressed ? styles.shutterPressed : null, (!cameraReady || cameraError) && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel={cameraReady ? 'Chụp ảnh để phân loại rác' : 'Đang mở camera'}
          >
            <View style={styles.shutterInner}><Ionicons name="camera-outline" size={30} color={theme.primary}/></View>
          </Pressable>
          <View style={styles.side}>
            {reviewItems > 0 ? (
              <Pressable
                style={[styles.reviewBtn, pendingCount > 0 && styles.disabled]}
                disabled={pendingCount > 0}
                accessibilityState={{ disabled: pendingCount > 0 }}
                onPress={() => router.push('/review')}
                accessibilityRole="button"
                accessibilityLabel={pendingCount > 0 ? `Chờ phân loại xong ${pendingCount} ảnh để xem lại` : `Xem lại ${reviewItems} món`}
              >
                <Text style={styles.reviewText}>{pendingCount > 0 ? 'Chờ AI xong' : `Xem lại ${reviewItems} món`}</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.primaryText} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  scanHeader:{width:'100%',flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:16},closeScan:{height:48,width:48,borderRadius:24,backgroundColor:theme.bg,alignItems:'center',justifyContent:'center'},scanTitle:{fontSize:11,letterSpacing:1.4,fontWeight:'700',color:'#FFFFFF'},
  frameLayer:{position:'absolute',top:0,left:0,right:0,bottom:0,alignItems:'center',justifyContent:'center',paddingBottom:120},viewfinder:{width:'78%',height:'37%',position:'relative'},corner:{position:'absolute',height:36,width:36,borderColor:theme.primary},topLeft:{top:0,left:0,borderTopWidth:3,borderLeftWidth:3,borderTopLeftRadius:17},topRight:{top:0,right:0,borderTopWidth:3,borderRightWidth:3,borderTopRightRadius:17},bottomLeft:{bottom:0,left:0,borderBottomWidth:3,borderLeftWidth:3,borderBottomLeftRadius:17},bottomRight:{bottom:0,right:0,borderBottomWidth:3,borderRightWidth:3,borderBottomRightRadius:17},frameHint:{fontSize:12,color:'#FFFFFF',backgroundColor:'rgba(23,61,43,.7)',paddingHorizontal:14,paddingVertical:7,borderRadius:20,marginTop:18},
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
  top: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 12 },
  switch: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  switchBtn: { minWidth: 96, minHeight: 48, justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, alignItems: 'center' },
  switchOn: { backgroundColor: theme.primary },
  switchText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  switchTextOn: { color: theme.text },
  modeHint: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  hazard: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: theme.radius,
    backgroundColor: theme.danger,
    alignSelf: 'stretch',
  },
  hazardText: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '700', color: '#FFFFFF' },
  shootError: {
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  shootErrorText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  cameraError: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: theme.danger, color: '#FFFFFF', fontSize: 15, textAlign: 'center' },
  disabled: { opacity: 0.5 },
  flashLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: theme.bg,
  },
  side: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sideText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  shutter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  shutterPressed: { transform: [{ scale: 0.92 }], opacity: 0.85 },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: theme.forest,alignItems:'center',justifyContent:'center' },
  reviewBtn: {
    minHeight: 48,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: theme.primary,
  },
  reviewText: { color: theme.primaryText, fontSize: 14, fontWeight: '800', flexShrink: 1 },
});

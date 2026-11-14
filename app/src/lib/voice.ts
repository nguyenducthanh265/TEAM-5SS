// Đọc kết quả quét bằng giọng AI. Quy trình mỗi câu:
//   1) kiểm backend GET /speak trả mp3 (nhanh: câu lặp lại nằm trong bộ nhớ đệm của server);
//   2) phát bằng expo-audio;
//   3) lỗi, hết giờ hoặc mất mạng -> đọc bằng giọng điện thoại (expo-speech, vi-VN). Không bao giờ im lặng.
// Key OpenAI chỉ nằm ở server. Câu đọc <= 240 ký tự, lấy từ kết quả AI đã hậu kiểm (voiceCore.buildSpeech).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useEffect, useSyncExternalStore } from 'react';

import type { ClassifiedItem } from '@/lib/contracts';
import { groupShort } from '@/lib/rules';
import { getDeviceId } from '@/lib/store';
import { buildSpeech, createSpeechQueue } from '@/lib/voiceCore';

const KEY_VOICE_ON = 'ecohanoi.voiceOn';
const CHECK_TIMEOUT_MS = 8000; // chờ backend tạo giọng
const START_TIMEOUT_MS = 5000; // chờ player bắt đầu phát sau khi backend đã sẵn sàng
const MAX_PLAY_MS = 25000; // chốt chặn: một câu không bao giờ giữ hàng chờ quá lâu
const PHONE_MAX_MS = 20000;

// ---- công tắc bật/tắt (mặc định BẬT, nhớ qua lần mở sau) ----
let enabled = true;
let prefLoaded = false;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((l) => l());
}

export function isVoiceOn(): boolean {
  return enabled;
}

export function subscribeVoice(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export async function loadVoicePref(): Promise<void> {
  if (prefLoaded) return;
  prefLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY_VOICE_ON);
    if (raw === '0') {
      enabled = false;
      notify();
    }
  } catch {
    // không đọc được: giữ mặc định bật
  }
}

export function setVoiceOn(on: boolean): void {
  enabled = on;
  prefLoaded = true;
  if (!on) stopSpeaking();
  notify();
  AsyncStorage.setItem(KEY_VOICE_ON, on ? '1' : '0').catch(() => undefined);
}

/** Hook cho giao diện: trạng thái công tắc, tự nạp giá trị đã lưu một lần. */
export function useVoiceOn(): boolean {
  useEffect(() => {
    void loadVoicePref();
  }, []);
  return useSyncExternalStore(subscribeVoice, isVoiceOn, isVoiceOn);
}

// ---- phát ----
let cancelCurrent: (() => void) | null = null;

function apiBase(): string | null {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  const url = typeof raw === 'string' ? raw.trim().replace(/\/+$/, '') : '';
  return url.length > 0 ? url : null;
}

/** Giọng AI. true = đã đọc xong (hoặc bị người dùng dừng); false = không phát được, cần dự phòng. */
async function playAi(text: string, deviceId: string): Promise<boolean> {
  const base = apiBase();
  if (!base) return false;
  const uri = `${base}/speak?t=${encodeURIComponent(text)}&d=${encodeURIComponent(deviceId)}`;

  const ctrl = new AbortController();
  const checkTimer = setTimeout(() => ctrl.abort(), CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(uri, { method: 'GET', signal: ctrl.signal });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.startsWith('audio/')) return false;
  } catch {
    return false;
  } finally {
    clearTimeout(checkTimer);
  }
  if (!enabled) return true;

  return new Promise<boolean>((resolve) => {
    let player: AudioPlayer | null = null;
    let sub: { remove: () => void } | null = null;
    let settled = false;
    let started = false;

    const finish = (ok: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(startTimer);
      clearTimeout(maxTimer);
      if (cancelCurrent === cancel) cancelCurrent = null;
      try {
        sub?.remove();
      } catch {
        // bỏ qua
      }
      try {
        player?.remove();
      } catch {
        // bỏ qua
      }
      resolve(ok);
    };
    const cancel = (): void => finish(true); // người dùng tắt tiếng: không phải lỗi, không đọc dự phòng
    const startTimer = setTimeout(() => finish(started), START_TIMEOUT_MS);
    const maxTimer = setTimeout(() => finish(started), MAX_PLAY_MS);
    cancelCurrent = cancel;

    try {
      player = createAudioPlayer({ uri });
      sub = player.addListener('playbackStatusUpdate', (status) => {
        if (status.playing) {
          started = true;
          clearTimeout(startTimer);
        }
        if (status.didJustFinish) finish(true);
      });
      player.play();
    } catch {
      finish(false);
    }
  });
}

/** Giọng điện thoại (dự phòng). Máy chưa có giọng tiếng Việt thì có thể im lặng: đã là phương án cuối. */
function playPhone(text: string): Promise<void> {
  return new Promise<void>((resolve) => {
    let done = false;
    const end = (): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (cancelCurrent === cancel) cancelCurrent = null;
      resolve();
    };
    const cancel = (): void => {
      Speech.stop().catch(() => undefined);
      end();
    };
    const timer = setTimeout(end, PHONE_MAX_MS);
    cancelCurrent = cancel;
    try {
      Speech.speak(text, { language: 'vi-VN', onDone: end, onError: end, onStopped: end });
    } catch {
      end();
    }
  });
}

const queue = createSpeechQueue(
  async (text) => {
    if (!enabled) return;
    let deviceId = '';
    try {
      deviceId = await getDeviceId();
    } catch {
      // thiếu id máy: vẫn đọc, chỉ không tính giới hạn riêng cho máy này
    }
    const ok = await playAi(text, deviceId);
    if (!ok && enabled) await playPhone(text);
  },
  () => {
    const c = cancelCurrent;
    cancelCurrent = null;
    c?.();
  },
);

/** Đọc kết quả của một lượt quét (không làm gì khi đã tắt tiếng hoặc không có món). */
export function speakResults(items: readonly ClassifiedItem[]): void {
  if (!enabled) return;
  const text = buildSpeech(items, groupShort);
  if (text) queue.say(text);
}

export function stopSpeaking(): void {
  queue.stop();
}

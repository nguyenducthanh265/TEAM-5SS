import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { fetchGroup, normalizeGroupCode } from '@/lib/groupApi';
import type { GroupInfo } from '@/lib/groupApi';
import { getGroupCode, setGroupCode } from '@/lib/store';
import { theme } from '@/lib/theme';

interface Props {
  /** Tăng số này để thẻ tải lại (màn cha tăng mỗi lần tab được mở). */
  refreshKey: number;
}

type Remote = 'idle' | 'loading' | 'ready' | 'unavailable';

/** Thẻ "Nhóm của bạn": nhập mã nhóm, xem XP nhóm + bảng xếp hạng. Không có số từ server thì không hiện số. */
export function TeamCard({ refreshKey }: Props): React.JSX.Element {
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [info, setInfo] = useState<GroupInfo | null>(null);
  const [remote, setRemote] = useState<Remote>('idle');

  useEffect(() => {
    let alive = true;
    void (async () => {
      const saved = await getGroupCode();
      if (!alive) return;
      setCode(saved);
      if (!saved) {
        setInfo(null);
        setRemote('idle');
        return;
      }
      setRemote('loading');
      const data = await fetchGroup(saved);
      if (!alive) return;
      setInfo(data);
      setRemote(data ? 'ready' : 'unavailable');
    })();
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const onJoin = useCallback(async () => {
    const clean = normalizeGroupCode(input);
    if (!clean) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    try {
      await setGroupCode(clean);
    } catch {
      setInvalid(true);
      return;
    }
    setCode(clean);
    setInput('');
    setRemote('loading');
    const data = await fetchGroup(clean);
    setInfo(data);
    setRemote(data ? 'ready' : 'unavailable');
  }, [input]);

  const onLeave = useCallback(async () => {
    try {
      await setGroupCode('');
    } catch {
      // không xóa được thì vẫn về trạng thái nhập mã trên màn hình
    }
    setCode(null);
    setInfo(null);
    setRemote('idle');
  }, []);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Nhóm của bạn</Text>
      {code === null ? (
        <View style={styles.block}>
          <Text style={styles.text}>
            Nhập mã chung của phòng hoặc lớp để cùng góp điểm nuôi cây.
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={(t) => {
                setInput(t);
                setInvalid(false);
              }}
              placeholder="Ví dụ: KTX-B2-305"
              placeholderTextColor={theme.textDim}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={onJoin}
              style={styles.input}
              accessibilityLabel="Mã nhóm"
            />
            <Pressable
              onPress={onJoin}
              accessibilityRole="button"
              style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
            >
              <Text style={styles.btnText}>Lưu mã</Text>
            </Pressable>
          </View>
          {invalid ? (
            <Text style={styles.error}>Mã gồm 3–20 ký tự: chữ, số, gạch ngang.</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.block}>
          <View style={styles.codeRow}>
            <Text style={styles.code}>{code}</Text>
            <Pressable
              onPress={onLeave}
              accessibilityRole="button"
              hitSlop={10}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.link}>Đổi mã</Text>
            </Pressable>
          </View>
          {remote === 'loading' ? <ActivityIndicator color={theme.primary} /> : null}
          {remote === 'unavailable' ? (
            <Text style={styles.text}>
              Chưa lấy được điểm nhóm. Điểm của bạn vẫn được lưu trên máy.
            </Text>
          ) : null}
          {remote === 'ready' && info ? (
            <View style={styles.block}>
              <View style={styles.statRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{info.xp}</Text>
                  <Text style={styles.statLabel}>XP nhóm</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>#{info.rank}</Text>
                  <Text style={styles.statLabel}>Xếp hạng</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{info.members}</Text>
                  <Text style={styles.statLabel}>Thành viên</Text>
                </View>
              </View>
              {info.top.length > 0 ? (
                <View style={styles.board}>
                  <Text style={styles.boardTitle}>Bảng xếp hạng (Top 5)</Text>
                  {info.top.slice(0, 5).map((row, i) => {
                    const mine = row.code === info.code;
                    return (
                      <View key={`${row.code}:${i}`} style={styles.boardRow}>
                        <Text style={[styles.boardRank, mine && styles.mine]}>{i + 1}</Text>
                        <Text style={[styles.boardCode, mine && styles.mine]} numberOfLines={1}>
                          {row.code}
                        </Text>
                        <Text style={[styles.boardXp, mine && styles.mine]}>{row.xp} XP</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: theme.pad,
    gap: 10,
  },
  block: {
    gap: 10,
  },
  title: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '700',
  },
  text: {
    color: theme.textDim,
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    color: theme.text,
    fontSize: 16,
    backgroundColor: theme.bg,
  },
  btn: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: theme.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: theme.danger,
    fontSize: 13,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  code: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  link: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.bg,
  },
  statValue: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: theme.textDim,
    fontSize: 12,
  },
  board: {
    gap: 6,
  },
  boardTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
  },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 32,
  },
  boardRank: {
    width: 24,
    color: theme.textDim,
    fontSize: 14,
    fontWeight: '700',
  },
  boardCode: {
    flex: 1,
    color: theme.text,
    fontSize: 15,
  },
  boardXp: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
  },
  mine: {
    color: theme.primary,
    fontWeight: '700',
  },
});

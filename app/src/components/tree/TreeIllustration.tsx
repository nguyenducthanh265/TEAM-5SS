import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { theme } from '@/lib/theme';
import type { TreeStageId } from '@/lib/tree';

interface TreeIllustrationProps {
  stageId: TreeStageId;
  thirsty: boolean;
  wateringKey: number;
}

const LEAF_FRESH = '#2E9E4F';
const LEAF_LIGHT = '#4CC36B';
const LEAF_DEEP = '#1F8A4C';
const LEAF_THIRSTY = '#8FA86B';
const TRUNK_COLOR = '#7B5233';
const SOIL_COLOR = '#6B4E35';
const DROP_COLOR = '#2B95E6';

export function TreeIllustration({
  stageId,
  thirsty,
  wateringKey,
}: TreeIllustrationProps): React.JSX.Element {
  const dropY = useRef(new Animated.Value(-56)).current;
  const dropOpacity = useRef(new Animated.Value(0)).current;
  const dropScale = useRef(new Animated.Value(0.8)).current;
  const treeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (wateringKey <= 0) return;

    dropY.setValue(-56);
    dropOpacity.setValue(0);
    dropScale.setValue(0.85);
    treeScale.setValue(1);

    // Tổng thời gian <= 550 ms, chỉ animate transform và opacity.
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.timing(dropOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(dropY, {
          toValue: 26,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(dropScale, {
          toValue: 1.05,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(dropOpacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(treeScale, {
            toValue: 1.08,
            duration: 110,
            useNativeDriver: true,
          }),
          Animated.timing(treeScale, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    anim.start();
    return () => {
      anim.stop();
    };
  }, [dropOpacity, dropScale, dropY, treeScale, wateringKey]);

  const leafMain = thirsty ? LEAF_THIRSTY : LEAF_FRESH;
  const leafTop = thirsty ? '#A3B87C' : LEAF_LIGHT;
  const leafBack = thirsty ? '#7A9159' : LEAF_DEEP;

  return (
    <View style={styles.stageBox} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View
        pointerEvents="none"
        style={[
          styles.dropWrap,
          {
            opacity: dropOpacity,
            transform: [{ translateY: dropY }, { scale: dropScale }],
          },
        ]}
      >
        <Ionicons name="water" size={32} color={DROP_COLOR} />
      </Animated.View>

      <Animated.View style={[styles.treeWrap, { transform: [{ scale: treeScale }] }]}>
        {stageId === 'sprout' ? (
          <View style={styles.sproutWrap}>
            <View style={styles.sproutLeaves}>
              <View style={[styles.sproutLeafLeft, { backgroundColor: leafTop }]} />
              <View style={[styles.sproutLeafRight, { backgroundColor: leafMain }]} />
            </View>
            <View style={styles.sproutStem} />
          </View>
        ) : null}

        {stageId === 'sapling' ? (
          <View style={styles.saplingWrap}>
            <View style={[styles.saplingCrownTop, { backgroundColor: leafTop }]} />
            <View style={styles.saplingRow}>
              <View style={[styles.saplingCrownSide, { backgroundColor: leafMain }]} />
              <View style={[styles.saplingCrownSide, { backgroundColor: leafBack }]} />
            </View>
            <View style={styles.saplingTrunk} />
          </View>
        ) : null}

        {stageId === 'canopy' ? (
          <View style={styles.canopyWrap}>
            <View style={[styles.canopyTop, { backgroundColor: leafTop }]} />
            <View style={styles.canopyMidRow}>
              <View style={[styles.canopySide, { backgroundColor: leafMain }]} />
              <View style={[styles.canopyCenter, { backgroundColor: leafBack }]} />
              <View style={[styles.canopySide, { backgroundColor: leafMain }]} />
            </View>
            <View style={styles.canopyTrunk} />
          </View>
        ) : null}

        {stageId === 'giant' ? (
          <View style={styles.giantWrap}>
            <View style={[styles.giantCrownTop, { backgroundColor: leafTop }]} />
            <View style={styles.giantCrownRow}>
              <View style={[styles.giantCrownLeft, { backgroundColor: leafMain }]} />
              <View style={[styles.giantCrownCenter, { backgroundColor: leafBack }]} />
              <View style={[styles.giantCrownRight, { backgroundColor: leafMain }]} />
            </View>
            {!thirsty ? (
              <View style={styles.blossomLayer} pointerEvents="none">
                <View style={[styles.blossomDot, { top: 22, left: 48 }]} />
                <View style={[styles.blossomDot, { top: 44, right: 44 }]} />
                <View style={[styles.blossomDot, { top: 64, left: 72 }]} />
              </View>
            ) : null}
            <View style={styles.giantTrunk} />
          </View>
        ) : null}

        <View style={styles.soilMound} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stageBox: {
    height: 210,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  dropWrap: {
    position: 'absolute',
    top: 8,
    zIndex: 10,
  },
  treeWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  soilMound: {
    width: 120,
    height: 18,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: SOIL_COLOR,
    borderWidth: 1,
    borderColor: theme.border,
  },
  // Mầm non
  sproutWrap: {
    alignItems: 'center',
    marginBottom: -4,
  },
  sproutLeaves: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  sproutLeafLeft: {
    width: 22,
    height: 14,
    borderTopLeftRadius: 14,
    borderBottomRightRadius: 14,
    transform: [{ rotate: '-18deg' }],
  },
  sproutLeafRight: {
    width: 24,
    height: 15,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    transform: [{ rotate: '16deg' }],
  },
  sproutStem: {
    width: 6,
    height: 36,
    borderRadius: 3,
    backgroundColor: '#5BA84E',
    marginTop: -2,
  },
  // Cây non
  saplingWrap: {
    alignItems: 'center',
    marginBottom: -4,
  },
  saplingCrownTop: {
    width: 54,
    height: 50,
    borderRadius: 27,
    marginBottom: -22,
    zIndex: 2,
  },
  saplingRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: -10,
  },
  saplingCrownSide: {
    width: 44,
    height: 40,
    borderRadius: 22,
  },
  saplingTrunk: {
    width: 12,
    height: 56,
    borderRadius: 5,
    backgroundColor: TRUNK_COLOR,
  },
  // Tán xanh
  canopyWrap: {
    alignItems: 'center',
    marginBottom: -4,
  },
  canopyTop: {
    width: 82,
    height: 70,
    borderRadius: 40,
    marginBottom: -32,
    zIndex: 2,
  },
  canopyMidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: -14,
  },
  canopySide: {
    width: 58,
    height: 54,
    borderRadius: 29,
    marginHorizontal: -10,
  },
  canopyCenter: {
    width: 68,
    height: 60,
    borderRadius: 34,
    zIndex: 1,
  },
  canopyTrunk: {
    width: 18,
    height: 62,
    borderRadius: 6,
    backgroundColor: TRUNK_COLOR,
  },
  // Đại thụ
  giantWrap: {
    alignItems: 'center',
    marginBottom: -4,
    position: 'relative',
  },
  giantCrownTop: {
    width: 112,
    height: 86,
    borderRadius: 50,
    marginBottom: -42,
    zIndex: 2,
  },
  giantCrownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: -16,
  },
  giantCrownLeft: {
    width: 72,
    height: 68,
    borderRadius: 36,
    marginRight: -16,
  },
  giantCrownCenter: {
    width: 86,
    height: 76,
    borderRadius: 42,
    zIndex: 1,
  },
  giantCrownRight: {
    width: 72,
    height: 68,
    borderRadius: 36,
    marginLeft: -16,
  },
  blossomLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 110,
    zIndex: 3,
  },
  blossomDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F7C948',
  },
  giantTrunk: {
    width: 26,
    height: 68,
    borderRadius: 8,
    backgroundColor: TRUNK_COLOR,
  },
});

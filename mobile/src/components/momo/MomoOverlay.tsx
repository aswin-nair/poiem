import {
  dayRingProgress,
  daysSincePreviousLog,
  entryDayKey,
  localDayKey,
  momoLine,
  pokeAct,
  TAUNT_POSES,
  tauntAct,
  type MascotState,
  type PokePose,
  type TauntPose,
} from '@fud-ai/product';
import { normalizeOutfit } from '@fud-ai/product/wardrobe';
import { usePathname } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState as NativeAppState,
  Easing,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/primitives/Text';
import { useApp } from '@/state/AppProvider';
import { loggingStreak } from '@/state/journey';
import type { AppState } from '@/state/types';
import { useTheme } from '@/theme/useTheme';
import { Momo } from './Momo';
import {
  MOMO_SIZE,
  clampMomoPoint,
  momoCadenceMs,
  momoRoamBounds,
  nextMomoPoseIndex,
  nextMomoRoamPoint,
  settledMomoPoint,
  type MomoPoint,
} from './momoMotion';

type MomoPose = TauntPose | PokePose;

const RECENT_LINE_LIMIT = 16;
const BUBBLE_MAX_WIDTH = 220;

export function MomoOverlay() {
  const theme = useTheme();
  const { state } = useApp();
  const path = usePathname();
  const {
    bottom: safeBottom,
    left: safeLeft,
    right: safeRight,
    top: safeTop,
  } = useSafeAreaInsets();
  const window = useWindowDimensions();
  const activity = state.gamification.mascotActivity;
  const outfit = normalizeOutfit(state.gamification.outfit, state.gamification.equippedCosmeticId);
  const muted = state.profile.mascotMuted === true;
  const [appActive, setAppActive] = useState(NativeAppState.currentState === 'active');
  const hidden = activity === 'off' || path !== '/' || !appActive;
  const bounds = useMemo(
    () => momoRoamBounds(window.width, window.height, {
      bottom: safeBottom,
      left: safeLeft,
      right: safeRight,
      top: safeTop,
    }),
    [safeBottom, safeLeft, safeRight, safeTop, window.height, window.width],
  );
  const settled = settledMomoPoint(bounds);
  const [line, setLine] = useState<string | null>(null);
  const [activePose, setActivePose] = useState<MomoPose>('look_around');
  const [bubbleSide, setBubbleSide] = useState<'left' | 'right'>('right');
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [position] = useState(() => new Animated.ValueXY(settled));
  const [gestureProgress] = useState(() => new Animated.Value(0));
  const currentPoint = useRef<MomoPoint>(settled);
  const pokes = useRef(0);
  const previousPose = useRef(-1);
  const scheduledTurns = useRef(0);
  const recentLines = useRef<string[]>([]);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setSystemReducedMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReducedMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const reduced = systemReducedMotion || state.profile.mascotReducedMotion === true;

  useEffect(() => {
    const subscription = NativeAppState.addEventListener('change', (next) => {
      setAppActive(next === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reduced || hidden) {
      gestureProgress.stopAnimation();
      gestureProgress.setValue(0);
    }
  }, [gestureProgress, hidden, reduced]);

  useEffect(() => {
    position.stopAnimation();
    const next = reduced
      ? settledMomoPoint(bounds)
      : clampMomoPoint(currentPoint.current, bounds);
    currentPoint.current = next;
    position.setValue(next);
    setBubbleSide(next.x <= (bounds.minX + bounds.maxX) / 2 ? 'left' : 'right');
  }, [bounds, position, reduced]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      position.stopAnimation();
      gestureProgress.stopAnimation();
    },
    [gestureProgress, position],
  );

  const showLine = useCallback((nextLine: string) => {
    recentLines.current = [
      nextLine,
      ...recentLines.current.filter((recent) => recent !== nextLine),
    ].slice(0, RECENT_LINE_LIMIT);
    setLine(nextLine);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setLine(null), 4_200);
  }, []);

  const runGesture = useCallback(
    (pose: MomoPose) => {
      if (reduced) return;
      gestureProgress.stopAnimation();
      setActivePose(pose);
      gestureProgress.setValue(0);
      Animated.timing(gestureProgress, {
        duration: 1_050,
        easing: Easing.inOut(Easing.quad),
        toValue: 1,
        useNativeDriver: true,
      }).start();
    },
    [gestureProgress, reduced],
  );

  useEffect(() => {
    if (hidden) return;

    let cancelled = false;
    let eventTimer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      const delay = momoCadenceMs(activity, Math.random());
      if (delay === null) return;
      eventTimer = setTimeout(runRandomAct, delay);
    };

    const speakAtDestination = (pose: TauntPose) => {
      if (cancelled || muted) return;
      const recent = recentLines.current;
      const useContext = scheduledTurns.current % 3 === 0;
      scheduledTurns.current += 1;
      const nextLine = useContext
        ? contextualLine(state, recent, new Date())
        : tauntAct(pose, Math.floor(Math.random() * 10_000), recent).line;
      showLine(nextLine);
    };

    function runRandomAct() {
      if (cancelled) return;
      const poseIndex = nextMomoPoseIndex(
        TAUNT_POSES.length,
        previousPose.current,
        Math.random(),
      );
      previousPose.current = poseIndex;
      const pose = TAUNT_POSES[poseIndex]!;
      runGesture(pose);

      if (reduced) {
        speakAtDestination(pose);
        schedule();
        return;
      }

      const target = nextMomoRoamPoint(
        bounds,
        currentPoint.current,
        Math.random(),
        Math.random(),
      );
      const moveDuration = activity === 'lively' ? 1_500 : 2_200;
      position.stopAnimation();
      Animated.timing(position, {
        duration: moveDuration,
        easing: Easing.inOut(Easing.cubic),
        toValue: target,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || cancelled) return;
        currentPoint.current = target;
        setBubbleSide(target.x <= (bounds.minX + bounds.maxX) / 2 ? 'left' : 'right');
        speakAtDestination(pose);
      });
      schedule();
    }

    schedule();
    return () => {
      cancelled = true;
      if (eventTimer) clearTimeout(eventTimer);
      position.stopAnimation();
    };
  }, [activity, bounds, hidden, muted, position, reduced, runGesture, showLine, state]);

  if (hidden) return null;

  const mood = state.profile.trackingPaused
    ? 'neutral'
    : state.foodEntries.length === 0
      ? 'sleepy'
      : 'curious';
  const spec = poseSpec(activePose);
  const inputRange = [0, 0.25, 0.5, 0.75, 1];
  const translateX = gestureProgress.interpolate({
    inputRange,
    outputRange: [0, spec.x, -spec.x, spec.x / 2, 0],
  });
  const translateY = gestureProgress.interpolate({
    inputRange,
    outputRange: [0, spec.y, 0, spec.y / 2, 0],
  });
  const rotate = gestureProgress.interpolate({
    inputRange,
    outputRange: [
      '0deg',
      `${spec.rotate}deg`,
      `${-spec.rotate}deg`,
      `${spec.rotate / 2}deg`,
      '0deg',
    ],
  });
  const scaleX = gestureProgress.interpolate({
    inputRange,
    outputRange: [1, spec.scaleX, 1, spec.scaleX, 1],
  });
  const scaleY = gestureProgress.interpolate({
    inputRange,
    outputRange: [1, spec.scaleY, 1, spec.scaleY, 1],
  });
  const bubbleWidth = Math.min(
    BUBBLE_MAX_WIDTH,
    Math.max(1, window.width - safeLeft - safeRight - 32),
  );

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.overlay]}>
      <Animated.View
        pointerEvents="box-none"
        style={[styles.momoPosition, { transform: position.getTranslateTransform() }]}
      >
        {!muted && line ? (
          <View
            pointerEvents="none"
            style={[
              styles.bubble,
              {
                backgroundColor: theme.colors.surface,
                maxWidth: bubbleWidth,
                width: bubbleWidth,
              },
              bubbleSide === 'left' ? styles.bubbleFromLeft : styles.bubbleFromRight,
            ]}
          >
            <Text variant="caption">{line}</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityHint={
            muted ? 'Momo dialogue is muted' : 'Hear what Momo has to say'
          }
          accessibilityLabel="Momo"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            pokes.current += 1;
            let act = pokeAct(pokes.current, Math.floor(Math.random() * 10_000));
            for (
              let variant = 1;
              variant < 5 && act.line === recentLines.current[0];
              variant += 1
            ) {
              act = pokeAct(pokes.current, variant);
            }
            runGesture(act.pose);
            if (!muted) showLine(act.line);
          }}
        >
          <Animated.View
            style={{
              transform: [
                { translateX },
                { translateY },
                { rotate },
                { scaleX },
                { scaleY },
              ],
            }}
          >
            <Momo mood={mood} outfit={outfit} size={MOMO_SIZE} />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function contextualLine(state: AppState, recent: readonly string[], now: Date): string {
  const dayKey = localDayKey(now);
  const todayEntries = state.foodEntries.filter((entry) => entryDayKey(entry) === dayKey);
  const streak = loggingStreak(state.foodEntries, state.gamification, now);
  const notes = state.gamification.notesByDate[dayKey] ?? 0;
  const ring = dayRingProgress(
    todayEntries,
    notes,
    state.profile.loggingCommitment ?? 'light',
  );
  const loggedDayKeys = state.foodEntries.map(entryDayKey);
  const mascotState: MascotState = state.profile.trackingPaused
    ? 'neutral'
    : todayEntries.length === 0
      ? 'sleepy'
      : ring.complete
        ? 'celebrating'
        : streak >= 3
          ? 'proud'
          : 'happy';
  const streakMilestone = streak >= 30
    ? 'legendary'
    : streak >= 7
      ? 'steady'
      : streak >= 3
        ? 'building'
        : undefined;

  return momoLine(
    {
      dayKey,
      daysAway: daysSincePreviousLog(loggedDayKeys, dayKey),
      entryCount: todayEntries.length,
      firstLogOfDay: todayEntries.length === 1,
      hour: now.getHours(),
      ringComplete: ring.complete,
      state: mascotState,
      streakMilestone,
    },
    recent,
  );
}

function poseSpec(pose: MomoPose) {
  const neutral = { rotate: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 };
  const specs: Partial<Record<MomoPose, typeof neutral>> = {
    bow: { ...neutral, rotate: 8, scaleY: 0.94, y: 5 },
    happy_hop: { ...neutral, scaleX: 0.96, scaleY: 1.05, y: -15 },
    look_around: { ...neutral, rotate: 3, x: 9 },
    poke_dizzy: { ...neutral, rotate: 14, x: 5 },
    poke_hide: { ...neutral, scaleX: 0.68, scaleY: 0.68, y: 9 },
    poke_hop: { ...neutral, scaleX: 0.95, scaleY: 1.05, y: -16 },
    poke_puff: { ...neutral, scaleX: 1.12, scaleY: 1.1 },
    poke_spin: { ...neutral, rotate: 180 },
    poke_squish: { ...neutral, scaleX: 1.14, scaleY: 0.78, y: 7 },
    poke_tip: { ...neutral, rotate: 12, x: 4 },
    poke_wobble: { ...neutral, rotate: 10, x: 4 },
    ponder: { ...neutral, rotate: -5, x: 3 },
    stretch: { ...neutral, scaleX: 0.94, scaleY: 1.14, y: -5 },
    tiny_dance: { ...neutral, rotate: 10, x: 7, y: -5 },
    wander: { ...neutral, rotate: 4, x: 11 },
    wave_at_user: { ...neutral, rotate: 11, x: 3 },
  };

  return specs[pose] ?? neutral;
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: 16,
    bottom: MOMO_SIZE + 8,
    padding: 10,
    position: 'absolute',
  },
  bubbleFromLeft: {
    left: 0,
  },
  bubbleFromRight: {
    right: 0,
  },
  momoPosition: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  overlay: {
    zIndex: 20,
  },
});

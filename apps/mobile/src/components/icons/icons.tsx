import React, { useEffect, useRef } from 'react';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedProps,
} from 'react-native-reanimated';

// Default icon size
const DEFAULT_ICON_SIZE = 26;
const DEFAULT_COLOR = '#000000';

interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

// Circular Progress Chart Components
interface CircularProgressProps extends IconProps {
  percentage: number;
  progressColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  radius?: number;
  showTargetIcon?: boolean;
  iconColor?: string;
  iconSize?: number;
  clockwise?: boolean;
  animate?: boolean;
  animationKey?: string | number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function CircularProgressChart({
  width = 120,
  height = 120,
  percentage,
  progressColor = DEFAULT_COLOR,
  strokeWidth = 8,
  radius = 48,
  showTargetIcon = false,
  iconColor = '#000000',
  iconSize = 24,
  clockwise = true,
  animate = true,
  animationKey,
}: CircularProgressProps) {
  const centerX = width / 2;
  const centerY = height / 2;
  const circumference = 2 * Math.PI * radius;
  const target = Math.max(0, Math.min(100, percentage));

  const progressSV = useSharedValue(animate && animationKey === undefined ? 0 : target);
  const prevKeyRef = useRef<typeof animationKey>(animationKey);

  useEffect(() => {
    if (!animate) {
      progressSV.value = target;
      prevKeyRef.current = animationKey;
      return;
    }

    // If no animationKey is provided, animate on every target change (default behavior)
    if (animationKey === undefined) {
      progressSV.value = 0;
      progressSV.value = withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) });
      return;
    }

    // Only animate when the key changes; otherwise set immediately (avoids animating on card switch)
    if (prevKeyRef.current !== animationKey) {
      progressSV.value = 0;
      progressSV.value = withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) });
    } else {
      progressSV.value = target;
    }
    prevKeyRef.current = animationKey;
  }, [target, animate, animationKey, progressSV]);

  const animatedProps = useAnimatedProps(() => {
    const pct = progressSV.value;
    const base = circumference * (1 - pct / 100);
    return {
      strokeDashoffset: clockwise ? base : base * -1,
    } as any;
  });

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Background circle */}
      <Circle
        cx={centerX}
        cy={centerY}
        r={radius}
        stroke={'#f1f5f9'}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress circle - percentage filled */}
      <AnimatedCircle
        cx={centerX}
        cy={centerY}
        r={radius}
        stroke={progressColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        animatedProps={animatedProps}
        transform={`rotate(-90 ${centerX} ${centerY})`}
      />
      {/* Inner circle */}
      <Circle cx={centerX} cy={centerY} r={radius - strokeWidth - 8} fill="#FFFFFF" />
      {/* Target Icon in center with circular background */}
      {showTargetIcon && (
        <G transform={`translate(${centerX - iconSize / 2}, ${centerY - iconSize / 2})`}>
          {/* Circular background for the icon - matching back button style */}
          <Circle cx={iconSize / 2} cy={iconSize / 2} r={iconSize / 2 + 10} fill="#f1f5f9" />
          {/* Target icon as SVG paths */}
          <Circle
            cx={iconSize / 2}
            cy={iconSize / 2}
            r={iconSize / 2}
            fill="none"
            stroke={iconColor}
            strokeWidth={1.5}
          />
          <Circle
            cx={iconSize / 2}
            cy={iconSize / 2}
            r={iconSize / 3}
            fill="none"
            stroke={iconColor}
            strokeWidth={1.5}
          />
          <Circle cx={iconSize / 2} cy={iconSize / 2} r={iconSize / 6} fill={iconColor} />
        </G>
      )}
    </Svg>
  );
}

export function SingleDotIcon({
  width = DEFAULT_ICON_SIZE,
  height = DEFAULT_ICON_SIZE,
  color = DEFAULT_COLOR,
}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="6" fill={color} />
    </Svg>
  );
}

export function ThreeDotsIcon({
  width = DEFAULT_ICON_SIZE,
  height = DEFAULT_ICON_SIZE,
  color = DEFAULT_COLOR,
}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      {/* Top dot */}
      <Circle cx="12" cy="6" r="4" fill={color} />
      {/* Bottom left dot */}
      <Circle cx="7" cy="18" r="4" fill={color} />
      {/* Bottom right dot */}
      <Circle cx="17" cy="18" r="4" fill={color} />
    </Svg>
  );
}

export function SixDotsIcon({
  width = DEFAULT_ICON_SIZE,
  height = DEFAULT_ICON_SIZE,
  color = DEFAULT_COLOR,
}: IconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      {/* Left column - top */}
      <Circle cx="6" cy="4" r="3" fill={color} />
      {/* Left column - middle */}
      <Circle cx="6" cy="12" r="3" fill={color} />
      {/* Left column - bottom */}
      <Circle cx="6" cy="20" r="3" fill={color} />
      {/* Right column - top */}
      <Circle cx="18" cy="4" r="3" fill={color} />
      {/* Right column - middle */}
      <Circle cx="18" cy="12" r="3" fill={color} />
      {/* Right column - bottom */}
      <Circle cx="18" cy="20" r="3" fill={color} />
    </Svg>
  );
}

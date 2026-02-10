'use client';

import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface ConfettiProps {
  trigger?: boolean;
}

// Classic varied confetti colors
const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4'];

export function Confetti({ trigger = true }: ConfettiProps) {
  useEffect(() => {
    if (!trigger) return;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.6 },
      colors: colors,
    });
  }, [trigger]);

  return null;
}

export function fireConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { x: 0.5, y: 0.6 },
    colors: colors,
  });
}

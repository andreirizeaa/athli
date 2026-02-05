"use client";

import React, { useEffect, useMemo, useRef } from "react";

export function WaveformPill({
  peaks,
  progress = 0, // 0..1 (optional)
  width = 520,
  height = 110,
  barWidth = 10,
  gap = 8,
  padX = 18,
  padY = 18,
  minBarHeight = 10,
}: {
  peaks: number[];
  progress?: number;
  width?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
  padX?: number;
  padY?: number;
  minBarHeight?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // fit/resample peaks to available bar slots
  const fitted = useMemo(() => {
    const innerW = width - padX * 2;
    const maxBars = Math.max(1, Math.floor((innerW + gap) / (barWidth + gap)));
    if (peaks.length === maxBars) return peaks;

    const out: number[] = [];
    for (let i = 0; i < maxBars; i++) {
      const t = (i / Math.max(1, maxBars - 1)) * (peaks.length - 1);
      const i0 = Math.floor(t);
      const i1 = Math.min(peaks.length - 1, i0 + 1);
      const frac = t - i0;
      out.push(peaks[i0] * (1 - frac) + peaks[i1] * frac);
    }
    return out;
  }, [peaks, width, padX, barWidth, gap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // pill background
    const r = height / 2;
    roundRect(ctx, 0, 0, width, height, r);
    ctx.fillStyle = "rgba(20,20,20,0.9)";
    ctx.fill();

    // bars region
    const innerX = padX;
    const innerY = padY;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;

    const totalBarsW = fitted.length * barWidth + (fitted.length - 1) * gap;
    const startX = innerX + Math.max(0, (innerW - totalBarsW) / 2);

    // base bars
    drawBars(ctx, fitted, {
      x: startX,
      y: innerY,
      h: innerH,
      barWidth,
      gap,
      minBarHeight,
      color: "rgba(255,255,255,0.55)",
    });

    // played overlay (optional)
    const clipW = clamp(progress, 0, 1) * width;
    if (clipW > 0) {
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, 0, 0, clipW, height, r);
      ctx.clip();

      // redraw bars as "played"
      drawBars(ctx, fitted, {
        x: startX,
        y: innerY,
        h: innerH,
        barWidth,
        gap,
        minBarHeight,
        color: "rgba(255,255,255,0.9)",
      });

      ctx.restore();
    }
  }, [fitted, progress, width, height, barWidth, gap, padX, padY, minBarHeight]);

  return <canvas ref={canvasRef} />;
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  peaks: number[],
  opts: {
    x: number;
    y: number;
    h: number;
    barWidth: number;
    gap: number;
    minBarHeight: number;
    color: string;
  }
) {
  const { x, y, h, barWidth, gap, minBarHeight, color } = opts;
  ctx.fillStyle = color;

  for (let i = 0; i < peaks.length; i++) {
    const p = clamp(peaks[i], 0, 1);

    // make it look "designed" like your screenshot
    const shaped = Math.pow(p, 0.7);

    const barH = clamp(minBarHeight + shaped * (h - minBarHeight), minBarHeight, h);
    const bx = x + i * (barWidth + gap);
    const by = y + (h - barH) / 2;

    roundRect(ctx, bx, by, barWidth, barH, barWidth / 2);
    ctx.fill();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

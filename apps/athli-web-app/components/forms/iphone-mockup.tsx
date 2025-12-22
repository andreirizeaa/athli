import * as React from 'react';
import { cn } from '@/lib/general/utils';

type IphoneFrameProps = {
  /** iPhone screen size in CSS pixels (e.g. 390x844 for iPhone 14/15) */
  width?: number;
  height?: number;
  /** Manual scale override (if not provided, auto-scales to fit container) */
  scale?: number;
  /** Content shown inside the phone screen */
  children?: React.ReactNode;
  /** Extra classes for outer wrapper */
  className?: string;
};

export const IphoneFrame = ({
  width = 390,
  height = 844,
  scale: manualScale,
  children,
  className,
}: IphoneFrameProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [autoScale, setAutoScale] = React.useState(1);

  const shellPad = 14; // thickness around the screen
  const shellW = React.useMemo(() => width + shellPad * 2, [width]);
  const shellH = React.useMemo(() => height + shellPad * 2, [height]);

  // Auto-scale to fit container (both width and height)
  React.useEffect(() => {
    if (manualScale !== undefined) {
      return; // Don't auto-scale if manual scale is provided
    }

    const updateScale = () => {
      if (!containerRef.current) return;

      const container = containerRef.current.parentElement;
      if (!container) return;

      const availableWidth = container.clientWidth;
      const availableHeight = container.clientHeight;
      const padding = 32; // Some padding for breathing room
      const maxWidth = availableWidth - padding;
      const maxHeight = availableHeight - padding;

      // Calculate scale to fit both width and height
      const scaleByWidth = maxWidth / shellW;
      const scaleByHeight = maxHeight / shellH;

      // Use the smaller scale to ensure it fits both dimensions
      const calculatedScale = Math.min(scaleByWidth, scaleByHeight, 1); // Don't scale up beyond 1x
      setAutoScale(calculatedScale);
    };

    // Initial calculation
    const timeoutId = setTimeout(updateScale, 100);

    // Watch for container size changes
    const resizeObserver = new ResizeObserver(() => {
      updateScale();
    });

    const container = containerRef.current?.parentElement;
    if (container) {
      resizeObserver.observe(container);
    }

    // Also listen to window resize
    window.addEventListener('resize', updateScale);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [manualScale, shellW, shellH]);

  const finalScale = manualScale !== undefined ? manualScale : autoScale;

  return (
    <div
      ref={containerRef}
      className={cn('w-fit', className)}
      style={{ transform: `scale(${finalScale})`, transformOrigin: 'center center' }}
    >
      {/* Outer shell */}
      <div
        className="relative rounded-[56px] bg-zinc-950 dark:bg-gray-300 shadow-2xl"
        style={{ width: shellW, height: shellH }}
      >
        {/* Side buttons (purely decorative) */}
        <div className="absolute -left-[3px] top-[130px] h-10 w-[3px] rounded-l bg-zinc-800 dark:bg-gray-500" />
        <div className="absolute -left-[3px] top-[190px] h-14 w-[3px] rounded-l bg-zinc-800 dark:bg-gray-500" />
        <div className="absolute -left-[3px] top-[270px] h-14 w-[3px] rounded-l bg-zinc-800 dark:bg-gray-500" />
        <div className="absolute -right-[3px] top-[200px] h-20 w-[3px] rounded-r bg-zinc-800 dark:bg-gray-500" />

        {/* Inner bezel */}
        <div className="absolute inset-[6px] rounded-[50px] bg-zinc-900 dark:bg-gray-400" />

        {/* Screen */}
        <div
          className="absolute overflow-hidden rounded-[44px] bg-background"
          style={{
            left: shellPad,
            top: shellPad,
            width,
            height,
          }}
        >
          {/* Status Bar */}
          <div className="absolute top-0 left-0 right-0 h-12 z-10 flex items-center justify-between px-10 text-foreground">
            {/* Left side - Time */}
            <div className="text-[13px] font-semibold">
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>

            {/* Right side - Battery */}
            <div className="flex items-center gap-1.5">
              <svg width="25" height="12" viewBox="0 0 25 12" fill="none" className="text-foreground">
                <rect x="0.5" y="0.5" width="20" height="11" rx="2.5" stroke="currentColor" opacity="0.4"/>
                <path d="M23 4V8C24.1046 7.66122 24.1046 4.33878 23 4Z" fill="currentColor" opacity="0.4"/>
                <rect x="2" y="2" width="17" height="8" rx="1.5" fill="currentColor"/>
              </svg>
            </div>
          </div>

          {/* Notch */}
          <div className="absolute left-1/2 top-[10px] z-20 -translate-x-1/2">
            <div className="relative h-[26px] w-[160px] rounded-full bg-zinc-950 dark:bg-gray-300">
              {/* speaker */}
              <div className="absolute left-1/2 top-1/2 h-[6px] w-[52px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-800 dark:bg-gray-500" />
              {/* camera dot */}
              <div className="absolute right-[22px] top-1/2 h-[8px] w-[8px] -translate-y-1/2 rounded-full bg-zinc-700 dark:bg-gray-600" />
            </div>
          </div>

          {/* Safe area spacer under notch */}
          <div className="h-12" />

          {/* App content */}
          <div className="h-[calc(100%-3rem)] overflow-auto">{children}</div>
        </div>

        {/* Bottom home indicator (modern iPhone) */}
        <div className="absolute bottom-[18px] left-1/2 h-[5px] w-[140px] -translate-x-1/2 rounded-full bg-zinc-700/60 dark:bg-gray-600/60" />
      </div>
    </div>
  );
};




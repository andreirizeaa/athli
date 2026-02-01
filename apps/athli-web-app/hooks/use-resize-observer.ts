import { useEffect, useState, RefObject } from 'react';

interface DOMRectLike {
    width: number;
    height: number;
    top: number;
    left: number;
}

export const useResizeObserver = <T extends HTMLElement>(
    ref: RefObject<T | null>
): DOMRectLike | null => {
    const [rect, setRect] = useState<DOMRectLike | null>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        let rafId: number | null = null;

        const updateRect = () => {
            const bounding = element.getBoundingClientRect();
            setRect({
                width: bounding.width,
                height: bounding.height,
                top: bounding.top,
                left: bounding.left,
            });
        };

        const throttledUpdate = () => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                updateRect();
                rafId = null;
            });
        };

        // Initial measurement
        updateRect();

        // Observe resizes
        const resizeObserver = new ResizeObserver(() => {
            throttledUpdate();
        });

        resizeObserver.observe(element);

        // Listen for window resize only - ResizeObserver handles element size changes
        window.addEventListener('resize', throttledUpdate, { passive: true });

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', throttledUpdate);
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
        };
    }, [ref]);

    return rect;
};

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

        const updateRect = () => {
            const bounding = element.getBoundingClientRect();
            setRect({
                width: bounding.width,
                height: bounding.height,
                top: bounding.top,
                left: bounding.left,
            });
        };

        // Initial measurement
        updateRect();

        // Observe resizes
        const resizeObserver = new ResizeObserver(() => {
            updateRect();
        });

        resizeObserver.observe(element);

        // Also listen for window resize/scroll as getBoundingClientRect depends on viewport
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, true); // Capture phase for all scrollable parents

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
        };
    }, [ref]);

    return rect;
};

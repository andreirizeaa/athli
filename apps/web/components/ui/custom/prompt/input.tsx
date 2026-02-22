"use client";

import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/general/utils";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";

type PromptInputContextType = {
    isLoading: boolean;
    value: string;
    setValue: (value: string) => void;
    maxHeight: number | string;
    onSubmit?: () => void;
    disabled?: boolean;
};

const PromptInputContext = createContext<PromptInputContextType>({
    isLoading: false,
    value: "",
    setValue: () => { },
    maxHeight: 240,
    onSubmit: undefined,
    disabled: false
});

function usePromptInput() {
    const context = useContext(PromptInputContext);
    if (!context) {
        throw new Error("usePromptInput must be used within a Input");
    }
    return context;
}

type PromptInputProps = {
    isLoading?: boolean;
    value?: string;
    onValueChange?: (value: string) => void;
    maxHeight?: number | string;
    onSubmit?: () => void;
    children: React.ReactNode;
    className?: string;
};

function Input({
    className,
    isLoading = false,
    maxHeight = 240,
    value,
    onValueChange,
    onSubmit,
    children
}: PromptInputProps) {
    const [internalValue, setInternalValue] = useState(value || "");

    const handleChange = (newValue: string) => {
        setInternalValue(newValue);
        onValueChange?.(newValue);
    };

    return (
        <TooltipProvider>
            <PromptInputContext.Provider
                value={{
                    isLoading,
                    value: value ?? internalValue,
                    setValue: onValueChange ?? handleChange,
                    maxHeight,
                    onSubmit
                }}>
                <div
                    className={cn("border-input bg-background rounded-2xl border p-2", className)}>
                    {children}
                </div>
            </PromptInputContext.Provider>
        </TooltipProvider>
    );
}

export type PromptInputTextareaProps = {
    disableAutosize?: boolean;
} & React.ComponentProps<typeof Textarea>;

const PromptInputTextarea = React.forwardRef<HTMLTextAreaElement, PromptInputTextareaProps>(
    function PromptInputTextarea({
        className,
        onKeyDown,
        disableAutosize = false,
        ...props
    }, forwardedRef) {
        const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput();
        const internalRef = useRef<HTMLTextAreaElement>(null);
        const [isMounted, setIsMounted] = useState(false);

        // Merge internal and forwarded refs
        const textareaRef = (forwardedRef as React.RefObject<HTMLTextAreaElement>) || internalRef;

        // Track mount state to trigger initial sizing
        useEffect(() => {
            setIsMounted(true);
        }, []);

        // Auto-resize textarea based on content
        useEffect(() => {
            if (disableAutosize) return;
            if (!textareaRef.current || !isMounted) return;

            const textarea = textareaRef.current;
            // Reset height to calculate proper scrollHeight
            textarea.style.height = "0px";
            const scrollHeight = textarea.scrollHeight;
            // Apply constrained height (minimum 44px for single line)
            const minHeight = 44;
            const constrainedHeight = typeof maxHeight === "number"
                ? Math.max(minHeight, Math.min(scrollHeight, maxHeight))
                : Math.max(minHeight, scrollHeight);
            textarea.style.height = `${constrainedHeight}px`;
        }, [value, maxHeight, disableAutosize, isMounted, textareaRef]);

        const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit?.();
            }
            onKeyDown?.(e);
        };

        return (
            <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className={cn(
                    "dark:bg-background min-h-[44px] w-full resize-none border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                    className
                )}
                rows={1}
                disabled={disabled}
                {...props}
            />
        );
    }
);

type PromptInputActionsProps = React.HTMLAttributes<HTMLDivElement>;

function PromptInputActions({ children, className, ...props }: PromptInputActionsProps) {
    return (
        <div className={cn("flex items-center gap-2", className)} {...props}>
            {children}
        </div>
    );
}

type PromptInputActionProps = {
    className?: string;
    tooltip: React.ReactNode;
    children: React.ReactNode;
    side?: "top" | "bottom" | "left" | "right";
} & React.ComponentProps<typeof Tooltip>;

function PromptInputAction({
    tooltip,
    children,
    className,
    side = "top",
    ...props
}: PromptInputActionProps) {
    const { disabled } = usePromptInput();

    return (
        <Tooltip {...props}>
            <TooltipTrigger asChild disabled={disabled}>
                {children}
            </TooltipTrigger>
            <TooltipContent side={side} className={className}>
                {tooltip}
            </TooltipContent>
        </Tooltip>
    );
}

export { Input, PromptInputTextarea, PromptInputActions, PromptInputAction };

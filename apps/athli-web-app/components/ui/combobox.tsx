"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/general/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ComboboxOption {
  label: string;
  value: string;
  avatarUrl?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  renderOption?: (option: ComboboxOption, isSelected: boolean) => React.ReactNode;
  renderSelected?: (option: ComboboxOption) => React.ReactNode;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  disabled = false,
  renderOption,
  renderSelected,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal bg-sidebar border-muted-foreground/20 hover:border-primary/50 transition-colors",
            !value && "text-muted-foreground",
            className
          )}
        >
          {selectedOption ? (
            renderSelected ? (
              renderSelected(selectedOption)
            ) : (
              <span className="text-sm truncate">{selectedOption.label}</span>
            )
          ) : (
            <span className="text-sm truncate">{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = value === option.value;
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onValueChange(option.value === value ? "" : option.value);
                      setOpen(false);
                    }}
                    className="text-sm justify-between"
                  >
                    {renderOption ? (
                      <>
                        {renderOption(option, isSelected)}
                        <Check
                          className={cn(
                            "ml-2 h-4 w-4 shrink-0",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </>
                    ) : (
                      <>
                        {option.label}
                        <Check
                          className={cn(
                            "ml-2 h-4 w-4 shrink-0",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

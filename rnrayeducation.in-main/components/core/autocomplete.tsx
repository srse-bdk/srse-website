"use client";

import { Check, ChevronsUpDown, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface AutocompleteOption {
  value: string;
  label: string;
  disabled?: boolean;
  subLabel?: string;
}

interface AutocompleteProps {
  options: AutocompleteOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

export function Autocomplete({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  emptyMessage = "No option found.",
  disabled = false,
  className,
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Reset search when dropdown closes
  React.useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const handleSelect = (optionValue: string) => {
    // Guard against undefined/null - only accept valid strings
    if (optionValue === undefined || optionValue === null) {
      setOpen(false);
      return;
    }

    onChange(optionValue);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md"
          >
            {/* Search Input */}
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Options List */}
            <div className="max-h-[300px] overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredOptions.map((option, index) => {
                    const isOptionDisabled = option.disabled;
                    return (
                      <motion.button
                        key={`${option.value}-${index}`}
                        type="button"
                        onClick={() => !isOptionDisabled && handleSelect(option.value)}
                        disabled={isOptionDisabled}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className={cn(
                          "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                          "hover:bg-accent hover:text-accent-foreground",
                          "focus:bg-accent focus:text-accent-foreground",
                          value === option.value && "bg-accent text-accent-foreground",
                          isOptionDisabled && "cursor-not-allowed opacity-50 bg-muted/50"
                        )}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 flex-shrink-0",
                            value === option.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col items-start min-w-0">
                          <span className="truncate w-full text-left">{option.label}</span>
                          {option.subLabel && (
                            <span className="text-[10px] text-muted-foreground truncate w-full text-left font-medium">
                              {option.subLabel}
                            </span>
                          )}
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

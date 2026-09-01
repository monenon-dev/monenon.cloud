"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { mergeIndustryOptions } from "@/lib/agent-settings-store";
import { cn } from "@/lib/utils";

type IndustryComboboxProps = {
  value: string | null;
  customIndustries: string[];
  onChange: (industry: string | null) => void;
  onAddCustom: (label: string) => void;
};

export function IndustryCombobox({
  value,
  customIndustries,
  onChange,
  onAddCustom,
}: IndustryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = useMemo(
    () => mergeIndustryOptions(customIndustries),
    [customIndustries]
  );

  const trimmedQuery = query.trim();
  const filtered = useMemo(() => {
    if (!trimmedQuery) return options;
    const lower = trimmedQuery.toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(lower));
  }, [options, trimmedQuery]);

  const canAddCustom =
    trimmedQuery.length > 0 &&
    !options.some((opt) => opt.toLowerCase() === trimmedQuery.toLowerCase());

  const selectIndustry = (label: string) => {
    onChange(label);
    setOpen(false);
    setQuery("");
  };

  const confirmAddCustom = () => {
    if (!canAddCustom) return;
    onAddCustom(trimmedQuery);
    onChange(trimmedQuery);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-label="업종 선택"
            className={cn(
              "flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm",
              "text-gray-900 hover:border-indigo-400/50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            )}
          >
            <span className={value ? "text-gray-900 dark:text-gray-100" : "text-gray-500"}>
              {value ?? "업종 검색 또는 선택…"}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 dark:border-gray-700 dark:bg-gray-900"
          align="start"
        >
          <Command shouldFilter={false} className="dark:bg-gray-900">
            <CommandInput
              placeholder="업종 검색…"
              value={query}
              onValueChange={setQuery}
              className="dark:text-gray-100"
            />
            <CommandList>
              {filtered.length === 0 && !canAddCustom ? (
                <CommandEmpty className="py-4 text-sm text-gray-500">일치하는 업종이 없습니다.</CommandEmpty>
              ) : null}
              {filtered.length > 0 ? (
                <CommandGroup heading="업종">
                  {filtered.map((opt) => (
                    <CommandItem
                      key={opt}
                      value={opt}
                      onSelect={() => selectIndustry(opt)}
                      className="cursor-pointer dark:text-gray-100"
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4",
                          value === opt ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {opt}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {canAddCustom ? (
                <CommandGroup>
                  <CommandItem
                    onSelect={confirmAddCustom}
                    className="cursor-pointer text-indigo-600 dark:text-indigo-400"
                  >
                    새 항목 추가: {trimmedQuery}
                  </CommandItem>
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-950/50 dark:text-indigo-200"
        >
          {value}
          <X size={14} aria-hidden />
          <span className="sr-only">업종 제거</span>
        </button>
      ) : null}
    </div>
  );
}

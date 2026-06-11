"use client";

import {
  MultiSelectAutocomplete,
  type MultiSelectAutocompleteOption,
} from "@/components/core/multi-select-autocomplete";
import { Label } from "@/components/ui/label";

interface IdCardPrintExcludePickerProps {
  options: MultiSelectAutocompleteOption[];
  excludedIds: string[];
  onExcludedIdsChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function IdCardPrintExcludePicker({
  options,
  excludedIds,
  onExcludedIdsChange,
  disabled = false,
}: IdCardPrintExcludePickerProps) {
  if (options.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label>Exclude from this print run</Label>
      <MultiSelectAutocomplete
        options={options}
        value={excludedIds}
        onChange={onExcludedIdsChange}
        placeholder="Search and select people to skip…"
        emptyMessage="No matching people in the current list."
        disabled={disabled}
      />
      <p className="text-xs text-muted-foreground">
        Selected people will not appear on sheets for this run only (not saved
        permanently).
      </p>
    </div>
  );
}

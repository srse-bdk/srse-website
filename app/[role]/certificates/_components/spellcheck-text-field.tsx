"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** Browser spell-check and auto-correction for manual letter text. */
export const spellcheckInputProps = {
  spellCheck: true,
  autoCorrect: "on" as const,
  autoCapitalize: "sentences" as const,
};

export function SpellcheckInput(
  props: React.ComponentProps<typeof Input>,
) {
  return <Input {...spellcheckInputProps} {...props} />;
}

export function SpellcheckTextarea(
  props: React.ComponentProps<typeof Textarea>,
) {
  return <Textarea {...spellcheckInputProps} {...props} />;
}

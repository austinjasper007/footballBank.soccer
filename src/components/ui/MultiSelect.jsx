"use client";

import { Check, ChevronDown } from "lucide-react";

const normalizeValues = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

export function MultiSelect({
  label,
  placeholder = "Select options",
  options,
  value,
  onChange,
}) {
  const selectedValues = normalizeValues(value);
  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);

  const toggleValue = (optionValue) => {
    const nextValues = selectedValues.includes(optionValue)
      ? selectedValues.filter((item) => item !== optionValue)
      : [...selectedValues, optionValue];
    onChange(nextValues);
  };

  return (
    <div className="relative">
      {label && <p className="mb-2 text-sm font-medium">{label}</p>}
      <details className="group">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
          <span className={selectedLabels.length ? "text-foreground" : "text-muted-foreground"}>
            {selectedLabels.length ? selectedLabels.join(", ") : placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {options.map((option) => {
            const checked = selectedValues.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent"
              >
                <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border ${checked ? "border-primary-action bg-primary-action text-primary-text-inverse" : "border-input"}`}>
                  {checked && <Check className="size-3" />}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleValue(option.value)}
                  className="sr-only"
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </details>
    </div>
  );
}
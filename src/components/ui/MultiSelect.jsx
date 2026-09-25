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
  const visibleLabels = selectedLabels.slice(0, 2);
  const remainingCount = selectedLabels.length - visibleLabels.length;

  const toggleValue = (optionValue) => {
    const nextValues = selectedValues.includes(optionValue)
      ? selectedValues.filter((item) => item !== optionValue)
      : [...selectedValues, optionValue];
    onChange(nextValues);
  };

  return (
    <div className="relative">
      {label && <p className="mb-2 text-sm font-medium text-primary-text">{label}</p>}
      <details className="group">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-divider bg-primary-card px-3 py-2 text-sm text-primary-text shadow-sm outline-none transition-colors hover:border-primary-action/60 focus-visible:ring-2 focus-visible:ring-primary-action/30 group-open:border-primary-action [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {selectedLabels.length ? (
              <>
                {visibleLabels.map((selectedLabel) => (
                  <span
                    key={selectedLabel}
                    className="max-w-[45%] truncate rounded-full bg-primary-action/10 px-2 py-1 text-xs font-medium text-primary-action"
                  >
                    {selectedLabel}
                  </span>
                ))}
                {remainingCount > 0 && (
                  <span className="shrink-0 rounded-full bg-secondary-bg-alt px-2 py-1 text-xs font-medium text-primary-muted">
                    +{remainingCount} more
                  </span>
                )}
              </>
            ) : (
              <span className="text-primary-muted">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="size-4 shrink-0 text-primary-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-divider bg-primary-card p-1.5 text-primary-text shadow-lg">
          {options.map((option) => {
            const checked = selectedValues.includes(option.value);
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-2 rounded-md px-2.5 py-2 text-sm transition-colors ${checked ? "bg-primary-action/10 text-primary-action" : "hover:bg-secondary-bg-alt"}`}
              >
                <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border ${checked ? "border-primary-action bg-primary-action text-primary-text-inverse" : "border-divider bg-primary-card"}`}>
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
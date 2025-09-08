import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import GooglePlacesAutocomplete from "@/components/google-places-autocomplete";

interface PlaceChip {
  id: string;
  label: string;
}

interface GooglePlacesMultiProps {
  value: string; // comma-separated
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  className?: string;
  types?: string;
}

function GooglePlacesMultiImpl({
  value,
  onChange,
  placeholder = "Where are you going?",
  id,
  name,
  className = "",
  types = "(cities)",
}: GooglePlacesMultiProps) {
  const [inputValue, setInputValue] = useState("");
  const [chips, setChips] = useState<PlaceChip[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizeListString = useCallback((s: string) => {
    const items = (s || "")
      .split(",") // accept both "," and ", " forms
      .map((p) => p.trim())
      .filter(Boolean);
    // de-duplicate case-insensitively, preserve order
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of items) {
      const key = item.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }
    return result.join(", ");
  }, []);

  // Initialize/sync from comma-separated value, but avoid feedback loop
  useEffect(() => {
    const currentJoined = normalizeListString(chips.map((c) => c.label).join(", "));
    const external = normalizeListString(value || "");
    if (external === currentJoined) return; // no change needed

    const parsed = (external ? external.split(", ") : [])
      .map((s) => s.trim())
      .filter(Boolean);
    setChips(
      parsed.map((label, idx) => ({ id: `${idx}-${label.toLowerCase()}`, label }))
    );
  }, [value, normalizeListString]);

  // Emit changes on chips update (light debounce to avoid rapid parent re-renders)
  useEffect(() => {
    const joined = normalizeListString(chips.map((c) => c.label).join(", "));
    const external = normalizeListString(value);
    if (joined === external) return;
    const t = setTimeout(() => {
      onChange(joined);
    }, 120);
    return () => clearTimeout(t);
  }, [chips, value, onChange, normalizeListString]);

  const handleAdd = useCallback((label: string, placeId?: string) => {
    const normalized = label.trim();
    if (!normalized) return;
    // Avoid duplicates (case-insensitive)
    const exists = chips.some(
      (c) => c.label.toLowerCase() === normalized.toLowerCase()
    );
    if (exists) return;
    setChips((prev) => [
      ...prev,
      { id: placeId || `${Date.now()}`, label: normalized },
    ]);
    setInputValue("");
  }, [chips]);

  const removeChip = useCallback((id: string) => {
    setChips((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return (
    <div className={className}>
      {/* Chips */}
      {chips.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <div
              key={chip.id}
              className="inline-flex items-center rounded-full bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 text-sm"
            >
              <span className="mr-2">{chip.label}</span>
              <button
                type="button"
                onClick={() => removeChip(chip.id)}
                className="text-blue-600 hover:text-blue-800"
                aria-label={`Remove ${chip.label}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Autocomplete input */}
      <GooglePlacesAutocomplete
        id={id}
        name={name}
        value={inputValue}
        onChange={setInputValue}
        onPlaceSelect={(place) => {
          // Prefer a concise label (city name) to avoid internal commas splitting
          const label = place.name || place.formatted_address || "";
          handleAdd(label, place.place_id);
        }}
        placeholder={placeholder}
        types={types}
      />
    </div>
  );
}

const GooglePlacesMulti = memo(GooglePlacesMultiImpl);

export default GooglePlacesMulti;

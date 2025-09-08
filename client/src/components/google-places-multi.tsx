import React, { useEffect, useMemo, useRef, useState } from "react";
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

export default function GooglePlacesMulti({
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

  // Initialize from comma-separated value
  useEffect(() => {
    const parsed = (value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setChips(
      parsed.map((label, idx) => ({ id: `${idx}-${label.toLowerCase()}`, label }))
    );
  }, [value]);

  // Emit changes on chips update
  useEffect(() => {
    const joined = chips.map((c) => c.label).join(", ");
    if (joined !== value) onChange(joined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chips]);

  const handleAdd = (label: string, placeId?: string) => {
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
  };

  const removeChip = (id: string) => {
    setChips((prev) => prev.filter((c) => c.id !== id));
  };

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
          const label = place.formatted_address || place.name;
          handleAdd(label, place.place_id);
        }}
        placeholder={placeholder}
        types={types}
      />
    </div>
  );
}

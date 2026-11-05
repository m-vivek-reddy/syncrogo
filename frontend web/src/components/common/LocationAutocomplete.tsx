import React, { useEffect, useRef, useState } from 'react';
import { LoaderCircle, MapPin } from 'lucide-react';

export type LocationSuggestion = {
  label: string;      // short name, e.g. "MG Road, Bengaluru"
  detail: string;     // full relative description, e.g. "MG Road, Bengaluru, Karnataka, India"
  lat: number;
  lon: number;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (s: LocationSuggestion) => void;
  placeholder?: string;
  busy?: boolean;
  className?: string;
  errorHint?: string | null;
  near?: { lat: number; lon: number };
  onFocus?: () => void;
  /** Called on blur if the user did not pick a suggestion (falls back to a single geocode). */
  onBlurFallback?: () => void;
};

const MIN_CHARS = 3;
const DEBOUNCE_MS = 350;

/** Trim a Nominatim address down to a readable, relative description. */
const shortLabel = (parts: string[]) => parts.slice(0, 3).join(', ');

const toSuggestion = (item: any): LocationSuggestion => {
  const parts: string[] = Array.isArray(item.display_name) ? item.display_name : String(item.display_name).split(',');
  const clean = parts.map((p) => String(p).trim()).filter(Boolean);
  return {
    label: shortLabel(clean),
    detail: clean.join(', '),
    lat: +item.lat,
    lon: +item.lon,
  };
};

export const LocationAutocomplete: React.FC<Props> = ({ value, onChange, onSelect, placeholder, busy, className = '', errorHint, near, onFocus, onBlurFallback }) => {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [items, setItems] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);
  const pickedRef = useRef(false);

  // Debounced search as the user types.
  useEffect(() => {
    const q = value.trim();
    const id = ++reqId.current;
    if (!focused || q.length < MIN_CHARS || pickedRef.current) { setItems([]); setLoading(false); return; }
    const viewbox = near ? `&viewbox=${near.lon - 0.5},${near.lat + 0.5},${near.lon + 0.5},${near.lat - 0.5}` : '';
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in${viewbox}&q=${encodeURIComponent(q)}`,
        );
        const data = await res.json();
        if (reqId.current !== id) return;
        const list = Array.isArray(data) ? data.map(toSuggestion) : [];
        setItems(list);
        setActive(0);
        setOpen(true);
      } catch { /* silently ignore autocomplete errors */ }
      finally { if (reqId.current === id) setLoading(false); }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, near?.lat, near?.lon, focused]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const choose = (s: LocationSuggestion) => {
    pickedRef.current = true;
    onChange(s.label);
    onSelect(s);
    setOpen(false);
    setItems([]);
  };

  const handleBlur = () => {
    setFocused(false);
    setOpen(false);
    if (pickedRef.current) { pickedRef.current = false; return; }
    onBlurFallback?.();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + items.length) % items.length); }
    else if (e.key === 'Enter' && items[active]) { e.preventDefault(); choose(items[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={boxRef} className="relative mt-2">
      <input
        required
        value={value}
        onChange={(e) => { pickedRef.current = false; onChange(e.target.value); }}
        onBlur={handleBlur}
        onFocus={() => { setFocused(true); onFocus?.(); if (items.length > 0) setOpen(true); }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 pr-10 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/15 ${className}`}
      />
      {(busy || loading) && <LoaderCircle className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-green-600" />}

      {open && items.length > 0 && (
        <ul className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg" role="listbox">
          {items.map((s, i) => (
            <li key={`${s.lat},${s.lon},${i}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(s)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition ${i === active ? 'bg-green-50' : 'bg-white'}`}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-700">{s.label}</span>
                  <span className="block truncate text-[11px] text-slate-400">{s.detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {errorHint && <span className="mt-1 block text-[10px] font-normal text-slate-400">{errorHint}</span>}
    </div>
  );
};

export default LocationAutocomplete;

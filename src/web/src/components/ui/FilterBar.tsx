/**
 * FilterBar - Unified filter/search/sort controls for discovery pages.
 * 
 * Replaces the old stats cards with actionable filter dropdowns that help
 * motorsport enthusiasts discover content.
 */
import { useCallback, useRef, useEffect } from 'react';
import type { FilterOption } from './filterOptions';

// =========================
// Types
// =========================

export interface FilterConfig {
  id: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

export interface FilterBarProps {
  /** Search input value */
  searchValue: string;
  /** Search input change handler */
  onSearchChange: (value: string) => void;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Sort options */
  sortOptions: FilterOption[];
  /** Current sort value */
  sortValue: string;
  /** Sort change handler */
  onSortChange: (value: string) => void;
  /** Additional filter configurations */
  filters?: FilterConfig[];
  /** Result count for display */
  resultCount?: number;
  /** Label for results (e.g., "drivers", "teams") */
  resultLabel?: string;
  /** Whether data is loading */
  isLoading?: boolean;
}

// =========================
// Subcomponents
// =========================

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function SearchInput({ value, onChange, placeholder = 'Search...' }: SearchInputProps) {
  const DEBOUNCE_MS = 300;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      onChange(newValue);
    }, DEBOUNCE_MS);
    
    // Update local input immediately for responsiveness
    if (inputRef.current) {
      inputRef.current.value = newValue;
    }
  }, [onChange]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Sync external value changes
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  return (
    <div className="relative flex-1 min-w-52">
      <svg 
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 pointer-events-none" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-neutral-800/80 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pf-green/50 focus:bg-neutral-800 transition-all"
      />
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function FilterSelect({ label, options, value, onChange, className = '' }: FilterSelectProps) {
  return (
    <div className={`relative ${className}`}>
      <label className="sr-only">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-8 py-2.5 bg-neutral-800/80 border border-neutral-700 rounded-lg text-neutral-100 focus:outline-none focus:border-pf-green/50 focus:bg-neutral-800 transition-all cursor-pointer text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.icon ? `${option.icon} ` : ''}{option.label}
          </option>
        ))}
      </select>
      <svg 
        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

interface ActiveFilterBadgeProps {
  label: string;
  value: string;
  onClear: () => void;
}

function ActiveFilterBadge({ label, value, onClear }: ActiveFilterBadgeProps) {
  return (
    <button
      onClick={onClear}
      className="group inline-flex items-center gap-1.5 px-3 py-1 bg-pf-green/10 border border-pf-green/20 rounded-full text-sm hover:bg-pf-green/20 transition-colors"
      aria-label={`Clear ${label} filter`}
    >
      <span className="text-neutral-400 text-xs">{label}:</span>
      <span className="text-pf-green font-medium">{value}</span>
      <svg className="w-3.5 h-3.5 text-pf-green/70 group-hover:text-pf-green transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

// =========================
// Main Component
// =========================

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  sortOptions,
  sortValue,
  onSortChange,
  filters = [],
  resultCount,
  resultLabel = 'results',
  isLoading = false,
}: FilterBarProps) {
  // Collect active filters for badge display
  const activeFilters = filters.filter(f => f.value && f.value !== 'all' && f.value !== '');
  const hasActiveFilters = activeFilters.length > 0 || searchValue.trim().length > 0;

  return (
    <div className="space-y-4 mb-6">
      {/* Main filter row */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
        />
        
        {/* Filter dropdowns */}
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <FilterSelect
              key={filter.id}
              label={filter.label}
              options={filter.options}
              value={filter.value}
              onChange={filter.onChange}
            />
          ))}
          
          {/* Sort dropdown - always last */}
          <FilterSelect
            label="Sort by"
            options={sortOptions}
            value={sortValue}
            onChange={onSortChange}
            className="border-l border-neutral-700 pl-2"
          />
        </div>
      </div>
      
      {/* Active filters bar + result count */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Result count */}
        {resultCount !== undefined && (
          <div className="text-sm text-neutral-400">
            {isLoading ? (
              <span className="animate-pulse">Loading...</span>
            ) : (
              <>
                <span className="text-neutral-100 font-medium">{resultCount.toLocaleString()}</span>
                {' '}{resultLabel}
              </>
            )}
          </div>
        )}
        
        {/* Active filter badges */}
        {hasActiveFilters && (
          <>
            <div className="w-px h-4 bg-neutral-700" />
            {searchValue.trim() && (
              <ActiveFilterBadge
                label="Search"
                value={`"${searchValue}"`}
                onClear={() => onSearchChange('')}
              />
            )}
            {activeFilters.map((filter) => {
              const selectedOption = filter.options.find(o => o.value === filter.value);
              return (
                <ActiveFilterBadge
                  key={filter.id}
                  label={filter.label}
                  value={selectedOption?.label || filter.value}
                  onClear={() => filter.onChange('')}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

export default FilterBar;

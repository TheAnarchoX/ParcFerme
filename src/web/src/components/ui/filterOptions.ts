/**
 * Filter options constants for discovery pages.
 * Separated from FilterBar component for better Fast Refresh support.
 */

export interface FilterOption {
  value: string;
  label: string;
  icon?: string;
}

export const SERIES_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Series', icon: '🏁' },
  { value: 'formula-1', label: 'Formula 1', icon: '🏎️' },
  { value: 'motogp', label: 'MotoGP', icon: '🏍️' },
  { value: 'wec', label: 'WEC', icon: '🏎️' },
  { value: 'indycar', label: 'IndyCar', icon: '🏎️' },
  { value: 'formula-e', label: 'Formula E', icon: '⚡' },
  { value: 'nascar', label: 'NASCAR', icon: '🏁' },
];

export const NATIONALITY_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Nationalities', icon: '🌍' },
  // Top motorsport nations
  { value: 'British', label: 'British', icon: '🇬🇧' },
  { value: 'German', label: 'German', icon: '🇩🇪' },
  { value: 'Italian', label: 'Italian', icon: '🇮🇹' },
  { value: 'French', label: 'French', icon: '🇫🇷' },
  { value: 'Spanish', label: 'Spanish', icon: '🇪🇸' },
  { value: 'Dutch', label: 'Dutch', icon: '🇳🇱' },
  { value: 'American', label: 'American', icon: '🇺🇸' },
  { value: 'Brazilian', label: 'Brazilian', icon: '🇧🇷' },
  { value: 'Australian', label: 'Australian', icon: '🇦🇺' },
  { value: 'Finnish', label: 'Finnish', icon: '🇫🇮' },
  { value: 'Japanese', label: 'Japanese', icon: '🇯🇵' },
  { value: 'Mexican', label: 'Mexican', icon: '🇲🇽' },
  { value: 'Canadian', label: 'Canadian', icon: '🇨🇦' },
  { value: 'Austrian', label: 'Austrian', icon: '🇦🇹' },
  { value: 'Belgian', label: 'Belgian', icon: '🇧🇪' },
  { value: 'Swiss', label: 'Swiss', icon: '🇨🇭' },
  { value: 'Monégasque', label: 'Monegasque', icon: '🇲🇨' },
  { value: 'Thai', label: 'Thai', icon: '🇹🇭' },
  { value: 'Chinese', label: 'Chinese', icon: '🇨🇳' },
];

export const DRIVER_STATUS_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Drivers', icon: '👤' },
  { value: 'active', label: 'Active (Recent)', icon: '🟢' },
  { value: 'legend', label: 'Legends (Historical)', icon: '🏆' },
];

export const REGION_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Regions', icon: '🌍' },
  { value: 'europe', label: 'Europe', icon: '🇪🇺' },
  { value: 'americas', label: 'Americas', icon: '🌎' },
  { value: 'asia-pacific', label: 'Asia Pacific', icon: '🌏' },
  { value: 'middle-east-africa', label: 'Middle East & Africa', icon: '🏜️' },
];

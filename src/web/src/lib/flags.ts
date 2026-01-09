/**
 * Centralized utilities for converting country codes to flag emoji.
 * Uses Unicode Regional Indicator Symbols (RIS) for ISO 3166-1 alpha-2 codes.
 */

/**
 * Convert a 2-letter ISO country code to a flag emoji.
 * Uses Unicode Regional Indicator Symbols (e.g., "US" → "🇺🇸").
 * 
 * @param countryCode - 2-letter ISO 3166-1 alpha-2 code (e.g., "US", "GB", "DE")
 * @returns Flag emoji or default flag if invalid
 */
export function countryCodeToFlag(countryCode?: string | null): string {
  if (!countryCode || countryCode.length !== 2) return '🏁';
  
  const code = countryCode.toUpperCase();
  
  // Validate that we have two ASCII letters
  if (!/^[A-Z]{2}$/.test(code)) return '🏁';
  
  // Convert each letter to its Regional Indicator Symbol
  // 'A' = 65, Regional Indicator 'A' = 127462 (0x1F1E6)
  // So: codePoint = charCode - 65 + 127462 = charCode + 127397
  const codePoints = code
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
}

/**
 * Mapping of nationality names to 2-letter ISO country codes.
 * This allows us to convert text nationalities to flag emoji.
 */
const NATIONALITY_TO_CODE: Record<string, string> = {
  // Common F1 nationalities - demonyms
  'Dutch': 'NL',
  'British': 'GB',
  'German': 'DE',
  'Spanish': 'ES',
  'French': 'FR',
  'Italian': 'IT',
  'Australian': 'AU',
  'Finnish': 'FI',
  'Mexican': 'MX',
  'Japanese': 'JP',
  'Canadian': 'CA',
  'American': 'US',
  'Thai': 'TH',
  'Chinese': 'CN',
  'Danish': 'DK',
  'Monégasque': 'MC',
  'Monacan': 'MC',
  'Brazilian': 'BR',
  'Argentine': 'AR',
  'Argentinian': 'AR',
  'Austrian': 'AT',
  'Belgian': 'BE',
  'Swiss': 'CH',
  'Swedish': 'SE',
  'Polish': 'PL',
  'New Zealander': 'NZ',
  'Russian': 'RU',
  'South African': 'ZA',
  'Indian': 'IN',
  'Indonesian': 'ID',
  'Colombian': 'CO',
  'Venezuelan': 'VE',
  'Portuguese': 'PT',
  'Irish': 'IE',
  'Malaysian': 'MY',
  'Korean': 'KR',
  'South Korean': 'KR',
  'Emirati': 'AE',
  'Saudi': 'SA',
  'Qatari': 'QA',
  'Bahraini': 'BH',
  'Azerbaijani': 'AZ',
  'Singaporean': 'SG',
  'Hungarian': 'HU',
  'Czech': 'CZ',
  'Norwegian': 'NO',
  'Estonian': 'EE',
  'Latvian': 'LV',
  'Lithuanian': 'LT',
  'Israeli': 'IL',
  'Turkish': 'TR',
  'Greek': 'GR',
  'Romanian': 'RO',
  'Bulgarian': 'BG',
  'Ukrainian': 'UA',
  'Moroccan': 'MA',
  'Egyptian': 'EG',
  'Chilean': 'CL',
  'Peruvian': 'PE',
  'Ecuadorian': 'EC',
  'Uruguayan': 'UY',
  'Paraguayan': 'PY',
  'Bolivian': 'BO',
  'Cuban': 'CU',
  'Vietnamese': 'VN',
  'Taiwanese': 'TW',
  'Filipino': 'PH',
  'Icelandic': 'IS',
  'Luxembourgish': 'LU',
  'Liechtensteiner': 'LI',

  // Country names (for fallback)
  'Netherlands': 'NL',
  'United Kingdom': 'GB',
  'UK': 'GB',
  'Great Britain': 'GB',
  'Germany': 'DE',
  'Spain': 'ES',
  'France': 'FR',
  'Italy': 'IT',
  'Australia': 'AU',
  'Finland': 'FI',
  'Mexico': 'MX',
  'Japan': 'JP',
  'Canada': 'CA',
  'United States': 'US',
  'USA': 'US',
  'Thailand': 'TH',
  'China': 'CN',
  'Denmark': 'DK',
  'Monaco': 'MC',
  'Brazil': 'BR',
  'Argentina': 'AR',
  'Austria': 'AT',
  'Belgium': 'BE',
  'Switzerland': 'CH',
  'Sweden': 'SE',
  'Poland': 'PL',
  'New Zealand': 'NZ',
  'Russia': 'RU',
  'South Africa': 'ZA',
  'India': 'IN',
  'Indonesia': 'ID',
  'Colombia': 'CO',
  'Venezuela': 'VE',
  'Portugal': 'PT',
  'Ireland': 'IE',
  'Malaysia': 'MY',
  'Korea': 'KR',
  'South Korea': 'KR',
  'UAE': 'AE',
  'United Arab Emirates': 'AE',
  'Saudi Arabia': 'SA',
  'Qatar': 'QA',
  'Bahrain': 'BH',
  'Azerbaijan': 'AZ',
  'Singapore': 'SG',
  'Hungary': 'HU',
  'Czech Republic': 'CZ',
  'Czechia': 'CZ',
  'Norway': 'NO',
  'Estonia': 'EE',
  'Latvia': 'LV',
  'Lithuania': 'LT',
  'Israel': 'IL',
  'Turkey': 'TR',
  'Greece': 'GR',
  'Romania': 'RO',
  'Bulgaria': 'BG',
  'Ukraine': 'UA',
  'Morocco': 'MA',
  'Egypt': 'EG',
  'Chile': 'CL',
  'Peru': 'PE',
  'Ecuador': 'EC',
  'Uruguay': 'UY',
  'Paraguay': 'PY',
  'Bolivia': 'BO',
  'Cuba': 'CU',
  'Vietnam': 'VN',
  'Taiwan': 'TW',
  'Philippines': 'PH',
  'Iceland': 'IS',
  'Luxembourg': 'LU',
  'Liechtenstein': 'LI',
};

/**
 * Get flag emoji from a nationality string (demonym or country name).
 * Falls back to country code if provided.
 * 
 * @param nationality - Nationality demonym (e.g., "Dutch") or country name
 * @param nationalityCode - Optional 2-letter ISO code as fallback
 * @returns Flag emoji or default flag
 */
export function nationalityToFlag(nationality?: string | null, nationalityCode?: string | null): string {
  // Try nationality code first if provided (most reliable)
  if (nationalityCode && nationalityCode.length === 2) {
    return countryCodeToFlag(nationalityCode);
  }
  
  if (!nationality) return '🏁';
  
  // Normalize and lookup
  const normalized = nationality.trim();
  const code = NATIONALITY_TO_CODE[normalized];
  
  if (code) {
    return countryCodeToFlag(code);
  }
  
  // If nationality looks like a 2-letter code, try it directly
  if (normalized.length === 2 && /^[A-Za-z]{2}$/.test(normalized)) {
    return countryCodeToFlag(normalized);
  }
  
  return '🏁';
}

/**
 * Get flag emoji from country name or code.
 * Best for circuit/location contexts.
 * 
 * @param country - Country name (e.g., "United States")
 * @param countryCode - 2-letter ISO code (e.g., "US")
 * @returns Flag emoji or default flag
 */
export function getCountryFlag(country?: string | null, countryCode?: string | null): string {
  // Prefer country code as it's more reliable
  if (countryCode && countryCode.length === 2) {
    return countryCodeToFlag(countryCode);
  }
  
  // Fallback to country name lookup
  return nationalityToFlag(country, null);
}

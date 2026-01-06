// NOTE: apiClient and response types are defined for future use when backend search API is implemented
// import { apiClient } from '../lib/api';
import type { SearchResult } from '../types/navigation';

// =========================
// Search API Types (for future use with real API)
// =========================

// These interfaces match the expected backend response format
// interface ApiSearchResult {
//   id: string;
//   type: string;
//   name: string;
//   subtitle?: string;
//   imageUrl?: string;
//   spoilerSafe: boolean;
// }

// interface SearchResponse {
//   results: ApiSearchResult[];
//   total: number;
// }

// =========================
// Search Service
// =========================

/**
 * Search API service for global search functionality.
 * All results are spoiler-safe by default.
 */
export const searchApi = {
  /**
   * Perform a global search across all entity types.
   * Returns spoiler-safe results based on user's spoiler mode.
   */
  globalSearch: async (query: string): Promise<SearchResult[]> => {
    // TODO: Replace with actual API call once backend endpoint exists
    // For now, return mock results to enable frontend development
    
    // Simulated API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mock search results based on query
    return mockSearch(query);
  },

  /**
   * Search for drivers only.
   */
  searchDrivers: async (query: string): Promise<SearchResult[]> => {
    // TODO: Implement when backend ready
    return mockSearch(query).filter(r => r.type === 'driver');
  },

  /**
   * Search for teams only.
   */
  searchTeams: async (query: string): Promise<SearchResult[]> => {
    return mockSearch(query).filter(r => r.type === 'team');
  },

  /**
   * Search for circuits only.
   */
  searchCircuits: async (query: string): Promise<SearchResult[]> => {
    return mockSearch(query).filter(r => r.type === 'circuit');
  },

  /**
   * Search for sessions only.
   */
  searchSessions: async (query: string): Promise<SearchResult[]> => {
    return mockSearch(query).filter(r => r.type === 'session');
  },
};

// =========================
// Mock Data (Development)
// =========================

const MOCK_DATA: SearchResult[] = [
  // Series
  { id: 'f1', type: 'series', title: 'Formula 1', path: '/series/f1', isSpoilerSafe: true },
  { id: 'motogp', type: 'series', title: 'MotoGP', path: '/series/motogp', isSpoilerSafe: true },
  { id: 'wec', type: 'series', title: 'World Endurance Championship', path: '/series/wec', isSpoilerSafe: true },
  { id: 'indycar', type: 'series', title: 'IndyCar Series', path: '/series/indycar', isSpoilerSafe: true },
  
  // Seasons
  { id: 'f1-2025', type: 'season', title: 'F1 2025', subtitle: 'Formula 1', path: '/series/f1/2025', isSpoilerSafe: true },
  { id: 'f1-2024', type: 'season', title: 'F1 2024', subtitle: 'Formula 1', path: '/series/f1/2024', isSpoilerSafe: true },
  { id: 'f1-2023', type: 'season', title: 'F1 2023', subtitle: 'Formula 1', path: '/series/f1/2023', isSpoilerSafe: true },
  
  // Drivers
  { id: 'd-verstappen', type: 'driver', title: 'Max Verstappen', subtitle: 'Red Bull Racing', path: '/drivers/max-verstappen', isSpoilerSafe: true },
  { id: 'd-hamilton', type: 'driver', title: 'Lewis Hamilton', subtitle: 'Ferrari', path: '/drivers/lewis-hamilton', isSpoilerSafe: true },
  { id: 'd-leclerc', type: 'driver', title: 'Charles Leclerc', subtitle: 'Ferrari', path: '/drivers/charles-leclerc', isSpoilerSafe: true },
  { id: 'd-norris', type: 'driver', title: 'Lando Norris', subtitle: 'McLaren', path: '/drivers/lando-norris', isSpoilerSafe: true },
  { id: 'd-piastri', type: 'driver', title: 'Oscar Piastri', subtitle: 'McLaren', path: '/drivers/oscar-piastri', isSpoilerSafe: true },
  { id: 'd-russell', type: 'driver', title: 'George Russell', subtitle: 'Mercedes', path: '/drivers/george-russell', isSpoilerSafe: true },
  { id: 'd-antonelli', type: 'driver', title: 'Kimi Antonelli', subtitle: 'Mercedes', path: '/drivers/kimi-antonelli', isSpoilerSafe: true },
  { id: 'd-alonso', type: 'driver', title: 'Fernando Alonso', subtitle: 'Aston Martin', path: '/drivers/fernando-alonso', isSpoilerSafe: true },
  { id: 'd-sainz', type: 'driver', title: 'Carlos Sainz', subtitle: 'Williams', path: '/drivers/carlos-sainz', isSpoilerSafe: true },
  
  // Teams
  { id: 't-redbull', type: 'team', title: 'Red Bull Racing', subtitle: 'Formula 1', path: '/teams/red-bull-racing', isSpoilerSafe: true },
  { id: 't-ferrari', type: 'team', title: 'Scuderia Ferrari', subtitle: 'Formula 1', path: '/teams/ferrari', isSpoilerSafe: true },
  { id: 't-mclaren', type: 'team', title: 'McLaren', subtitle: 'Formula 1', path: '/teams/mclaren', isSpoilerSafe: true },
  { id: 't-mercedes', type: 'team', title: 'Mercedes-AMG Petronas', subtitle: 'Formula 1', path: '/teams/mercedes', isSpoilerSafe: true },
  { id: 't-astonmartin', type: 'team', title: 'Aston Martin', subtitle: 'Formula 1', path: '/teams/aston-martin', isSpoilerSafe: true },
  { id: 't-williams', type: 'team', title: 'Williams', subtitle: 'Formula 1', path: '/teams/williams', isSpoilerSafe: true },
  
  // Circuits
  { id: 'c-monaco', type: 'circuit', title: 'Circuit de Monaco', subtitle: 'Monte Carlo, Monaco', path: '/circuits/monaco', isSpoilerSafe: true },
  { id: 'c-silverstone', type: 'circuit', title: 'Silverstone Circuit', subtitle: 'Silverstone, United Kingdom', path: '/circuits/silverstone', isSpoilerSafe: true },
  { id: 'c-monza', type: 'circuit', title: 'Autodromo Nazionale Monza', subtitle: 'Monza, Italy', path: '/circuits/monza', isSpoilerSafe: true },
  { id: 'c-spa', type: 'circuit', title: 'Circuit de Spa-Francorchamps', subtitle: 'Stavelot, Belgium', path: '/circuits/spa-francorchamps', isSpoilerSafe: true },
  { id: 'c-suzuka', type: 'circuit', title: 'Suzuka International Racing Course', subtitle: 'Suzuka, Japan', path: '/circuits/suzuka', isSpoilerSafe: true },
  { id: 'c-bahrain', type: 'circuit', title: 'Bahrain International Circuit', subtitle: 'Sakhir, Bahrain', path: '/circuits/bahrain', isSpoilerSafe: true },
  { id: 'c-jeddah', type: 'circuit', title: 'Jeddah Corniche Circuit', subtitle: 'Jeddah, Saudi Arabia', path: '/circuits/jeddah', isSpoilerSafe: true },
  { id: 'c-austin', type: 'circuit', title: 'Circuit of the Americas', subtitle: 'Austin, USA', path: '/circuits/austin', isSpoilerSafe: true },
  
  // Rounds
  { id: 'r-bahrain-2025', type: 'round', title: '2025 Bahrain Grand Prix', subtitle: 'F1 2025, Round 1', path: '/series/f1/2025/bahrain', isSpoilerSafe: true },
  { id: 'r-jeddah-2025', type: 'round', title: '2025 Saudi Arabian Grand Prix', subtitle: 'F1 2025, Round 2', path: '/series/f1/2025/saudi-arabia', isSpoilerSafe: true },
  { id: 'r-australia-2025', type: 'round', title: '2025 Australian Grand Prix', subtitle: 'F1 2025, Round 3', path: '/series/f1/2025/australia', isSpoilerSafe: true },
];

function mockSearch(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  
  return MOCK_DATA.filter(item => 
    item.title.toLowerCase().includes(q) ||
    item.subtitle?.toLowerCase().includes(q)
  ).slice(0, 10);
}

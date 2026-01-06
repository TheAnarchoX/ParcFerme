// Re-export all services for convenient importing
export { authApi } from './authService';
export { statusApi, type StatusResponse, type DetailedHealthResponse, type DependencyHealth, type DependencyHealthList } from './statusService';
export { spoilerApi, sessionsApi } from './spoilerService';
export { seriesApi, seasonsApi } from './seriesService';

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { statusApi, type DependencyHealth } from '../services';

type HealthStatus = 'loading' | 'healthy' | 'degraded' | 'error';

/** Static service definitions shown immediately */
const SERVICE_DEFINITIONS = [
  {
    key: 'database' as const,
    name: 'Database',
    description: 'Primary data store for users, sessions, logs, and reviews.',
    icon: '🗄️',
    isExternal: false,
    fetchHealth: () => statusApi.getDatabaseHealth(),
  },
  {
    key: 'redis' as const,
    name: 'Redis',
    description: 'Caching layer for API responses and session data.',
    icon: '⚡',
    isExternal: false,
    fetchHealth: () => statusApi.getRedisHealth(),
  },
  {
    key: 'openF1' as const,
    name: 'OpenF1',
    description: 'External API providing real-time F1 session and result data.',
    icon: '🏎️',
    isExternal: true,
    fetchHealth: () => statusApi.getOpenF1Health(),
  },
] as const;

type ServiceKey = typeof SERVICE_DEFINITIONS[number]['key'];

interface ServiceState {
  status: 'loading' | 'loaded' | 'error';
  data: DependencyHealth | null;
}

interface ApiInfo {
  service: string;
  version: string;
  timestamp: string;
}

interface HealthState {
  overallStatus: HealthStatus;
  services: Record<ServiceKey, ServiceState>;
  apiInfo: ApiInfo | null;
  error: string | null;
  lastChecked: Date | null;
}

const initialServiceStates: Record<ServiceKey, ServiceState> = {
  database: { status: 'loading', data: null },
  redis: { status: 'loading', data: null },
  openF1: { status: 'loading', data: null },
};

/**
 * Calculate overall status from individual service states.
 */
function calculateOverallStatus(services: Record<ServiceKey, ServiceState>): HealthStatus {
  const states = Object.values(services);
  
  // If any are still loading, overall is loading
  if (states.some(s => s.status === 'loading')) {
    return 'loading';
  }
  
  // If all failed to load, overall is error
  if (states.every(s => s.status === 'error')) {
    return 'error';
  }
  
  // Check if ALL services are healthy
  const allHealthy = states.every(s => s.data?.healthy === true);
  
  if (allHealthy) {
    return 'healthy';
  }
  
  // Any service unhealthy = degraded
  return 'degraded';
}

/**
 * Status page showing health of all system dependencies.
 */
export function StatusPage() {
  const [health, setHealth] = useState<HealthState>({
    overallStatus: 'loading',
    services: initialServiceStates,
    apiInfo: null,
    error: null,
    lastChecked: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Check a single service and update state progressively.
   */
  const checkService = useCallback(async (
    serviceKey: ServiceKey,
    fetchFn: () => Promise<DependencyHealth>
  ) => {
    try {
      const data = await fetchFn();
      setHealth(prev => {
        const newServices = {
          ...prev.services,
          [serviceKey]: { status: 'loaded' as const, data },
        };
        return {
          ...prev,
          services: newServices,
          overallStatus: calculateOverallStatus(newServices),
          lastChecked: new Date(),
        };
      });
    } catch (err) {
      setHealth(prev => {
        const newServices = {
          ...prev.services,
          [serviceKey]: { status: 'error' as const, data: null },
        };
        return {
          ...prev,
          services: newServices,
          overallStatus: calculateOverallStatus(newServices),
          error: err instanceof Error ? err.message : 'Failed to fetch health status',
          lastChecked: new Date(),
        };
      });
    }
  }, []);

  /**
   * Fetch API info (basic status endpoint).
   */
  const fetchApiInfo = useCallback(async () => {
    try {
      const data = await statusApi.getStatus();
      setHealth(prev => ({
        ...prev,
        apiInfo: {
          service: data.service,
          version: data.version,
          timestamp: data.timestamp,
        },
      }));
    } catch {
      // API info is non-critical, silently fail
    }
  }, []);

  /**
   * Check all services - each one independently.
   */
  const checkHealth = useCallback(async () => {
    setIsRefreshing(true);
    
    // Reset all services to loading state
    setHealth(prev => ({
      ...prev,
      overallStatus: 'loading',
      services: { ...initialServiceStates },
      error: null,
    }));

    // Fetch API info
    fetchApiInfo();

    // Fire off all health checks in parallel - each updates state independently
    await Promise.allSettled(
      SERVICE_DEFINITIONS.map(service => 
        checkService(service.key, service.fetchHealth)
      )
    );

    setIsRefreshing(false);
  }, [checkService, fetchApiInfo]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-100 mb-2">
              System Status
            </h1>
            <p className="text-neutral-400 mb-8">
              Real-time health status of <span className="font-racing text-pf-green">Parc Fermé</span> services and dependencies.
            </p>
          </div>
          <Button 
            variant="secondary" 
            onClick={checkHealth}
            isLoading={isRefreshing}
          >
            Refresh
          </Button>
        </div>

        {/* Overall Status Banner */}
        <OverallStatusBanner status={health.overallStatus} />

        {/* Last Checked */}
        {health.lastChecked && (
          <p className="text-neutral-500 text-sm mb-8">
            Last checked: {health.lastChecked.toLocaleTimeString()}
          </p>
        )}

        {/* Error State */}
        {health.overallStatus === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-8">
            <p className="text-red-400">
              <strong>Error:</strong> {health.error}
            </p>
            <p className="text-neutral-400 text-sm mt-2">
              Unable to reach the API. The service may be down or there may be a network issue.
            </p>
          </div>
        )}

        {/* Dependency Status Cards - Always visible */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-200 mb-4">
            Dependencies
          </h2>
          
          {SERVICE_DEFINITIONS.map((service) => (
            <DependencyCard
              key={service.key}
              serviceKey={service.key}
              name={service.name}
              description={service.description}
              icon={service.icon}
              isExternal={service.isExternal}
              state={health.services[service.key]}
            />
          ))}
        </div>

        {/* API Info */}
        {health.apiInfo && (
          <div className="mt-12 bg-neutral-900 rounded-lg p-6 border border-neutral-800">
            <h2 className="text-lg font-semibold text-neutral-200 mb-4">
              API Information
            </h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-neutral-500">Service</dt>
                <dd className="text-neutral-200">{health.apiInfo.service}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Version</dt>
                <dd className="text-neutral-200">{health.apiInfo.version}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Server Time</dt>
                <dd className="text-neutral-200">
                  {new Date(health.apiInfo.timestamp).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link 
            to="/" 
            className="text-neutral-400 hover:text-neutral-200 transition-colors text-sm"
          >
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}

// =========================
// Sub-components
// =========================

interface OverallStatusBannerProps {
  status: HealthStatus;
}

function OverallStatusBanner({ status }: OverallStatusBannerProps) {
  const configs: Record<HealthStatus, { bg: string; border: string; text: string; label: string; icon: string }> = {
    loading: {
      bg: 'bg-neutral-800/50',
      border: 'border-neutral-700',
      text: 'text-neutral-400',
      label: 'Checking...',
      icon: '⏳',
    },
    healthy: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      label: 'All Systems Operational',
      icon: '✓',
    },
    degraded: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      label: 'Partial System Outage',
      icon: '⚠',
    },
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      label: 'System Unavailable',
      icon: '✕',
    },
  };

  const config = configs[status];

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-6 mb-4`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{config.icon}</span>
        <span className={`text-xl font-semibold ${config.text}`}>
          {config.label}
        </span>
      </div>
    </div>
  );
}

interface DependencyCardProps {
  serviceKey: string;
  name: string;
  description: string;
  icon: string;
  isExternal?: boolean;
  state: ServiceState;
}

function DependencyCard({ name, description, icon, isExternal = false, state }: DependencyCardProps) {
  const getStatusConfig = () => {
    if (state.status === 'loading') {
      return {
        bg: 'bg-neutral-800/50',
        border: 'border-neutral-700',
        dot: 'bg-neutral-500 animate-pulse',
        text: 'text-neutral-400',
        label: 'Checking...',
      };
    }
    
    if (state.status === 'error' || !state.data) {
      return {
        bg: 'bg-neutral-800/50',
        border: 'border-neutral-700',
        dot: 'bg-neutral-500',
        text: 'text-neutral-400',
        label: 'Unknown',
      };
    }

    return state.data.healthy
      ? {
          bg: 'bg-green-500/10',
          border: 'border-green-500/20',
          dot: 'bg-green-500',
          text: 'text-green-400',
          label: 'Operational',
        }
      : {
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
          dot: 'bg-red-500',
          text: 'text-red-400',
          label: 'Outage',
        };
  };

  const statusConfig = getStatusConfig();

  return (
    <div className={`${statusConfig.bg} ${statusConfig.border} border rounded-lg p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-neutral-100">
                {name}
              </h3>
              {isExternal && (
                <span className="text-xs bg-neutral-700 text-neutral-400 px-2 py-0.5 rounded">
                  External
                </span>
              )}
            </div>
            <p className="text-neutral-400 text-sm mt-1">
              {description}
            </p>
            {state.data?.error && (
              <p className="text-red-400 text-sm mt-2">
                Error: {state.data.error}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
            <span className={`text-sm font-medium ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
          </div>
          {state.data && state.data.responseTimeMs > 0 && (
            <span className="text-xs text-neutral-500">
              {state.data.responseTimeMs}ms
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

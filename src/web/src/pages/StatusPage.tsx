import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { statusApi, type DetailedHealthResponse, type DependencyHealth } from '../services';

type HealthStatus = 'loading' | 'healthy' | 'degraded' | 'error';

interface HealthState {
  status: HealthStatus;
  data: DetailedHealthResponse | null;
  error: string | null;
  lastChecked: Date | null;
}

/**
 * Status page showing health of all system dependencies.
 */
export function StatusPage() {
  const [health, setHealth] = useState<HealthState>({
    status: 'loading',
    data: null,
    error: null,
    lastChecked: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await statusApi.getHealth();
      setHealth({
        status: data.status === 'healthy' ? 'healthy' : 'degraded',
        data,
        error: null,
        lastChecked: new Date(),
      });
    } catch (err) {
      setHealth({
        status: 'error',
        data: null,
        error: err instanceof Error ? err.message : 'Failed to fetch health status',
        lastChecked: new Date(),
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return (
    <div className="min-h-screen bg-neutral-950">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-100 mb-2">
              System Status
            </h1>
            <p className="text-neutral-400">
              Real-time health status of Parc Fermé services and dependencies.
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
        <OverallStatusBanner status={health.status} />

        {/* Last Checked */}
        {health.lastChecked && (
          <p className="text-neutral-500 text-sm mb-8">
            Last checked: {health.lastChecked.toLocaleTimeString()}
          </p>
        )}

        {/* Error State */}
        {health.status === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-8">
            <p className="text-red-400">
              <strong>Error:</strong> {health.error}
            </p>
            <p className="text-neutral-400 text-sm mt-2">
              Unable to reach the API. The service may be down or there may be a network issue.
            </p>
          </div>
        )}

        {/* Dependency Status Cards */}
        {health.data && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-neutral-200 mb-4">
              Dependencies
            </h2>
            
            <DependencyCard 
              dependency={health.data.dependencies.database}
              description="Primary data store for users, sessions, logs, and reviews."
              icon="🗄️"
            />
            
            <DependencyCard 
              dependency={health.data.dependencies.redis}
              description="Caching layer for API responses and session data."
              icon="⚡"
            />
            
            <DependencyCard 
              dependency={health.data.dependencies.openF1}
              description="External API providing real-time F1 session and result data."
              icon="🏎️"
              isExternal
            />
          </div>
        )}

        {/* API Info */}
        {health.data && (
          <div className="mt-12 bg-neutral-900 rounded-lg p-6 border border-neutral-800">
            <h2 className="text-lg font-semibold text-neutral-200 mb-4">
              API Information
            </h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-neutral-500">Service</dt>
                <dd className="text-neutral-200">{health.data.service}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Version</dt>
                <dd className="text-neutral-200">{health.data.version}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Status</dt>
                <dd className="text-neutral-200 capitalize">{health.data.status}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Server Time</dt>
                <dd className="text-neutral-200">
                  {new Date(health.data.timestamp).toLocaleString()}
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
  dependency: DependencyHealth;
  description: string;
  icon: string;
  isExternal?: boolean;
}

function DependencyCard({ dependency, description, icon, isExternal = false }: DependencyCardProps) {
  const statusConfig = dependency.healthy 
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

  return (
    <div className={`${statusConfig.bg} ${statusConfig.border} border rounded-lg p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-neutral-100">
                {dependency.name}
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
            {dependency.error && (
              <p className="text-red-400 text-sm mt-2">
                Error: {dependency.error}
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
          {dependency.responseTimeMs > 0 && (
            <span className="text-xs text-neutral-500">
              {dependency.responseTimeMs}ms
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

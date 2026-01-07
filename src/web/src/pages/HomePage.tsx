import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

// Feature cards for the marketing page
const features = [
  {
    icon: '🏁',
    title: 'Log Every Race',
    description: 'Track every session you\'ve watched across F1, MotoGP, IndyCar, WEC, and more.',
  },
  {
    icon: '🎟️',
    title: 'Watched vs. Attended',
    description: 'Rate both the broadcast experience AND the live venue experience separately.',
  },
  {
    icon: '🛡️',
    title: 'Spoiler Shield',
    description: 'Results are hidden by default. Catch up on races at your own pace.',
  },
  {
    icon: '📍',
    title: 'Circuit Guides',
    description: 'Crowdsourced seat views and venue ratings from fans who\'ve been there.',
  },
  {
    icon: '📊',
    title: 'Personal Stats',
    description: 'Discover your viewing patterns, favorite circuits, and excitement ratings.',
  },
  {
    icon: '👥',
    title: 'Social Feed',
    description: 'Follow friends, share reviews, and build lists of must-watch races.',
  },
];

// Stats for social proof
const stats = [
  { value: '70+', label: 'Years of F1 History' },
  { value: '1000+', label: 'Sessions to Log' },
  { value: '∞', label: 'Hot Takes to Share' },
];

/**
 * Marketing landing page for unauthenticated users
 */
function MarketingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-pf-green/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-pf-green/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative max-w-4xl mx-auto text-center">
          {/* Hero Logo */}
          <img 
            src="/logo-nobg.png" 
            alt="" 
            className="h-24 w-24 md:h-32 md:w-32 mx-auto mb-6"
            aria-hidden="true"
          />
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="brand-logo">Parc Fermé</span>
          </h1>
          <p className="text-xl md:text-2xl text-neutral-300 mb-4">
            The social cataloging platform for motorsport fans
          </p>
          <p className="text-lg text-neutral-500 mb-12 max-w-2xl mx-auto">
            Log races you've <span className="text-accent-green font-semibold">watched</span>.
            Rate events you've <span className="text-accent-yellow font-semibold">attended</span>.
            <span className="text-neutral-400"> Spoiler-free.</span>
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/register">
              <Button size="lg" className="min-w-[180px] text-base">
                Get Started — It's Free
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg" className="min-w-[180px] text-base">
                Log in
              </Button>
            </Link>
          </div>

          {/* Social Proof Stats */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-accent-green">{stat.value}</div>
                <div className="text-sm text-neutral-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-neutral-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Your Racing Diary, <span className="text-accent-green">Elevated</span>
          </h2>
          <p className="text-neutral-400 text-center mb-12 max-w-2xl mx-auto">
            More than just a log book. <span className="font-semibold text-pf-green">Parc Fermé</span> is where motorsport fans track, rate, and discuss every race.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div 
                key={feature.title}
                className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 hover:border-pf-green/30 transition-colors"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-neutral-100 mb-2">{feature.title}</h3>
                <p className="text-neutral-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Spoiler Shield Highlight */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-2xl p-8 md:p-12 border border-neutral-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-pf-green/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="text-5xl mb-6">🛡️</div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                The <span className="text-accent-green">Spoiler Shield</span> Protocol
              </h2>
              <p className="text-neutral-300 mb-6 max-w-xl">
                We get it. Time zones are brutal. Sometimes you can't watch live.
              </p>
              <ul className="space-y-3 text-neutral-400">
                <li className="flex items-start gap-3">
                  <span className="text-pf-green mt-1">✓</span>
                  <span>Results hidden by default until you've logged a race</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-pf-green mt-1">✓</span>
                  <span>Generic circuit images only — no winner celebrations</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-pf-green mt-1">✓</span>
                  <span>Spoiler-free notifications: "Australian GP finished. Rate it now!"</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-pf-green mt-1">✓</span>
                  <span>Reviews marked with spoiler warnings for recent races</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Development Status */}
      <section className="py-20 px-4 bg-neutral-900/50">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-neutral-900 rounded-xl p-8 border border-neutral-800">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="inline-block w-2 h-2 bg-pf-yellow rounded-full animate-pulse" />
              <span className="text-pf-yellow font-medium">In Development</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Phase 1: Shakedown</h3>
            <p className="text-neutral-400 mb-6">
              F1 2024-2025 seasons, basic logging, profiles, and social features.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button variant="primary">
                  Join the Early Grid
                </Button>
              </Link>
              <Link 
                to="/status" 
                className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Check System Status →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to start logging?
          </h2>
          <p className="text-neutral-400 mb-8">
            Create your free account and join the community.
          </p>
          <Link to="/register">
            <Button size="lg" className="min-w-[200px]">
              Get Started
            </Button>
          </Link>
          <div className="mt-4">
            <Link to="/about#faq">
              <Button variant="secondary" size="lg" className="min-w-[200px]">
                Not Yet
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-neutral-500 text-sm">
            © 2026 <span className="font-semibold text-neutral-400">Parc Fermé</span>. All historical data is free, forever.
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/status" className="text-neutral-500 hover:text-neutral-300 transition-colors">
              Status
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Dashboard entry point for authenticated users
 */
function DashboardPage() {
  const { user } = useAuth();

  return (
    <MainLayout>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, <span className="text-accent-green">{user?.displayName}</span>
        </h1>
        <p className="text-neutral-400">
          Ready to log some races?
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link 
          to="/sessions"
          className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 hover:border-pf-green/30 transition-colors group"
        >
          <div className="text-2xl mb-3">🏎️</div>
          <h3 className="font-semibold text-neutral-100 mb-1 group-hover:text-pf-green transition-colors">
            Browse Sessions
          </h3>
          <p className="text-neutral-500 text-sm">Find races to log</p>
        </Link>
        
        <Link 
          to="/profile"
          className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 hover:border-pf-green/30 transition-colors group"
        >
          <div className="text-2xl mb-3">📊</div>
          <h3 className="font-semibold text-neutral-100 mb-1 group-hover:text-pf-green transition-colors">
            Your Stats
          </h3>
          <p className="text-neutral-500 text-sm">View your logging history</p>
        </Link>
        
        <Link 
          to="/feed"
          className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 hover:border-pf-green/30 transition-colors group"
        >
          <div className="text-2xl mb-3">👥</div>
          <h3 className="font-semibold text-neutral-100 mb-1 group-hover:text-pf-green transition-colors">
            Activity Feed
          </h3>
          <p className="text-neutral-500 text-sm">See what friends are watching</p>
        </Link>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800 mb-8">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="text-neutral-500 text-center py-8">
          <p className="mb-2">No recent activity yet</p>
          <Link to="/sessions" className="text-pf-green hover:underline text-sm">
            Start logging races →
          </Link>
        </div>
      </div>

      {/* Development Status */}
      <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-2 h-2 bg-pf-yellow rounded-full animate-pulse" />
          <span className="text-pf-yellow font-medium text-sm">In Development</span>
        </div>
        <p className="text-neutral-400 text-sm">
          Phase 1: Shakedown — F1 2024-2025, basic logging + profiles. 
          More features coming soon!
        </p>
        <Link 
          to="/status" 
          className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors mt-2 inline-block"
        >
          Check System Status →
        </Link>
      </div>
    </MainLayout>
  );
}

/**
 * Home page that shows marketing content for guests and dashboard for authenticated users
 */
export function HomePage() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <DashboardPage /> : <MarketingPage />;
}

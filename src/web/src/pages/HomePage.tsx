export function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="max-w-2xl text-center">
        {/* Logo placeholder */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-pf-green mb-2">
            Parc Fermé
          </h1>
          <p className="text-neutral-400 text-lg">
            The social cataloging platform for motorsport
          </p>
        </div>

        {/* Tagline */}
        <div className="mb-12">
          <p className="text-xl text-neutral-300">
            Log races you've <span className="text-pf-green">watched</span>.
            <br />
            Rate events you've <span className="text-pf-yellow">attended</span>.
            <br />
            <span className="text-neutral-500">Spoiler-free.</span>
          </p>
        </div>

        {/* Coming Soon */}
        <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="inline-block w-2 h-2 bg-pf-yellow rounded-full animate-pulse"></span>
            <span className="text-pf-yellow font-medium">In Development</span>
          </div>
          <p className="text-neutral-400 text-sm">
            Phase 1: Shakedown — F1 2024-2025, basic logging + profiles
          </p>
        </div>

        {/* Status Check */}
        <div className="mt-8">
          <a 
            href="/api/v1/status" 
            className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Check API Status →
          </a>
        </div>
      </div>
    </div>
  )
}

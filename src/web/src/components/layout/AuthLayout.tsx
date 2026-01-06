import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

/**
 * Layout wrapper for authentication pages (Login, Register).
 */
export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <Link to="/" className="mb-8 group">
        <h1 className="text-3xl brand-logo group-hover:opacity-80 transition-opacity">
          Parc Fermé
        </h1>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md">
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-8 shadow-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-neutral-100">{title}</h2>
            {subtitle && (
              <p className="mt-2 text-neutral-400">{subtitle}</p>
            )}
          </div>

          {/* Content */}
          {children}
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-sm text-neutral-600">
        © 2026 <span className="font-racing text-neutral-500">Parc Fermé</span>. Spoiler-free motorsport logging.
      </p>
    </div>
  );
}

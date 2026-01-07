import { Link } from 'react-router-dom';
import { ROUTES } from '../../types/navigation';

// =========================
// Footer Component
// =========================

/**
 * Site footer with navigation links, legal disclaimers, and trademark notices.
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-800/50 bg-neutral-950/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to={ROUTES.HOME} className="flex items-center gap-2 mb-4">
              <span className="text-xl font-bold brand-logo">Parc Fermé</span>
            </Link>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Your personal motorsport diary. Log races, rate experiences, and connect with fellow fans.
            </p>
            {/* You can add social media icons or other brand elements here */}
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://x.com/ParcFermeApp"
                target="_blank"
                rel="noreferrer"
                aria-label="Parc Fermé on X"
                title="Follow Parc Fermé on X"
                className="inline-flex items-center justify-center rounded-md p-2 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/50 transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-5 w-5 fill-current"
                >
                  <path d="M18.9 2H22l-6.8 7.8L23.2 22H16l-5.5-7.1L4.3 22H1.2l7.3-8.4L.8 2h7.4l5 6.4L18.9 2Zm-1.1 18h1.8L7.2 3.9H5.3L17.8 20Z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Discover */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide mb-4">
              Discover
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to={ROUTES.SERIES_LIST} className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
                  Series
                </Link>
              </li>
              <li>
                <Link to={ROUTES.CIRCUITS} className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
                  Circuits
                </Link>
              </li>
              <li>
                <Link to={ROUTES.TEAMS} className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
                  Teams
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide mb-4">
              Account
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to={ROUTES.LOGIN} className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
                  Log In
                </Link>
              </li>
              <li>
                <Link to={ROUTES.REGISTER} className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link to={ROUTES.SETTINGS} className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
                  Settings
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide mb-4">
              Info
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to={ROUTES.ABOUT} className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to={ROUTES.PRIVACY} className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to={ROUTES.TERMS} className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-neutral-800/50 pt-8">
          {/* Trademark Disclaimer */}
          <div className="mb-6">
            <p className="text-xs text-neutral-600 leading-relaxed max-w-4xl">
              This website is unofficial and is not associated in any way with the Formula 1 companies. 
              F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX and related 
              marks are trade marks of Formula One Licensing B.V.
            </p>
          </div>

          {/* Copyright */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-neutral-600">
              © {currentYear} Parc Fermé. All rights reserved.
            </p>
            <p className="text-xs text-neutral-600">
              Made with 🏁 for motorsport fans
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

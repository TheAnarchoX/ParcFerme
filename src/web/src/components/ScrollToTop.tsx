import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component - automatically scrolls to top on route changes.
 * Place this component inside BrowserRouter to enable automatic scroll restoration.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top when pathname changes
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

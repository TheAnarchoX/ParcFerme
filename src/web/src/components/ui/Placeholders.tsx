/**
 * Default placeholder SVG icons for discovery pages.
 * Used when entities don't have images/logos.
 */

// =========================
// Types
// =========================

interface PlaceholderProps {
  className?: string;
  /** Size in pixels (width = height) */
  size?: number;
  /** Primary color for the SVG */
  primaryColor?: string;
  /** Secondary/background color */
  secondaryColor?: string;
}

// =========================
// Driver Placeholder
// =========================

/**
 * Driver silhouette placeholder for missing headshots.
 */
export function DriverPlaceholder({
  className = '',
  size = 48,
  primaryColor = '#737373', // neutral-500
  secondaryColor = '#262626', // neutral-800
}: PlaceholderProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Driver placeholder"
    >
      {/* Background circle */}
      <circle cx="24" cy="24" r="24" fill={secondaryColor} />
      
      {/* Helmet shape */}
      <path
        d="M24 8c-8 0-14 6-14 14v4c0 6 4 10 10 12h8c6-2 10-6 10-12v-4c0-8-6-14-14-14z"
        fill={primaryColor}
        opacity="0.6"
      />
      
      {/* Visor */}
      <path
        d="M14 22h20c0 4-4 6-10 6s-10-2-10-6z"
        fill={secondaryColor}
        opacity="0.8"
      />
      
      {/* Helmet stripe */}
      <rect x="22" y="10" width="4" height="14" rx="2" fill={secondaryColor} opacity="0.4" />
    </svg>
  );
}

// =========================
// Team Logo Placeholder
// =========================

/**
 * Team logo placeholder with F1-style racing car silhouette.
 */
export function TeamPlaceholder({
  className = '',
  size = 48,
  primaryColor = '#737373',
  secondaryColor = '#262626',
}: PlaceholderProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Team placeholder"
    >
      {/* Background rounded square */}
      <rect width="48" height="48" rx="8" fill={secondaryColor} />
      
      {/* F1-style racing car silhouette - side view */}
      <g fill={primaryColor} opacity="0.6" transform="translate(4, 14)">
        {/* Main body / monocoque */}
        <path d="M6 12 L10 6 L18 4 L26 4 L30 6 L38 8 L38 12 L36 14 L6 14 Z" />
        
        {/* Front wing */}
        <path d="M2 14 L6 12 L6 16 L2 16 Z" />
        <rect x="1" y="15" width="6" height="2" rx="0.5" />
        
        {/* Rear wing */}
        <rect x="35" y="4" width="2" height="6" rx="0.5" />
        <rect x="33" y="2" width="6" height="2" rx="0.5" />
        
        {/* Halo */}
        <path d="M16 6 Q14 4 16 2 L20 2 Q22 4 20 6 Z" fill={secondaryColor} opacity="0.8" />
        
        {/* Front wheel */}
        <ellipse cx="10" cy="16" rx="3.5" ry="4" />
        
        {/* Rear wheel */}
        <ellipse cx="32" cy="16" rx="3.5" ry="4" />
        
        {/* Sidepod inlet */}
        <rect x="14" y="8" width="8" height="3" rx="1" fill={secondaryColor} opacity="0.5" />
      </g>
    </svg>
  );
}

// =========================
// Circuit Layout Placeholder
// =========================

/**
 * Circuit layout placeholder with abstract track shape.
 */
export function CircuitPlaceholder({
  className = '',
  size = 48,
  primaryColor = '#737373',
  secondaryColor = '#262626',
}: PlaceholderProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Circuit placeholder"
    >
      {/* Background rounded square */}
      <rect width="48" height="48" rx="8" fill={secondaryColor} />
      
      {/* Abstract track outline */}
      <path
        d="M12 16 Q8 16 8 20 L8 32 Q8 36 12 36 L28 36 Q36 36 36 28 L36 20 Q36 12 28 12 L20 12 Q16 12 16 16 L16 24 Q16 28 20 28 L28 28"
        fill="none"
        stroke={primaryColor}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.6"
      />
      
      {/* Start/finish line */}
      <rect x="10" y="15" width="6" height="2" fill={primaryColor} opacity="0.8" />
      
      {/* Corner markers */}
      <circle cx="8" cy="20" r="2" fill={primaryColor} opacity="0.4" />
      <circle cx="8" cy="32" r="2" fill={primaryColor} opacity="0.4" />
      <circle cx="36" cy="28" r="2" fill={primaryColor} opacity="0.4" />
    </svg>
  );
}

// =========================
// Series Logo Placeholder
// =========================

/**
 * Series logo placeholder with flag/checkered pattern.
 */
export function SeriesPlaceholder({
  className = '',
  size = 48,
  primaryColor = '#737373',
  secondaryColor = '#262626',
}: PlaceholderProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Series placeholder"
    >
      {/* Background */}
      <rect width="48" height="48" rx="8" fill={secondaryColor} />
      
      {/* Checkered flag pattern */}
      <g opacity="0.6">
        {/* Row 1 */}
        <rect x="10" y="12" width="7" height="6" fill={primaryColor} />
        <rect x="24" y="12" width="7" height="6" fill={primaryColor} />
        
        {/* Row 2 */}
        <rect x="17" y="18" width="7" height="6" fill={primaryColor} />
        <rect x="31" y="18" width="7" height="6" fill={primaryColor} />
        
        {/* Row 3 */}
        <rect x="10" y="24" width="7" height="6" fill={primaryColor} />
        <rect x="24" y="24" width="7" height="6" fill={primaryColor} />
        
        {/* Row 4 */}
        <rect x="17" y="30" width="7" height="6" fill={primaryColor} />
        <rect x="31" y="30" width="7" height="6" fill={primaryColor} />
      </g>
      
      {/* Flag pole */}
      <rect x="8" y="10" width="2" height="28" rx="1" fill={primaryColor} opacity="0.8" />
    </svg>
  );
}

// =========================
// Generic Placeholder
// =========================

/**
 * Generic placeholder for any missing image.
 */
export function ImagePlaceholder({
  className = '',
  size = 48,
  primaryColor = '#737373',
  secondaryColor = '#262626',
}: PlaceholderProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Image placeholder"
    >
      {/* Background */}
      <rect width="48" height="48" rx="8" fill={secondaryColor} />
      
      {/* Mountain/landscape icon */}
      <path
        d="M8 36 L18 22 L24 30 L32 18 L40 36 Z"
        fill={primaryColor}
        opacity="0.4"
      />
      
      {/* Sun */}
      <circle cx="36" cy="14" r="4" fill={primaryColor} opacity="0.5" />
    </svg>
  );
}

// =========================
// Exports
// =========================

export const Placeholders = {
  Driver: DriverPlaceholder,
  Team: TeamPlaceholder,
  Circuit: CircuitPlaceholder,
  Series: SeriesPlaceholder,
  Image: ImagePlaceholder,
};

export default Placeholders;

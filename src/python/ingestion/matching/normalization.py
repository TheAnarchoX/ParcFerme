"""
Name normalization utilities for entity matching.

Centralizes text normalization functions used across all matchers:
- Unicode normalization (remove diacritics)
- Sponsor/branding removal
- Entity-specific normalization (teams, circuits, rounds)
"""

from __future__ import annotations

import re
import unicodedata


def normalize_name(name: str) -> str:
    """Normalize a name for comparison.
    
    This is the central normalization function for entity matching.
    Handles Unicode diacritics and case normalization.
    
    Operations:
    1. NFD normalization (decomposes characters like é → e + accent)
    2. Remove combining diacritical marks
    3. Convert to lowercase
    4. Strip whitespace
    
    Args:
        name: Original name with potential diacritics
        
    Returns:
        Normalized ASCII lowercase string
        
    Examples:
        >>> normalize_name("Nico Hülkenberg")
        'nico hulkenberg'
        >>> normalize_name("Sergio Pérez")
        'sergio perez'
        >>> normalize_name("Kimi Räikkönen")
        'kimi raikkonen'
        >>> normalize_name("Jean-Éric Vergne")
        'jean-eric vergne'
    """
    # NFD normalization decomposes characters (é → e + combining accent)
    normalized = unicodedata.normalize("NFD", name)
    # Remove combining diacritical marks (Unicode category 'Mn')
    ascii_name = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    return ascii_name.lower().strip()


def normalize_for_slug(name: str) -> str:
    """Normalize a name to a slug-like format for matching.
    
    Goes further than normalize_name by removing non-alphanumeric characters.
    
    Args:
        name: Original name
        
    Returns:
        Lowercase alphanumeric string with hyphens for spaces
        
    Examples:
        >>> normalize_for_slug("Nico Hülkenberg")
        'nico-hulkenberg'
        >>> normalize_for_slug("McLaren F1 Team")
        'mclaren-f1-team'
    """
    # First normalize diacritics
    normalized = normalize_name(name)
    # Replace spaces/underscores with hyphens
    slug = re.sub(r"[\s_]+", "-", normalized)
    # Remove non-alphanumeric except hyphens
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    # Remove consecutive hyphens
    slug = re.sub(r"-+", "-", slug)
    # Strip leading/trailing hyphens
    return slug.strip("-")


# Common F1 sponsor names to strip from round names
# Order matters - multi-word sponsors should come before single words
F1_SPONSORS = [
    # Multi-word sponsors (order first)
    "qatar airways",
    "singapore airlines",
    "etihad airways",
    "gulf air",
    "red bull",  # Only strip when sponsor, not team context
    "crypto.com",
    # Single-word sponsors
    "heineken",
    "aramco",
    "emirates",
    "rolex",
    "lenovo",
    "aws",
    "pirelli",
    "dhl",
    "etihad",
    "petronas",
    "shell",
    "oracle",
    "sakhir",  # Sometimes added to Bahrain GP
    "jeddah",  # Sometimes added to Saudi GP
    "airways",  # Catch remaining "airways" after specific airline removal
]

# F1 branding patterns to strip
F1_BRANDING_PATTERNS = [
    r"formula\s*1",
    r"formula\s*one",
    r"f1",
    r"fia\s*formula\s*one\s*world\s*championship",
]


def strip_sponsor_text(name: str, sponsors: list[str] | None = None) -> str:
    """Remove sponsor names and branding from event names.
    
    Transforms "FORMULA 1 HEINEKEN CHINESE GRAND PRIX 2025" → "Chinese Grand Prix"
    
    Args:
        name: Original name with potential sponsor clutter
        sponsors: Optional list of additional sponsor names to strip
        
    Returns:
        Clean name without sponsors/branding
        
    Examples:
        >>> strip_sponsor_text("FORMULA 1 HEINEKEN CHINESE GRAND PRIX 2025")
        'Chinese Grand Prix'
        >>> strip_sponsor_text("FORMULA 1 LENOVO JAPANESE GRAND PRIX 2025")
        'Japanese Grand Prix'
    """
    result = name
    
    # Convert to consistent case for processing
    working = result.lower()
    
    # Remove F1 branding
    for pattern in F1_BRANDING_PATTERNS:
        working = re.sub(pattern, "", working, flags=re.IGNORECASE)
    
    # Remove sponsor names
    all_sponsors = F1_SPONSORS.copy()
    if sponsors:
        all_sponsors.extend(s.lower() for s in sponsors)
    
    for sponsor in all_sponsors:
        working = re.sub(re.escape(sponsor), "", working, flags=re.IGNORECASE)
    
    # Remove year at end
    working = re.sub(r"\s+\d{4}$", "", working)
    
    # Clean up whitespace
    working = re.sub(r"\s+", " ", working).strip()
    
    # Title case the result
    return working.title() if working else name


def normalize_grand_prix(name: str) -> str:
    """Normalize Grand Prix name variations.
    
    Handles language variants:
    - "Grand Prix" / "GP" / "Gran Premio" / "Grosser Preis"
    - Country/city name extraction
    
    Args:
        name: Grand Prix name in various formats
        
    Returns:
        Normalized format like "Japanese Grand Prix"
        
    Examples:
        >>> normalize_grand_prix("GP de Monaco")
        'Monaco Grand Prix'
        >>> normalize_grand_prix("Gran Premio de España")
        'Spanish Grand Prix'
    """
    working = name.strip()
    
    # First strip sponsor text
    working = strip_sponsor_text(working)
    
    # Handle common patterns
    patterns = [
        (r"^GP\s+(?:de\s+)?(.+)$", r"\1 Grand Prix"),
        (r"^Gran\s+Premio\s+(?:de\s+)?(.+)$", r"\1 Grand Prix"),
        (r"^Grosser?\s+Preis\s+(?:von\s+)?(.+)$", r"\1 Grand Prix"),
        (r"^Grand\s+Prix\s+(?:de\s+)?(.+)$", r"\1 Grand Prix"),
    ]
    
    for pattern, replacement in patterns:
        match = re.match(pattern, working, re.IGNORECASE)
        if match:
            working = re.sub(pattern, replacement, working, flags=re.IGNORECASE)
            break
    
    # Ensure "Grand Prix" suffix exists
    if "grand prix" not in working.lower():
        # Try to extract location and add suffix
        working = f"{working} Grand Prix"
    
    return working.strip().title()


# Team name patterns to normalize
TEAM_SUFFIXES = [
    r"\s+f1\s+team$",
    r"\s+racing$",
    r"\s+team$",
    r"\s+motorsport$",
    r"\s+formula\s*1$",
]

# Common team sponsor prefixes/suffixes
TEAM_SPONSORS = [
    "oracle",
    "bwt",
    "mission winnow",
    "scuderia",
    "stake",
    "alfa romeo",  # As sponsor, not constructor
    "aston martin aramco",
    "visa cash app",
]


def normalize_team_name(name: str, keep_core: bool = True) -> str:
    """Normalize team name for matching.
    
    Removes common suffixes and sponsor prefixes while preserving
    the core team identity.
    
    Args:
        name: Original team name
        keep_core: If True, try to preserve core identity (e.g., "Red Bull")
        
    Returns:
        Normalized team name
        
    Examples:
        >>> normalize_team_name("Oracle Red Bull Racing")
        'red bull'
        >>> normalize_team_name("Scuderia Ferrari Mission Winnow")
        'ferrari'
        >>> normalize_team_name("McLaren F1 Team")
        'mclaren'
    """
    working = normalize_name(name)
    
    # Remove sponsor prefixes
    for sponsor in TEAM_SPONSORS:
        sponsor_lower = sponsor.lower()
        if working.startswith(sponsor_lower):
            working = working[len(sponsor_lower):].strip()
    
    # Remove suffixes
    for pattern in TEAM_SUFFIXES:
        working = re.sub(pattern, "", working, flags=re.IGNORECASE)
    
    # Remove trailing sponsor names
    for sponsor in TEAM_SPONSORS:
        sponsor_lower = sponsor.lower()
        if working.endswith(sponsor_lower):
            working = working[:-len(sponsor_lower)].strip()
    
    return working.strip()


# Circuit name patterns
CIRCUIT_PREFIXES = [
    r"^autodromo\s+(?:di\s+|nazionale\s+(?:di\s+)?)?",
    r"^autodrome\s+(?:de\s+)?",
    r"^circuito\s+(?:de\s+)?",
    r"^circuit\s+(?:de\s+|of\s+)?(?:the\s+)?",
    r"^international\s+",
    r"^(?:the\s+)?",
]

CIRCUIT_SUFFIXES = [
    r"\s+circuit$",
    r"\s+raceway$",
    r"\s+speedway$",
    r"\s+international\s+circuit$",
    r"\s+motorsport\s+park$",
    r"\s+race\s+track$",
    r"\s+grand\s+prix\s+circuit$",
]


def normalize_circuit_name(name: str) -> str:
    """Normalize circuit name for matching.
    
    Removes common prefixes (Circuit, Autodromo) and suffixes
    while preserving the core location identity.
    
    Args:
        name: Original circuit name
        
    Returns:
        Normalized circuit name
        
    Examples:
        >>> normalize_circuit_name("Autódromo Hermanos Rodríguez")
        'hermanos rodriguez'
        >>> normalize_circuit_name("Circuit of the Americas")
        'americas'
        >>> normalize_circuit_name("Silverstone Circuit")
        'silverstone'
    """
    working = normalize_name(name)
    
    # Remove prefixes
    for pattern in CIRCUIT_PREFIXES:
        working = re.sub(pattern, "", working, flags=re.IGNORECASE)
    
    # Remove suffixes
    for pattern in CIRCUIT_SUFFIXES:
        working = re.sub(pattern, "", working, flags=re.IGNORECASE)
    
    return working.strip()


# Known abbreviations for circuits
CIRCUIT_ABBREVIATIONS: dict[str, list[str]] = {
    "circuit of the americas": ["cota", "austin"],
    "albert park circuit": ["albert park", "melbourne"],
    "marina bay street circuit": ["marina bay", "singapore"],
    "yas marina circuit": ["yas marina", "abu dhabi"],
    "bahrain international circuit": ["sakhir", "bahrain"],
    "silverstone circuit": ["silverstone"],
    "autodromo nazionale monza": ["monza"],
    "circuit de monaco": ["monte carlo", "monaco"],
    "circuit de spa-francorchamps": ["spa", "spa-francorchamps"],
    "suzuka international racing course": ["suzuka"],
    "hungaroring": ["budapest", "hungary circuit"],
    "red bull ring": ["spielberg", "a1 ring"],
}


def expand_circuit_abbreviation(abbrev: str) -> str | None:
    """Expand a circuit abbreviation to full name.
    
    Args:
        abbrev: Abbreviated circuit name (e.g., "COTA", "Spa")
        
    Returns:
        Full circuit name if found, None otherwise
    """
    abbrev_lower = abbrev.lower().strip()
    
    for full_name, abbreviations in CIRCUIT_ABBREVIATIONS.items():
        if abbrev_lower in abbreviations or abbrev_lower == normalize_circuit_name(full_name):
            return full_name.title()
    
    return None


def extract_name_parts(full_name: str) -> tuple[str, str]:
    """Extract first and last name from a full name.
    
    Handles various name formats:
    - "Max Verstappen" → ("Max", "Verstappen")
    - "Verstappen, Max" → ("Max", "Verstappen")
    - "Jos Verstappen Sr" → ("Jos", "Verstappen")
    
    Args:
        full_name: Full name string
        
    Returns:
        Tuple of (first_name, last_name)
    """
    name = full_name.strip()
    
    # Handle "Last, First" format
    if "," in name:
        parts = name.split(",", 1)
        return (parts[1].strip(), parts[0].strip())
    
    # Handle suffixes like "Sr", "Jr", "III"
    suffixes = ["sr", "jr", "ii", "iii", "iv"]
    parts = name.split()
    
    # Filter out suffixes
    filtered = [p for p in parts if p.lower().rstrip(".") not in suffixes]
    
    if len(filtered) == 0:
        return ("", name)
    elif len(filtered) == 1:
        return ("", filtered[0])
    else:
        return (filtered[0], " ".join(filtered[1:]))

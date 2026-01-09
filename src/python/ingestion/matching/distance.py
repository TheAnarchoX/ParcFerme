"""
String distance and similarity utilities for entity matching.

Provides implementations of:
- Levenshtein distance (edit distance)
- Jaro-Winkler similarity (good for names)
- Normalized similarity scores (0.0-1.0)
- Geographic distance calculations
"""

from __future__ import annotations

import math


def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculate the Levenshtein (edit) distance between two strings.
    
    The Levenshtein distance is the minimum number of single-character edits
    (insertions, deletions, or substitutions) required to transform one 
    string into another.
    
    Args:
        s1: First string
        s2: Second string
        
    Returns:
        Number of edits required
        
    Examples:
        >>> levenshtein_distance("kitten", "sitting")
        3
        >>> levenshtein_distance("Hulkenberg", "Hülkenberg")
        1
    """
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    
    if len(s2) == 0:
        return len(s1)
    
    previous_row = list(range(len(s2) + 1))
    
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            # Cost is 0 if characters match, 1 otherwise
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    
    return previous_row[-1]


def normalized_levenshtein_similarity(s1: str, s2: str) -> float:
    """Calculate normalized Levenshtein similarity (0.0-1.0).
    
    Converts edit distance to a similarity score where 1.0 is identical
    and 0.0 is completely different.
    
    Args:
        s1: First string
        s2: Second string
        
    Returns:
        Similarity score between 0.0 and 1.0
        
    Examples:
        >>> normalized_levenshtein_similarity("hello", "hello")
        1.0
        >>> normalized_levenshtein_similarity("hello", "hallo")
        0.8
    """
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0
    
    max_len = max(len(s1), len(s2))
    distance = levenshtein_distance(s1, s2)
    
    return 1.0 - (distance / max_len)


def jaro_similarity(s1: str, s2: str) -> float:
    """Calculate Jaro similarity between two strings.
    
    The Jaro similarity is designed for comparing short strings like names.
    It accounts for character matches and transpositions.
    
    Args:
        s1: First string
        s2: Second string
        
    Returns:
        Similarity score between 0.0 and 1.0
    """
    if s1 == s2:
        return 1.0
    
    len1, len2 = len(s1), len(s2)
    if len1 == 0 or len2 == 0:
        return 0.0
    
    # Matching window size
    match_distance = max(len1, len2) // 2 - 1
    if match_distance < 0:
        match_distance = 0
    
    s1_matches = [False] * len1
    s2_matches = [False] * len2
    
    matches = 0
    transpositions = 0
    
    # Find matching characters
    for i in range(len1):
        start = max(0, i - match_distance)
        end = min(i + match_distance + 1, len2)
        
        for j in range(start, end):
            if s2_matches[j] or s1[i] != s2[j]:
                continue
            s1_matches[i] = True
            s2_matches[j] = True
            matches += 1
            break
    
    if matches == 0:
        return 0.0
    
    # Count transpositions
    k = 0
    for i in range(len1):
        if not s1_matches[i]:
            continue
        while not s2_matches[k]:
            k += 1
        if s1[i] != s2[k]:
            transpositions += 1
        k += 1
    
    jaro = (
        matches / len1 +
        matches / len2 +
        (matches - transpositions / 2) / matches
    ) / 3.0
    
    return jaro


def jaro_winkler_similarity(s1: str, s2: str, scaling: float = 0.1) -> float:
    """Calculate Jaro-Winkler similarity between two strings.
    
    An extension of Jaro similarity that gives additional weight to
    strings that share a common prefix. Particularly good for names
    where the first few characters are important.
    
    Args:
        s1: First string
        s2: Second string
        scaling: Scaling factor for common prefix (default 0.1)
        
    Returns:
        Similarity score between 0.0 and 1.0
        
    Examples:
        >>> jaro_winkler_similarity("Verstappen", "Verstappen")
        1.0
        >>> jaro_winkler_similarity("Perez", "Pérez")  # After normalization
        0.96...
    """
    jaro = jaro_similarity(s1, s2)
    
    # Find common prefix (up to 4 characters)
    prefix_len = 0
    max_prefix = min(4, len(s1), len(s2))
    
    for i in range(max_prefix):
        if s1[i] == s2[i]:
            prefix_len += 1
        else:
            break
    
    # Apply Winkler modification
    return jaro + (prefix_len * scaling * (1.0 - jaro))


def damerau_levenshtein_distance(s1: str, s2: str) -> int:
    """Calculate Damerau-Levenshtein distance between two strings.
    
    Similar to Levenshtein but also considers adjacent transpositions
    as a single edit (e.g., "ab" -> "ba" is distance 1, not 2).
    
    Args:
        s1: First string
        s2: Second string
        
    Returns:
        Number of edits required
    """
    len1, len2 = len(s1), len(s2)
    
    # Create distance matrix
    d = [[0] * (len2 + 1) for _ in range(len1 + 1)]
    
    for i in range(len1 + 1):
        d[i][0] = i
    for j in range(len2 + 1):
        d[0][j] = j
    
    for i in range(1, len1 + 1):
        for j in range(1, len2 + 1):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            
            d[i][j] = min(
                d[i - 1][j] + 1,       # Deletion
                d[i][j - 1] + 1,       # Insertion
                d[i - 1][j - 1] + cost # Substitution
            )
            
            # Transposition
            if (i > 1 and j > 1 and 
                s1[i - 1] == s2[j - 2] and 
                s1[i - 2] == s2[j - 1]):
                d[i][j] = min(d[i][j], d[i - 2][j - 2] + cost)
    
    return d[len1][len2]


def geo_distance_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """Calculate great-circle distance between two coordinates in kilometers.
    
    Uses the Haversine formula for accuracy on a spherical Earth.
    
    Args:
        lat1: Latitude of first point (degrees)
        lon1: Longitude of first point (degrees)
        lat2: Latitude of second point (degrees)
        lon2: Longitude of second point (degrees)
        
    Returns:
        Distance in kilometers
        
    Examples:
        >>> # Melbourne to Adelaide
        >>> geo_distance_km(-37.84, 144.95, -34.93, 138.60)
        652.5...
    """
    # Earth's radius in kilometers
    R = 6371.0
    
    # Convert to radians
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    # Haversine formula
    a = (
        math.sin(delta_lat / 2) ** 2 +
        math.cos(lat1_rad) * math.cos(lat2_rad) *
        math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


def coordinate_proximity_score(
    lat1: float | None,
    lon1: float | None,
    lat2: float | None,
    lon2: float | None,
    max_distance_km: float = 10.0,
) -> float:
    """Calculate proximity score based on coordinate distance.
    
    Returns 1.0 for identical coordinates, decreasing to 0.0 at max_distance_km.
    Returns 0.0 if either coordinate is missing.
    
    Args:
        lat1: Latitude of first point (degrees) or None
        lon1: Longitude of first point (degrees) or None
        lat2: Latitude of second point (degrees) or None
        lon2: Longitude of second point (degrees) or None
        max_distance_km: Distance at which score becomes 0.0
        
    Returns:
        Similarity score between 0.0 and 1.0
    """
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 0.0
    
    distance = geo_distance_km(lat1, lon1, lat2, lon2)
    
    if distance >= max_distance_km:
        return 0.0
    
    # Linear decay
    return 1.0 - (distance / max_distance_km)


def containment_score(needle: str, haystack: str) -> float:
    """Calculate how much of needle is contained in haystack.
    
    Useful for matching "Red Bull" in "Oracle Red Bull Racing".
    
    Args:
        needle: Shorter string to look for
        haystack: Longer string to search in
        
    Returns:
        1.0 if needle fully contained, 0.0 if not at all
    """
    if not needle or not haystack:
        return 0.0
        
    needle_lower = needle.lower()
    haystack_lower = haystack.lower()
    
    if needle_lower in haystack_lower:
        return 1.0
    if haystack_lower in needle_lower:
        return 1.0
    
    # Check word overlap
    needle_words = set(needle_lower.split())
    haystack_words = set(haystack_lower.split())
    
    if not needle_words:
        return 0.0
    
    common = needle_words & haystack_words
    return len(common) / len(needle_words)

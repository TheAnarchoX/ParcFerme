namespace ParcFerme.Api.Caching;

/// <summary>
/// Standardized cache key prefixes for different data types.
/// Ensures consistent key naming across the application.
/// </summary>
public static class CacheKeys
{
    private const string Prefix = "ParcFerme";
    
    // =========================
    // Event Data (long-lived, mostly static)
    // =========================
    
    public static string Series(Guid id) => $"{Prefix}:series:{id}";
    public static string SeriesList() => $"{Prefix}:series:list";
    
    public static string Season(Guid id) => $"{Prefix}:season:{id}";
    public static string SeasonsBySeries(Guid seriesId) => $"{Prefix}:seasons:series:{seriesId}";
    
    public static string Round(Guid id) => $"{Prefix}:round:{id}";
    public static string RoundsBySeason(Guid seasonId) => $"{Prefix}:rounds:season:{seasonId}";
    public static string RoundBySlug(string slug) => $"{Prefix}:round:slug:{slug}";
    
    public static string Session(Guid id) => $"{Prefix}:session:{id}";
    public static string SessionsByRound(Guid roundId) => $"{Prefix}:sessions:round:{roundId}";
    
    public static string Circuit(Guid id) => $"{Prefix}:circuit:{id}";
    public static string CircuitBySlug(string slug) => $"{Prefix}:circuit:slug:{slug}";
    public static string CircuitList() => $"{Prefix}:circuits:list";
    
    public static string Driver(Guid id) => $"{Prefix}:driver:{id}";
    public static string DriverBySlug(string slug) => $"{Prefix}:driver:slug:{slug}";
    
    public static string Team(Guid id) => $"{Prefix}:team:{id}";
    public static string TeamBySlug(string slug) => $"{Prefix}:team:slug:{slug}";
    
    // =========================
    // Results (short-lived during live events, longer after)
    // =========================
    
    public static string Results(Guid sessionId) => $"{Prefix}:results:session:{sessionId}";
    public static string ResultsPrefix() => $"{Prefix}:results:";
    
    // =========================
    // User Data (short-lived, user-specific)
    // =========================
    
    public static string UserProfile(Guid userId) => $"{Prefix}:user:{userId}:profile";
    public static string UserStats(Guid userId) => $"{Prefix}:user:{userId}:stats";
    public static string UserLogs(Guid userId, int page = 1) => $"{Prefix}:user:{userId}:logs:page:{page}";
    public static string UserLogsPrefix(Guid userId) => $"{Prefix}:user:{userId}:logs:";
    
    // =========================
    // Aggregations (medium-lived)
    // =========================
    
    public static string SessionStats(Guid sessionId) => $"{Prefix}:stats:session:{sessionId}";
    public static string CircuitStats(Guid circuitId) => $"{Prefix}:stats:circuit:{circuitId}";
    public static string DriverStats(Guid driverId) => $"{Prefix}:stats:driver:{driverId}";
    
    // =========================
    // Feed & Discovery (short-lived)
    // =========================
    
    public static string PopularSessions(int days = 7) => $"{Prefix}:popular:sessions:{days}d";
    public static string RecentReviews(int page = 1) => $"{Prefix}:recent:reviews:page:{page}";
    public static string FeedForUser(Guid userId, int page = 1) => $"{Prefix}:feed:{userId}:page:{page}";
}

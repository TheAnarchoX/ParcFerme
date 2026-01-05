using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ParcFerme.Api.Models;

namespace ParcFerme.Api.Data;

public sealed class ParcFermeDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public ParcFermeDbContext(DbContextOptions<ParcFermeDbContext> options) : base(options) { }

    // Event Cluster
    public DbSet<Series> Series => Set<Series>();
    public DbSet<Season> Seasons => Set<Season>();
    public DbSet<Round> Rounds => Set<Round>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<Circuit> Circuits => Set<Circuit>();
    public DbSet<Grandstand> Grandstands => Set<Grandstand>();
    public DbSet<Driver> Drivers => Set<Driver>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<Entrant> Entrants => Set<Entrant>();
    public DbSet<Result> Results => Set<Result>();

    // Social Cluster
    public DbSet<Log> Logs => Set<Log>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<ReviewLike> ReviewLikes => Set<ReviewLike>();
    public DbSet<ReviewComment> ReviewComments => Set<ReviewComment>();
    public DbSet<Experience> Experiences => Set<Experience>();
    public DbSet<UserList> UserLists => Set<UserList>();
    public DbSet<ListItem> ListItems => Set<ListItem>();
    public DbSet<UserFollow> UserFollows => Set<UserFollow>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // =========================
        // Event Cluster Configuration
        // =========================

        modelBuilder.Entity<Series>(entity =>
        {
            entity.HasIndex(e => e.Slug).IsUnique();
        });

        modelBuilder.Entity<Season>(entity =>
        {
            entity.HasIndex(e => new { e.SeriesId, e.Year }).IsUnique();
            entity.HasOne(e => e.Series)
                  .WithMany(s => s.Seasons)
                  .HasForeignKey(e => e.SeriesId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Round>(entity =>
        {
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.HasIndex(e => e.OpenF1MeetingKey);
            entity.HasOne(e => e.Season)
                  .WithMany(s => s.Rounds)
                  .HasForeignKey(e => e.SeasonId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Circuit)
                  .WithMany(c => c.Rounds)
                  .HasForeignKey(e => e.CircuitId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Session>(entity =>
        {
            entity.HasIndex(e => e.OpenF1SessionKey);
            entity.HasOne(e => e.Round)
                  .WithMany(r => r.Sessions)
                  .HasForeignKey(e => e.RoundId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Circuit>(entity =>
        {
            entity.HasIndex(e => e.Slug).IsUnique();
        });

        modelBuilder.Entity<Grandstand>(entity =>
        {
            entity.HasOne(e => e.Circuit)
                  .WithMany(c => c.Grandstands)
                  .HasForeignKey(e => e.CircuitId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Driver>(entity =>
        {
            entity.HasIndex(e => e.Slug).IsUnique();
        });

        modelBuilder.Entity<Team>(entity =>
        {
            entity.HasIndex(e => e.Slug).IsUnique();
        });

        modelBuilder.Entity<Entrant>(entity =>
        {
            entity.HasIndex(e => new { e.RoundId, e.DriverId, e.TeamId });
            entity.HasOne(e => e.Round)
                  .WithMany(r => r.Entrants)
                  .HasForeignKey(e => e.RoundId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Driver)
                  .WithMany(d => d.Entrants)
                  .HasForeignKey(e => e.DriverId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Team)
                  .WithMany(t => t.Entrants)
                  .HasForeignKey(e => e.TeamId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Result>(entity =>
        {
            entity.HasIndex(e => new { e.SessionId, e.EntrantId }).IsUnique();
            entity.HasOne(e => e.Session)
                  .WithMany(s => s.Results)
                  .HasForeignKey(e => e.SessionId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Entrant)
                  .WithMany(en => en.Results)
                  .HasForeignKey(e => e.EntrantId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================
        // Social Cluster Configuration
        // =========================

        modelBuilder.Entity<Log>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.SessionId }).IsUnique();
            entity.HasIndex(e => e.LoggedAt);
            entity.Property(e => e.StarRating).HasPrecision(2, 1);
            entity.HasOne(e => e.User)
                  .WithMany(u => u.Logs)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Session)
                  .WithMany(s => s.Logs)
                  .HasForeignKey(e => e.SessionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Review>(entity =>
        {
            entity.HasOne(e => e.Log)
                  .WithOne(l => l.Review)
                  .HasForeignKey<Review>(e => e.LogId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ReviewLike>(entity =>
        {
            entity.HasIndex(e => new { e.ReviewId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Review)
                  .WithMany(r => r.Likes)
                  .HasForeignKey(e => e.ReviewId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ReviewComment>(entity =>
        {
            entity.HasOne(e => e.Review)
                  .WithMany(r => r.Comments)
                  .HasForeignKey(e => e.ReviewId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Experience>(entity =>
        {
            entity.HasOne(e => e.Log)
                  .WithOne(l => l.Experience)
                  .HasForeignKey<Experience>(e => e.LogId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Grandstand)
                  .WithMany()
                  .HasForeignKey(e => e.GrandstandId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<UserList>(entity =>
        {
            entity.HasOne(e => e.User)
                  .WithMany(u => u.Lists)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ListItem>(entity =>
        {
            entity.HasIndex(e => new { e.ListId, e.OrderIndex });
            entity.HasOne(e => e.List)
                  .WithMany(l => l.Items)
                  .HasForeignKey(e => e.ListId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Session)
                  .WithMany()
                  .HasForeignKey(e => e.SessionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserFollow>(entity =>
        {
            entity.HasIndex(e => new { e.FollowerId, e.FollowingId }).IsUnique();
            entity.HasOne(e => e.Follower)
                  .WithMany(u => u.Following)
                  .HasForeignKey(e => e.FollowerId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Following)
                  .WithMany(u => u.Followers)
                  .HasForeignKey(e => e.FollowingId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}

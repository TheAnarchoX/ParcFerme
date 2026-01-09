using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParcFerme.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPendingMatchTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PendingMatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EntityType = table.Column<int>(type: "integer", nullable: false),
                    IncomingName = table.Column<string>(type: "text", nullable: false),
                    IncomingDataJson = table.Column<string>(type: "jsonb", nullable: true),
                    CandidateEntityId = table.Column<Guid>(type: "uuid", nullable: true),
                    CandidateEntityName = table.Column<string>(type: "text", nullable: true),
                    MatchScore = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    SignalsJson = table.Column<string>(type: "jsonb", nullable: true),
                    Source = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResolvedBy = table.Column<string>(type: "text", nullable: true),
                    Resolution = table.Column<int>(type: "integer", nullable: true),
                    ResolutionNotes = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PendingMatches", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PendingMatches_CreatedAt",
                table: "PendingMatches",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PendingMatches_EntityType",
                table: "PendingMatches",
                column: "EntityType");

            migrationBuilder.CreateIndex(
                name: "IX_PendingMatches_EntityType_Status",
                table: "PendingMatches",
                columns: new[] { "EntityType", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_PendingMatches_Source",
                table: "PendingMatches",
                column: "Source");

            migrationBuilder.CreateIndex(
                name: "IX_PendingMatches_Status",
                table: "PendingMatches",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PendingMatches");
        }
    }
}

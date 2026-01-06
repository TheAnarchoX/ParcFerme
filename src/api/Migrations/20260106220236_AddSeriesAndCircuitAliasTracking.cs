using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParcFerme.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSeriesAndCircuitAliasTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CircuitAliases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CircuitId = table.Column<Guid>(type: "uuid", nullable: false),
                    AliasName = table.Column<string>(type: "text", nullable: false),
                    AliasSlug = table.Column<string>(type: "text", nullable: false),
                    ValidFrom = table.Column<DateOnly>(type: "date", nullable: true),
                    ValidUntil = table.Column<DateOnly>(type: "date", nullable: true),
                    Source = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CircuitAliases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CircuitAliases_Circuits_CircuitId",
                        column: x => x.CircuitId,
                        principalTable: "Circuits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SeriesAliases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SeriesId = table.Column<Guid>(type: "uuid", nullable: false),
                    AliasName = table.Column<string>(type: "text", nullable: false),
                    AliasSlug = table.Column<string>(type: "text", nullable: false),
                    LogoUrl = table.Column<string>(type: "text", nullable: true),
                    ValidFrom = table.Column<DateOnly>(type: "date", nullable: true),
                    ValidUntil = table.Column<DateOnly>(type: "date", nullable: true),
                    Source = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeriesAliases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SeriesAliases_Series_SeriesId",
                        column: x => x.SeriesId,
                        principalTable: "Series",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CircuitAliases_AliasSlug",
                table: "CircuitAliases",
                column: "AliasSlug");

            migrationBuilder.CreateIndex(
                name: "IX_CircuitAliases_CircuitId_AliasSlug",
                table: "CircuitAliases",
                columns: new[] { "CircuitId", "AliasSlug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SeriesAliases_AliasSlug",
                table: "SeriesAliases",
                column: "AliasSlug");

            migrationBuilder.CreateIndex(
                name: "IX_SeriesAliases_SeriesId_AliasSlug",
                table: "SeriesAliases",
                columns: new[] { "SeriesId", "AliasSlug" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CircuitAliases");

            migrationBuilder.DropTable(
                name: "SeriesAliases");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParcFerme.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEntityAliasTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OpenF1DriverNumber",
                table: "Drivers",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DriverAliases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DriverId = table.Column<Guid>(type: "uuid", nullable: false),
                    AliasName = table.Column<string>(type: "text", nullable: false),
                    AliasSlug = table.Column<string>(type: "text", nullable: false),
                    SeriesId = table.Column<Guid>(type: "uuid", nullable: true),
                    DriverNumber = table.Column<int>(type: "integer", nullable: true),
                    ValidFrom = table.Column<DateOnly>(type: "date", nullable: true),
                    ValidUntil = table.Column<DateOnly>(type: "date", nullable: true),
                    Source = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DriverAliases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DriverAliases_Drivers_DriverId",
                        column: x => x.DriverId,
                        principalTable: "Drivers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DriverAliases_Series_SeriesId",
                        column: x => x.SeriesId,
                        principalTable: "Series",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "TeamAliases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamId = table.Column<Guid>(type: "uuid", nullable: false),
                    AliasName = table.Column<string>(type: "text", nullable: false),
                    AliasSlug = table.Column<string>(type: "text", nullable: false),
                    SeriesId = table.Column<Guid>(type: "uuid", nullable: true),
                    ValidFrom = table.Column<DateOnly>(type: "date", nullable: true),
                    ValidUntil = table.Column<DateOnly>(type: "date", nullable: true),
                    Source = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamAliases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeamAliases_Series_SeriesId",
                        column: x => x.SeriesId,
                        principalTable: "Series",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_TeamAliases_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Drivers_OpenF1DriverNumber",
                table: "Drivers",
                column: "OpenF1DriverNumber");

            migrationBuilder.CreateIndex(
                name: "IX_DriverAliases_AliasSlug",
                table: "DriverAliases",
                column: "AliasSlug");

            migrationBuilder.CreateIndex(
                name: "IX_DriverAliases_DriverId_AliasSlug",
                table: "DriverAliases",
                columns: new[] { "DriverId", "AliasSlug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DriverAliases_SeriesId",
                table: "DriverAliases",
                column: "SeriesId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamAliases_AliasSlug",
                table: "TeamAliases",
                column: "AliasSlug");

            migrationBuilder.CreateIndex(
                name: "IX_TeamAliases_SeriesId",
                table: "TeamAliases",
                column: "SeriesId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamAliases_TeamId_AliasSlug",
                table: "TeamAliases",
                columns: new[] { "TeamId", "AliasSlug" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DriverAliases");

            migrationBuilder.DropTable(
                name: "TeamAliases");

            migrationBuilder.DropIndex(
                name: "IX_Drivers_OpenF1DriverNumber",
                table: "Drivers");

            migrationBuilder.DropColumn(
                name: "OpenF1DriverNumber",
                table: "Drivers");
        }
    }
}

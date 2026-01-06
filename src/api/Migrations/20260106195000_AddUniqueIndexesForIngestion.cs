using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParcFerme.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueIndexesForIngestion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Sessions_OpenF1SessionKey",
                table: "Sessions");

            migrationBuilder.DropIndex(
                name: "IX_Entrants_RoundId_DriverId_TeamId",
                table: "Entrants");

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_OpenF1SessionKey",
                table: "Sessions",
                column: "OpenF1SessionKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Entrants_RoundId_DriverId",
                table: "Entrants",
                columns: new[] { "RoundId", "DriverId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Sessions_OpenF1SessionKey",
                table: "Sessions");

            migrationBuilder.DropIndex(
                name: "IX_Entrants_RoundId_DriverId",
                table: "Entrants");

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_OpenF1SessionKey",
                table: "Sessions",
                column: "OpenF1SessionKey");

            migrationBuilder.CreateIndex(
                name: "IX_Entrants_RoundId_DriverId_TeamId",
                table: "Entrants",
                columns: new[] { "RoundId", "DriverId", "TeamId" });
        }
    }
}

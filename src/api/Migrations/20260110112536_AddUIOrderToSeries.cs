using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParcFerme.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUIOrderToSeries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UIOrder",
                table: "Series",
                type: "integer",
                nullable: true);
            
            // Set default UIOrder values for known series
            // Lower values appear first in dropdowns and lists
            migrationBuilder.Sql("""
                UPDATE "Series" SET "UIOrder" = CASE "Slug"
                    WHEN 'f1' THEN 1
                    WHEN 'formula-1' THEN 1
                    WHEN 'motogp' THEN 2
                    WHEN 'indycar' THEN 3
                    WHEN 'wec' THEN 4
                    WHEN 'formula-e' THEN 5
                    WHEN 'nascar' THEN 6
                    WHEN 'nascar-cup-series' THEN 6
                    WHEN 'f2' THEN 10
                    WHEN 'formula-2' THEN 10
                    WHEN 'f3' THEN 11
                    WHEN 'formula-3' THEN 11
                    WHEN 'moto2' THEN 12
                    WHEN 'moto3' THEN 13
                    ELSE 99
                END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UIOrder",
                table: "Series");
        }
    }
}

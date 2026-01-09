using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParcFerme.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTheThirdTurnFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GoverningBody",
                table: "Series",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CarNumber",
                table: "Results",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LapsLed",
                table: "Results",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Nickname",
                table: "Drivers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaceOfBirth",
                table: "Drivers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OpenedYear",
                table: "Circuits",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrackStatus",
                table: "Circuits",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrackType",
                table: "Circuits",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GoverningBody",
                table: "Series");

            migrationBuilder.DropColumn(
                name: "CarNumber",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "LapsLed",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "Nickname",
                table: "Drivers");

            migrationBuilder.DropColumn(
                name: "PlaceOfBirth",
                table: "Drivers");

            migrationBuilder.DropColumn(
                name: "OpenedYear",
                table: "Circuits");

            migrationBuilder.DropColumn(
                name: "TrackStatus",
                table: "Circuits");

            migrationBuilder.DropColumn(
                name: "TrackType",
                table: "Circuits");
        }
    }
}

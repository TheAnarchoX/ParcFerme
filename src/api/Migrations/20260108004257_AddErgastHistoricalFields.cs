using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ParcFerme.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddErgastHistoricalFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Nationality",
                table: "Teams",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WikipediaUrl",
                table: "Teams",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ErgastRaceId",
                table: "Rounds",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WikipediaUrl",
                table: "Rounds",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FastestLapNumber",
                table: "Results",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FastestLapRank",
                table: "Results",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FastestLapSpeed",
                table: "Results",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FastestLapTime",
                table: "Results",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Q1Time",
                table: "Results",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Q2Time",
                table: "Results",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Q3Time",
                table: "Results",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StatusDetail",
                table: "Results",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TimeMilliseconds",
                table: "Results",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "DateOfBirth",
                table: "Drivers",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WikipediaUrl",
                table: "Drivers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Altitude",
                table: "Circuits",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WikipediaUrl",
                table: "Circuits",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Nationality",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "WikipediaUrl",
                table: "Teams");

            migrationBuilder.DropColumn(
                name: "ErgastRaceId",
                table: "Rounds");

            migrationBuilder.DropColumn(
                name: "WikipediaUrl",
                table: "Rounds");

            migrationBuilder.DropColumn(
                name: "FastestLapNumber",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "FastestLapRank",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "FastestLapSpeed",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "FastestLapTime",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "Q1Time",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "Q2Time",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "Q3Time",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "StatusDetail",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "TimeMilliseconds",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "DateOfBirth",
                table: "Drivers");

            migrationBuilder.DropColumn(
                name: "WikipediaUrl",
                table: "Drivers");

            migrationBuilder.DropColumn(
                name: "Altitude",
                table: "Circuits");

            migrationBuilder.DropColumn(
                name: "WikipediaUrl",
                table: "Circuits");
        }
    }
}

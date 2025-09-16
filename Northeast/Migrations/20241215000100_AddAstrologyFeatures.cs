using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Northeast.Migrations
{
    /// <inheritdoc />
    public partial class AddAstrologyFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AstrologyHoroscopes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ForDate = table.Column<DateOnly>(type: "date", nullable: false),
                    GeneratedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Summary = table.Column<string>(type: "text", nullable: false),
                    CosmicWeather = table.Column<string>(type: "text", nullable: false),
                    LunarPhase = table.Column<string>(type: "text", nullable: false),
                    Highlight = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AstrologyHoroscopes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AstrologySubscriptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    UserName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    SignId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CountryCode = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    TimeZone = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    SendHour = table.Column<int>(type: "integer", nullable: false, defaultValue: 5),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastSentForDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AstrologySubscriptions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AstrologySignForecasts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    HoroscopeId = table.Column<int>(type: "integer", nullable: false),
                    SignId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Headline = table.Column<string>(type: "text", nullable: false),
                    Summary = table.Column<string>(type: "text", nullable: false),
                    Energy = table.Column<string>(type: "text", nullable: false),
                    OutlookGeneral = table.Column<string>(type: "text", nullable: false),
                    OutlookLove = table.Column<string>(type: "text", nullable: false),
                    OutlookCareer = table.Column<string>(type: "text", nullable: false),
                    OutlookWellness = table.Column<string>(type: "text", nullable: false),
                    RelationsPeople = table.Column<string>(type: "text", nullable: false),
                    RelationsPets = table.Column<string>(type: "text", nullable: false),
                    RelationsPlanets = table.Column<string>(type: "text", nullable: false),
                    RelationsStars = table.Column<string>(type: "text", nullable: false),
                    RelationsStones = table.Column<string>(type: "text", nullable: false),
                    GuidanceRitual = table.Column<string>(type: "text", nullable: false),
                    GuidanceReflection = table.Column<string>(type: "text", nullable: false),
                    GuidanceAdventure = table.Column<string>(type: "text", nullable: false),
                    Mood = table.Column<string>(type: "text", nullable: false),
                    Color = table.Column<string>(type: "text", nullable: false),
                    Mantra = table.Column<string>(type: "text", nullable: false),
                    LuckyNumbers = table.Column<int[]>(type: "integer[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AstrologySignForecasts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AstrologySignForecasts_AstrologyHoroscopes_HoroscopeId",
                        column: x => x.HoroscopeId,
                        principalTable: "AstrologyHoroscopes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AstrologyHoroscopes_ForDate",
                table: "AstrologyHoroscopes",
                column: "ForDate",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AstrologySignForecasts_HoroscopeId_SignId",
                table: "AstrologySignForecasts",
                columns: new[] { "HoroscopeId", "SignId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AstrologySubscriptions_Email",
                table: "AstrologySubscriptions",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_AstrologySubscriptions_UserId",
                table: "AstrologySubscriptions",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AstrologySignForecasts");

            migrationBuilder.DropTable(
                name: "AstrologySubscriptions");

            migrationBuilder.DropTable(
                name: "AstrologyHoroscopes");
        }
    }
}

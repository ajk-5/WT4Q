using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Northeast.Migrations
{
    /// <inheritdoc />
    public partial class _2nd : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Articles_Country_CountryId",
                table: "Articles");

            migrationBuilder.DropTable(
                name: "Country");

            migrationBuilder.DropIndex(
                name: "IX_Articles_CountryId",
                table: "Articles");

            migrationBuilder.DropColumn(
                name: "CountryId",
                table: "Articles");

            migrationBuilder.AlterColumn<List<byte[]>>(
                name: "Photo",
                table: "Articles",
                type: "bytea[]",
                nullable: true,
                oldClrType: typeof(List<byte[]>),
                oldType: "bytea[]");

            migrationBuilder.AlterColumn<string>(
                name: "AltText",
                table: "Articles",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "CountryCode",
                table: "Articles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CountryName",
                table: "Articles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<List<string>>(
                name: "Keywords",
                table: "Articles",
                type: "text[]",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Admins",
                keyColumn: "Id",
                keyValue: new Guid("3bc99596-5eac-481a-b758-c4b2c5ba239f"),
                column: "Password",
                value: "$2a$10$e/ClUCcy1Ctn1Sy/ZMvkcuzSJXk0YvvD1m1s/JuhFTmrmmEjOIrI.");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("3bc99596-5eac-481a-b758-c4b2c5ba239f"),
                column: "Password",
                value: "$2a$10$e/ClUCcy1Ctn1Sy/ZMvkcuzSJXk0YvvD1m1s/JuhFTmrmmEjOIrI.");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CountryCode",
                table: "Articles");

            migrationBuilder.DropColumn(
                name: "CountryName",
                table: "Articles");

            migrationBuilder.DropColumn(
                name: "Keywords",
                table: "Articles");

            migrationBuilder.AlterColumn<List<byte[]>>(
                name: "Photo",
                table: "Articles",
                type: "bytea[]",
                nullable: false,
                oldClrType: typeof(List<byte[]>),
                oldType: "bytea[]",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AltText",
                table: "Articles",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CountryId",
                table: "Articles",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Country",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Country", x => x.Id);
                });

            migrationBuilder.UpdateData(
                table: "Admins",
                keyColumn: "Id",
                keyValue: new Guid("3bc99596-5eac-481a-b758-c4b2c5ba239f"),
                column: "Password",
                value: "$2a$10$CwXnoerau3kO8EBWY1etyeAcpxXvFmSVQsfQHMXjtqmhvI8cauxcO");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("3bc99596-5eac-481a-b758-c4b2c5ba239f"),
                column: "Password",
                value: "$2a$10$CwXnoerau3kO8EBWY1etyeAcpxXvFmSVQsfQHMXjtqmhvI8cauxcO");

            migrationBuilder.CreateIndex(
                name: "IX_Articles_CountryId",
                table: "Articles",
                column: "CountryId");

            migrationBuilder.AddForeignKey(
                name: "FK_Articles_Country_CountryId",
                table: "Articles",
                column: "CountryId",
                principalTable: "Country",
                principalColumn: "Id");
        }
    }
}

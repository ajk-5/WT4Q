using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Northeast.Migrations
{
    /// <inheritdoc />
    public partial class StoreEnumsAsString : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "Articles",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "ArticleType",
                table: "Articles",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "Category",
                table: "Articles",
                type: "integer",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(32)",
                oldMaxLength: 32);

            migrationBuilder.AlterColumn<int>(
                name: "ArticleType",
                table: "Articles",
                type: "integer",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(32)",
                oldMaxLength: 32);
        }
    }
}

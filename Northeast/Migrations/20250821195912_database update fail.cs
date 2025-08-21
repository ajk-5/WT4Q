using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Northeast.Migrations
{
    /// <inheritdoc />
    public partial class databaseupdatefail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EmbededCode",
                table: "Articles");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EmbededCode",
                table: "Articles",
                type: "text",
                nullable: true);
        }
    }
}

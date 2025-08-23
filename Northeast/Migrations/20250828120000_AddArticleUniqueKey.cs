using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Northeast.Migrations
{
    public partial class AddArticleUniqueKey : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {

            migrationBuilder.Sql(@"
                ALTER TABLE ""Articles""
                ADD COLUMN IF NOT EXISTS ""SourceUrlCanonical"" text NULL;
            ");

            migrationBuilder.Sql(@"
                ALTER TABLE ""Articles""
                ADD COLUMN IF NOT EXISTS ""UniqueKey"" text NULL;
            ");

            migrationBuilder.Sql(@"
                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Articles_UniqueKey""
                ON ""Articles""(""UniqueKey"")
                WHERE ""UniqueKey"" IS NOT NULL;
            ");

        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {

            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_Articles_UniqueKey"";");
            migrationBuilder.Sql(@"ALTER TABLE ""Articles"" DROP COLUMN IF EXISTS ""SourceUrlCanonical"";");
            migrationBuilder.Sql(@"ALTER TABLE ""Articles"" DROP COLUMN IF EXISTS ""UniqueKey"";");

        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Northeast.Migrations
{
    /// <inheritdoc />
    public partial class add_quiz_show_support : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
CREATE TABLE IF NOT EXISTS "Shows" (
    "Id" uuid NOT NULL,
    "Slug" character varying(160) NOT NULL,
    "Title" character varying(256) NOT NULL,
    "Kind" character varying(16) NOT NULL,
    "Description" character varying(1024) NULL,
    "ImageUrl" character varying(1024) NULL,
    "ImageBytes" bytea NULL,
    "ImageContentType" character varying(128) NULL,
    "ImageAltText" character varying(512) NULL,
    "ImageCaption" character varying(1024) NULL,
    "YearStart" integer NULL,
    "YearEnd" integer NULL,
    "Tags" text[] NULL,
    "CreatedAtUtc" timestamp with time zone NOT NULL,
    "UpdatedAtUtc" timestamp with time zone NULL,
    CONSTRAINT "PK_Shows" PRIMARY KEY ("Id")
);

CREATE TABLE IF NOT EXISTS "Quizzes" (
    "Id" uuid NOT NULL,
    "Slug" character varying(160) NOT NULL,
    "Title" character varying(256) NOT NULL,
    "Description" character varying(1024) NULL,
    "Category" character varying(64) NULL,
    "Type" character varying(32) NOT NULL,
    "CreatedAtUtc" timestamp with time zone NOT NULL,
    "UpdatedAtUtc" timestamp with time zone NULL,
    "PublishedAtUtc" timestamp with time zone NULL,
    "Status" character varying(16) NOT NULL,
    "Author" character varying(128) NULL,
    "ImageUrl" character varying(1024) NULL,
    "Tags" text[] NULL,
    "Randomize" boolean NOT NULL,
    "TimeLimitSec" integer NULL,
    "ShowExplanations" boolean NOT NULL,
    "ShowId" uuid NULL,
    CONSTRAINT "PK_Quizzes" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_Quizzes_Shows_ShowId" FOREIGN KEY ("ShowId") REFERENCES "Shows" ("Id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "ShowTrivias" (
    "Id" uuid NOT NULL,
    "ShowId" uuid NOT NULL,
    "Text" character varying(1024) NOT NULL,
    "ImageUrl" character varying(1024) NULL,
    "CreatedAtUtc" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_ShowTrivias" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_ShowTrivias_Shows_ShowId" FOREIGN KEY ("ShowId") REFERENCES "Shows" ("Id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "QuizQuestions" (
    "Id" uuid NOT NULL,
    "QuizId" uuid NOT NULL,
    "Prompt" character varying(1024) NOT NULL,
    "ImageUrl" character varying(1024) NULL,
    "Choices" text[] NULL,
    "Answer" character varying(512) NOT NULL,
    "Explanation" character varying(1024) NULL,
    "Points" integer NOT NULL DEFAULT 1,
    "Difficulty" character varying(16) NULL,
    "Order" integer NOT NULL,
    CONSTRAINT "PK_QuizQuestions" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_QuizQuestions_Quizzes_QuizId" FOREIGN KEY ("QuizId") REFERENCES "Quizzes" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_QuizQuestions_QuizId_Order" ON "QuizQuestions" ("QuizId", "Order");
CREATE INDEX IF NOT EXISTS "IX_Quizzes_ShowId" ON "Quizzes" ("ShowId");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Quizzes_Slug" ON "Quizzes" ("Slug");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Shows_Slug" ON "Shows" ("Slug");
CREATE INDEX IF NOT EXISTS "IX_Shows_Title" ON "Shows" ("Title");
CREATE INDEX IF NOT EXISTS "IX_ShowTrivias_ShowId_CreatedAtUtc" ON "ShowTrivias" ("ShowId", "CreatedAtUtc");
""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
DROP TABLE IF EXISTS "QuizQuestions";
DROP TABLE IF EXISTS "ShowTrivias";
DROP TABLE IF EXISTS "Quizzes";
DROP TABLE IF EXISTS "Shows";
""");
        }
    }
}

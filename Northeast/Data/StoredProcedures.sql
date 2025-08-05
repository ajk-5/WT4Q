-- SQL definitions for application stored procedures

CREATE OR REPLACE FUNCTION get_recent_articles(p_limit integer)
RETURNS SETOF "Articles" AS $$
  SELECT * FROM "Articles"
  ORDER BY "CreatedDate" DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

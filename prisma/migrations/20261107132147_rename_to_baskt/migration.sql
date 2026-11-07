-- The shop is now called baskt (it was AfroPantry), and its plans baskt Basic and
-- baskt Plus (they were AfroBasic and AfroPlus). Renames the old names in shop
-- text already in the database: seeded product descriptions and brands, plus
-- anything admins typed. Past orders keep the names they were bought under.
CREATE FUNCTION pg_temp.rebrand(text) RETURNS text AS $$
  SELECT replace(replace(replace($1, 'AfroPantry', 'baskt'), 'AfroPlus', 'baskt Plus'), 'AfroBasic', 'baskt Basic')
$$ LANGUAGE sql IMMUTABLE;

UPDATE "Product" SET
  "name" = pg_temp.rebrand("name"),
  "description" = pg_temp.rebrand("description"),
  "brand" = pg_temp.rebrand("brand")
WHERE concat_ws(' ', "name", "description", "brand") ~ 'Afro(Pantry|Plus|Basic)';

UPDATE "Recipe" SET
  "title" = pg_temp.rebrand("title"),
  "description" = pg_temp.rebrand("description"),
  "steps" = ARRAY(
    SELECT pg_temp.rebrand(step)
    FROM unnest("steps") WITH ORDINALITY AS s(step, position)
    ORDER BY position
  )
WHERE concat_ws(' ', "title", "description", array_to_string("steps", ' ')) ~ 'Afro(Pantry|Plus|Basic)';

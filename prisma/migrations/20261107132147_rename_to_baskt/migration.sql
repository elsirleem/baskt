-- The shop is now called baskt (it was AfroPantry). Renames the old name in shop
-- text already in the database: seeded product descriptions and brands, plus
-- anything admins typed. Past orders keep the names they were bought under.
UPDATE "Product" SET
  "name" = replace("name", 'AfroPantry', 'baskt'),
  "description" = replace("description", 'AfroPantry', 'baskt'),
  "brand" = replace("brand", 'AfroPantry', 'baskt')
WHERE "name" LIKE '%AfroPantry%'
   OR "description" LIKE '%AfroPantry%'
   OR "brand" LIKE '%AfroPantry%';

UPDATE "Recipe" SET
  "title" = replace("title", 'AfroPantry', 'baskt'),
  "description" = replace("description", 'AfroPantry', 'baskt'),
  "steps" = ARRAY(
    SELECT replace(step, 'AfroPantry', 'baskt')
    FROM unnest("steps") WITH ORDINALITY AS s(step, position)
    ORDER BY position
  )
WHERE "title" LIKE '%AfroPantry%'
   OR "description" LIKE '%AfroPantry%'
   OR array_to_string("steps", ' ') LIKE '%AfroPantry%';

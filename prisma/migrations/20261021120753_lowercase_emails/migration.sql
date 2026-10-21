-- Emails are now stored lowercase. Normalise existing accounts so they can still
-- sign in. Fails (and changes nothing) if two accounts differ only by capitals;
-- merge those by hand first.
UPDATE "User" SET "email" = lower(btrim("email")) WHERE "email" <> lower(btrim("email"));

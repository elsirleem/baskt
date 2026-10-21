/**
 * The database the db tests use: TEST_DATABASE_URL, or DATABASE_URL with "_test"
 * added to the database name. Anything whose name doesn't end in "_test" is
 * refused, so the tests (which empty tables) can never touch a real database.
 */
export function testDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL;
  const base = explicit ?? process.env.DATABASE_URL;
  if (!base) {
    throw new Error("Set TEST_DATABASE_URL (or DATABASE_URL) to run the database tests.");
  }

  const url = new URL(base);
  if (!explicit && !url.pathname.endsWith("_test")) url.pathname = `${url.pathname}_test`;

  const name = url.pathname.slice(1);
  if (!name.endsWith("_test")) {
    throw new Error(`Refusing to run database tests against "${name}": its name must end in _test.`);
  }
  return url.toString();
}

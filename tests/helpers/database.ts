const TEST_DATABASE_NAME_PATTERN = /(^|[_-])test($|[_-])/i;

export const assertTestDatabaseUrl = (value: string | undefined): string => {
  if (!value) {
    throw new Error('A test database URL is required.');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('The test database URL is invalid.');
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('The test database URL must use PostgreSQL.');
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error('Refusing to use a URL whose database name is not explicitly marked as a test database.');
  }

  return value;
};

export const getTestDatabaseUrl = (): string => assertTestDatabaseUrl(process.env.TEST_DATABASE_URL);

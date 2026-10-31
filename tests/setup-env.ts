// Integration/acceptance tests read DATABASE_URL etc. from the same .env the app uses.
try {
  process.loadEnvFile(".env");
} catch {
  // unit tests don't need it
}

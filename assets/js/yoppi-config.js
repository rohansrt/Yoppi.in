/**
 * YOPPI backend config — the two public Supabase values and the hCaptcha
 * site key. Safe to commit: the Supabase anon key is meant to be public
 * (protected by Row Level Security, not secrecy — see
 * BACKEND_REQUIREMENTS.md §7 in the yoppi_be repo) and the hCaptcha site
 * key is public by design (only the *secret* key, which never leaves the
 * backend, is sensitive).
 *
 * Load this script before yoppi-client.js on every page that needs it.
 */

window.YOPPI_CONFIG = {
  SUPABASE_URL: "https://dcueqjpwxkfzajqnbmeu.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdWVxanB3eGtmemFqcW5ibWV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MTM5ODYsImV4cCI6MjEwMDE4OTk4Nn0.KMlq0Udj34BkXAfH9gGvriY7eiW6_J8X_qZV0d_YYJ4",
  HCAPTCHA_SITE_KEY: "059c2c0a-3446-421e-b7c4-54249832b3e4",
};

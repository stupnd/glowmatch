/** Lets `next build` succeed without `.env.local`; override with real Supabase values at runtime. */
export const SUPABASE_PLACEHOLDER_URL = "https://placeholder.supabase.co";
export const SUPABASE_PLACEHOLDER_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjEwMDAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0.placeholder";

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? SUPABASE_PLACEHOLDER_URL;
}

export function getSupabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? SUPABASE_PLACEHOLDER_ANON_KEY
  );
}

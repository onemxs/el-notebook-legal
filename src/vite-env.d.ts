/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Public, safe to ship in the client bundle (Supabase enforces RLS).
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

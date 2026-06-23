import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, SUPA_CONFIGURED, tocarConexion } from "./supabase";

export interface Perfil {
  id: string;
  nombre_completo: string | null;
  cedula: string | null;
  especialidad: string | null;
  logotipo_url: string | null;
  rol_sistema: "superadmin" | "usuario";
  tipo_plan: "individual" | "despacho";
  organizacion_id: string | null;
  rol_organizacion: "dueno" | "invitado" | "ninguno";
  tema: "claro" | "oscuro" | "auto";
  onboarding_completo: boolean;
  ultima_conexion: string | null;
}

interface AuthState {
  session: Session | null;
  perfil: Perfil | null;
  loading: boolean;
  /** "Explorar sin cuenta": use the app with example data, no persistence. */
  demo: boolean;
  isSuperadmin: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (
    email: string,
    password: string,
    nombre: string,
  ) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
  exitDemo: () => void;
  refreshPerfil: () => Promise<void>;
  /** Accept a pending org invitation stored before auth (token in sessionStorage). */
  processPendingInvite: () => Promise<{ error?: string }>;
}

const Ctx = createContext<AuthState | null>(null);
const DEMO_KEY = "pasantia-demo";
const INVITE_KEY = "pasantia-invite";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(DEMO_KEY) === "1";
    } catch {
      return false;
    }
  });

  const loadPerfil = useCallback(async (userId: string) => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.from("perfiles").select("*").eq("id", userId).maybeSingle();
    setPerfil((data as Perfil) ?? null);
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }
    let active = true;
    sb.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) void loadPerfil(data.session.user.id);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) void loadPerfil(next.user.id);
      else setPerfil(null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadPerfil]);

  const enterDemo = useCallback(() => {
    try {
      sessionStorage.setItem(DEMO_KEY, "1");
    } catch {
      /* noop */
    }
    setDemo(true);
  }, []);

  const exitDemo = useCallback(() => {
    try {
      sessionStorage.removeItem(DEMO_KEY);
    } catch {
      /* noop */
    }
    setDemo(false);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return { error: "El servidor seguro no responde." };
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    return error ? { error: error.message } : {};
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) return { error: "El servidor seguro no responde." };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, nombre: string) => {
      const sb = getSupabase();
      if (!sb) return { error: "El servidor seguro no responde." };
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: nombre },
          emailRedirectTo: `${window.location.origin}/app`,
        },
      });
      if (error) return { error: error.message };
      // When email confirmation is on, there's no active session yet.
      return { needsConfirmation: !data.session };
    },
    [],
  );

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    await sb?.auth.signOut();
    setSession(null);
    setPerfil(null);
    exitDemo();
  }, [exitDemo]);

  const refreshPerfil = useCallback(async () => {
    if (session) await loadPerfil(session.user.id);
  }, [session, loadPerfil]);

  const processPendingInvite = useCallback(async () => {
    let token: string | null = null;
    try {
      token = sessionStorage.getItem(INVITE_KEY);
    } catch {
      /* noop */
    }
    if (!token || !session) return {};
    try {
      sessionStorage.removeItem(INVITE_KEY); // claim it (avoids double-accept)
    } catch {
      /* noop */
    }
    const sb = getSupabase();
    if (!sb) return { error: "Sin conexión al Servidor Seguro." };
    const { error } = await sb.rpc("aceptar_invitacion", { p_token: token });
    if (error) return { error: error.message };
    await loadPerfil(session.user.id);
    return {};
  }, [session, loadPerfil]);

  // Auto-accept a pending invitation once authenticated (covers the OAuth
  // redirect, which lands on /app rather than the invitation page).
  useEffect(() => {
    if (session) void processPendingInvite();
  }, [session, processPendingInvite]);

  // Touch last-connection timestamp after profile loads
  useEffect(() => {
    if (session && perfil) void tocarConexion();
  }, [session, perfil]);

  const value: AuthState = {
    session,
    perfil,
    loading,
    demo,
    isSuperadmin: perfil?.rol_sistema === "superadmin",
    configured: SUPA_CONFIGURED,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    enterDemo,
    exitDemo,
    refreshPerfil,
    processPendingInvite,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

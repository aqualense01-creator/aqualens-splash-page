import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { insforge, type AppRole, type Profile } from "./insforge";

type AuthUser = { id: string; email: string };

type AuthCtx = {
  loading: boolean;
  user: AuthUser | null;
  profile: Profile | null;
  roles: AppRole[];
  isAdmin: boolean;
  isTechnician: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; needsVerification?: boolean }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsVerification?: boolean }>;
  verifyEmail: (email: string, otp: string) => Promise<{ error: string | null }>;
  resendVerification: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);

  async function loadSession() {
    try {
      const { data } = await insforge.auth.getCurrentUser();
      const u = data?.user;
      if (!u) {
        setUser(null);
        setProfile(null);
        setRoles([]);
        return;
      }
      setUser({ id: u.id, email: u.email ?? "" });

      const [profRes, rolesRes] = await Promise.all([
        insforge.database.from("profiles").select("*").eq("id", u.id).maybeSingle(),
        insforge.database.from("user_roles").select("role").eq("user_id", u.id),
      ]);
      setProfile((profRes.data as Profile | null) ?? null);
      setRoles((rolesRes.data ?? []).map((r: { role: AppRole }) => r.role));
    } catch (e) {
      console.error("auth load failed", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }
    loadSession();
  }, []);

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    const { error } = await insforge.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message ?? "Sign-in failed";
      const needsVerification = /verif/i.test(msg) || (error as { statusCode?: number }).statusCode === 403;
      return { error: msg, needsVerification };
    }
    await loadSession();
    return { error: null };
  };

  const signUp: AuthCtx["signUp"] = async (email, password, fullName) => {
    const { data, error } = await insforge.auth.signUp({ email, password, name: fullName });
    if (error) return { error: error.message ?? "Sign-up failed" };
    const needsVerification = !data?.accessToken;
    if (!needsVerification) await loadSession();
    return { error: null, needsVerification };
  };

  const verifyEmail: AuthCtx["verifyEmail"] = async (email, otp) => {
    const { error } = await insforge.auth.verifyEmail({ email, otp });
    if (error) return { error: error.message ?? "Verification failed" };
    await insforge.auth.signInWithPassword({ email, password: "" }).catch(() => null);
    await loadSession();
    return { error: null };
  };

  const resendVerification: AuthCtx["resendVerification"] = async (email) => {
    const { error } = await insforge.auth.resendVerificationEmail({ email });
    if (error) return { error: error.message ?? "Could not resend code" };
    return { error: null };
  };

  const signOut = async () => {
    await insforge.auth.signOut();
    setUser(null);
    setProfile(null);
    setRoles([]);
  };

  return (
    <Ctx.Provider
      value={{
        loading,
        user,
        profile,
        roles,
        isAdmin: roles.includes("admin"),
        isTechnician: roles.includes("technician"),
        signIn,
        signUp,
        verifyEmail,
        resendVerification,
        signOut,
        refresh: loadSession,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { insforge } from "./insforge";

export type AppRole = "farmer" | "farm_manager" | "technician" | "admin" | "support";
export type AccountStatus = "active" | "suspended" | "invited";

export type Profile = {
  id: string;
  full_name: string | null;
  email?: string | null;
  phone: string | null;
  district: string | null;
  language: "en" | "bn";
  avatar_url: string | null;
  account_status?: AccountStatus | string | null;
  assigned_farm_id?: string | null;
  last_active_at?: string | null;
  created_at: string;
};

type AuthUser = {
  id: string;
  email: string;
  phone?: string | null;
};

type SignUpInput = {
  email: string;
  password: string;
};

type AuthResult = {
  error: string | null;
  needsVerification?: boolean;
};

type AuthCtx = {
  loading: boolean;
  user: AuthUser | null;
  profile: Profile | null;
  roles: AppRole[];
  accountStatus: AccountStatus;
  isAdmin: boolean;
  isTechnician: boolean;
  isFarmManager: boolean;
  isSupport: boolean;
  isFarmer: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  verifyEmail: (email: string, code: string) => Promise<AuthResult>;
  resendVerification: (email: string) => Promise<AuthResult>;
  sendResetLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);
const APP_ROLES: AppRole[] = ["farmer", "farm_manager", "technician", "admin", "support"];

function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

function normalizeAccountStatus(value: unknown): AccountStatus | null {
  if (value === "active" || value === "suspended" || value === "invited") return value;
  return null;
}

function clearAuthState(
  setUser: (value: AuthUser | null) => void,
  setProfile: (value: Profile | null) => void,
  setRoles: (value: AppRole[]) => void,
) {
  setUser(null);
  setProfile(null);
  setRoles([]);
}

function hasBrowserRefreshSignal(): boolean {
  if (typeof document === "undefined") return true;
  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim().startsWith("insforge_csrf_token="));
}

function hasInMemorySession(): boolean {
  const client = insforge as unknown as {
    tokenManager?: { getSession?: () => unknown };
  };
  return Boolean(client.tokenManager?.getSession?.());
}

export function isBangladeshPhone(value: string): boolean {
  const cleaned = value.replace(/[\s-]/g, "");
  return /^\+8801[3-9]\d{8}$/.test(cleaned) || /^01[3-9]\d{8}$/.test(cleaned);
}

export function normalizeBangladeshPhone(value: string): string {
  const cleaned = value.replace(/[\s-]/g, "");
  if (/^01[3-9]\d{8}$/.test(cleaned)) return "+880" + cleaned.slice(1);
  return cleaned;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidIdentifier(value: string): "email" | null {
  return isValidEmail(value) ? "email" : null;
}

function authMessage(error: any, fallback: string): string {
  return error?.message || fallback;
}

function needsEmailVerification(error: any): boolean {
  const message = String(error?.message || "").toLowerCase();
  return error?.statusCode === 403 || message.includes("verify") || message.includes("verified");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);

  async function loadSession(): Promise<{ blockedReason?: string }> {
    try {
      setLoading(true);
      if (!hasBrowserRefreshSignal() && !hasInMemorySession()) {
        clearAuthState(setUser, setProfile, setRoles);
        return {};
      }

      const { data: userData, error: userError } = await insforge.auth.getCurrentUser();
      if (userError || !userData?.user) {
        clearAuthState(setUser, setProfile, setRoles);
        return {};
      }

      const userObj = userData.user;
      const [profileRes, rolesRes] = await Promise.all([
        insforge.database.from("profiles").select("*").eq("id", userObj.id).maybeSingle(),
        insforge.database.from("user_roles").select("role").eq("user_id", userObj.id),
      ]);

      if (profileRes.error) {
        await insforge.auth.signOut().catch(() => undefined);
        clearAuthState(setUser, setProfile, setRoles);
        return {
          blockedReason: authMessage(
            profileRes.error,
            "We could not load your profile. Please sign in again.",
          ),
        };
      }

      if (rolesRes.error) {
        await insforge.auth.signOut().catch(() => undefined);
        clearAuthState(setUser, setProfile, setRoles);
        return {
          blockedReason: authMessage(
            rolesRes.error,
            "We could not load your access role. Please sign in again.",
          ),
        };
      }

      const currentProfile = profileRes.data as Profile | null;
      if (!currentProfile) {
        await insforge.auth.signOut().catch(() => undefined);
        clearAuthState(setUser, setProfile, setRoles);
        return {
          blockedReason:
            "Your user profile is not ready yet. Please contact support if this keeps happening.",
        };
      }

      const accountStatus = normalizeAccountStatus(currentProfile?.account_status);
      if (accountStatus !== "active") {
        await insforge.auth.signOut().catch(() => undefined);
        clearAuthState(setUser, setProfile, setRoles);
        return {
          blockedReason:
            accountStatus === "suspended"
              ? "This account is suspended. Contact support to restore access."
              : accountStatus === "invited"
                ? "This account is not active yet."
                : "This account has an unknown status. Contact support to restore access.",
        };
      }

      const userRoles = (rolesRes.data ?? [])
        .map((r: any) => r.role)
        .filter(isAppRole) as AppRole[];

      setUser({
        id: userObj.id,
        email: userObj.email,
        phone: currentProfile?.phone || null,
      });
      setProfile(currentProfile);
      if (userRoles.length === 0) {
        await insforge.auth.signOut().catch(() => undefined);
        clearAuthState(setUser, setProfile, setRoles);
        return {
          blockedReason: "Your account does not have an access role yet. Please contact support.",
        };
      }

      setRoles(userRoles);
      return {};
    } catch (err) {
      console.error("Error loading session:", err);
      clearAuthState(setUser, setProfile, setRoles);
      return {};
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSession();
  }, []);

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await insforge.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        return {
          error: authMessage(error, "Failed to sign in."),
          needsVerification: needsEmailVerification(error),
        };
      }
      const session = await loadSession();
      if (session.blockedReason) return { error: session.blockedReason };
      return { error: null };
    } catch (e: any) {
      return { error: authMessage(e, "Failed to sign in.") };
    }
  };

  const signUp: AuthCtx["signUp"] = async ({ email, password }) => {
    try {
      if (!isValidEmail(email)) return { error: "Enter a valid email address." };
      if (password.length < 8) return { error: "Password must be at least 8 characters." };

      const normalizedEmail = email.trim().toLowerCase();
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/login?verified=1` : undefined;

      const { data, error } = await insforge.auth.signUp({
        email: normalizedEmail,
        password,
        redirectTo,
      });
      if (error) {
        return { error: authMessage(error, "Failed to create account.") };
      }

      if (data?.accessToken) {
        const session = await loadSession();
        if (session.blockedReason) return { error: session.blockedReason };
      }

      return {
        error: null,
        needsVerification: Boolean(data?.requireEmailVerification || !data?.accessToken),
      };
    } catch (e: any) {
      return { error: authMessage(e, "Failed to create account.") };
    }
  };

  const verifyEmail: AuthCtx["verifyEmail"] = async (email, code) => {
    try {
      if (!isValidEmail(email)) return { error: "Enter a valid email address." };
      if (!/^\d{6}$/.test(code.trim())) return { error: "Enter the 6-digit code." };

      const { error } = await insforge.auth.verifyEmail({
        email: email.trim().toLowerCase(),
        otp: code.trim(),
      });
      if (error) return { error: authMessage(error, "Failed to verify email.") };

      const session = await loadSession();
      if (session.blockedReason) return { error: session.blockedReason };
      return { error: null };
    } catch (e: any) {
      return { error: authMessage(e, "Failed to verify email.") };
    }
  };

  const resendVerification: AuthCtx["resendVerification"] = async (email) => {
    try {
      if (!isValidEmail(email)) return { error: "Enter a valid email address." };
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/login?verified=1` : undefined;

      const { error } = await insforge.auth.resendVerificationEmail({
        email: email.trim().toLowerCase(),
        redirectTo,
      });
      if (error) return { error: authMessage(error, "Failed to resend verification email.") };
      return { error: null };
    } catch (e: any) {
      return { error: authMessage(e, "Failed to resend verification email.") };
    }
  };

  const sendResetLink: AuthCtx["sendResetLink"] = async (email) => {
    try {
      if (!isValidEmail(email)) return { error: "Enter a valid email address." };
      const { error } = await insforge.auth.sendResetPasswordEmail({
        email: email.trim().toLowerCase(),
        redirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
      });
      if (error) return { error: authMessage(error, "Failed to send reset link.") };
      return { error: null };
    } catch (e: any) {
      return { error: authMessage(e, "Failed to send reset link.") };
    }
  };

  const signOut = async () => {
    try {
      await insforge.auth.signOut();
    } catch (e) {
      console.error("Error signing out:", e);
    }
    clearAuthState(setUser, setProfile, setRoles);
  };

  const accountStatus = normalizeAccountStatus(profile?.account_status) ?? "suspended";

  return (
    <Ctx.Provider
      value={{
        loading,
        user,
        profile,
        roles,
        accountStatus,
        isAdmin: roles.includes("admin"),
        isTechnician: roles.includes("technician"),
        isFarmManager: roles.includes("farm_manager"),
        isSupport: roles.includes("support"),
        isFarmer: roles.includes("farmer"),
        signIn,
        signUp,
        verifyEmail,
        resendVerification,
        sendResetLink,
        signOut,
        refresh: async () => {
          await loadSession();
        },
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

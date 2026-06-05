import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AppRole = "farmer" | "technician" | "admin";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  district: string | null;
  language: "en" | "bn";
  avatar_url: string | null;
  created_at: string;
};

type AuthUser = {
  id: string;
  email: string;
  phone?: string | null;
};

type AuthCtx = {
  loading: boolean;
  user: AuthUser | null;
  profile: Profile | null;
  roles: AppRole[];
  isAdmin: boolean;
  isTechnician: boolean;
  isFarmer: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; needsVerification?: boolean }>;
  signInWithOtp: (identifier: string, otp: string) => Promise<{ error: string | null }>;
  sendOtp: (identifier: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role?: AppRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

/* ─── mock accounts ─── */
const MOCK_USERS: Record<
  string,
  { password: string; role: AppRole; profile: Profile }
> = {
  "farmer@acqualence.com": {
    password: "farmer123",
    role: "farmer",
    profile: {
      id: "mock-farmer",
      full_name: "Rahim Mia",
      phone: "+8801712345678",
      district: "Khulna",
      language: "bn",
      avatar_url: null,
      created_at: new Date().toISOString(),
    },
  },
  "technician@acqualence.com": {
    password: "tech123",
    role: "technician",
    profile: {
      id: "mock-tech",
      full_name: "Shahin Hossain",
      phone: "+8801812345678",
      district: "Dhaka",
      language: "en",
      avatar_url: null,
      created_at: new Date().toISOString(),
    },
  },
  "admin@acqualence.com": {
    password: "admin123",
    role: "admin",
    profile: {
      id: "mock-admin",
      full_name: "Anika Rahman",
      phone: "+8801912345678",
      district: "Dhaka",
      language: "en",
      avatar_url: null,
      created_at: new Date().toISOString(),
    },
  },
};

const STORAGE_KEY = "acqua_mock_session";

function getMockSession(): { user: AuthUser; profile: Profile; roles: AppRole[] } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setMockSession(data: { user: AuthUser; profile: Profile; roles: AppRole[] } | null) {
  if (typeof window === "undefined") return;
  if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  else localStorage.removeItem(STORAGE_KEY);
}

/* ─── validation helpers ─── */
export function isBangladeshPhone(value: string): boolean {
  const cleaned = value.replace(/[\s\-]/g, "");
  return /^\+8801[3-9]\d{8}$/.test(cleaned) || /^01[3-9]\d{8}$/.test(cleaned);
}

export function normalizeBangladeshPhone(value: string): string {
  const cleaned = value.replace(/[\s\-]/g, "");
  if (/^01[3-9]\d{8}$/.test(cleaned)) return "+880" + cleaned.slice(1);
  return cleaned;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidIdentifier(value: string): "email" | "phone" | null {
  const trimmed = value.trim();
  if (isValidEmail(trimmed)) return "email";
  if (isBangladeshPhone(trimmed)) return "phone";
  return null;
}

/* ─── provider ─── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);

  async function loadSession() {
    const session = getMockSession();
    if (!session) {
      setUser(null);
      setProfile(null);
      setRoles([]);
      setLoading(false);
      return;
    }
    setUser(session.user);
    setProfile(session.profile);
    setRoles(session.roles);
    setLoading(false);
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }
    loadSession();
  }, []);

  const signIn: AuthCtx["signIn"] = async (identifier, password) => {
    await new Promise((r) => setTimeout(r, 800));
    const key = identifier.trim().toLowerCase();
    const account = MOCK_USERS[key];
    if (!account || account.password !== password) {
      return { error: "Invalid email or password." };
    }
    const u: AuthUser = { id: account.profile.id, email: key, phone: account.profile.phone };
    const session = { user: u, profile: account.profile, roles: [account.role] };
    setMockSession(session);
    setUser(u);
    setProfile(account.profile);
    setRoles([account.role]);
    return { error: null };
  };

  const sendOtp: AuthCtx["sendOtp"] = async (identifier) => {
    await new Promise((r) => setTimeout(r, 600));
    const type = isValidIdentifier(identifier);
    if (!type) return { error: "Enter a valid email or Bangladesh phone number." };
    return { error: null };
  };

  const signInWithOtp: AuthCtx["signInWithOtp"] = async (identifier, otp) => {
    await new Promise((r) => setTimeout(r, 800));
    if (!/^\d{6}$/.test(otp)) return { error: "Enter the 6-digit code." };
    // Mock: any 6-digit code works for demo accounts, any code works for new users too
    const key = identifier.trim().toLowerCase();
    const account = MOCK_USERS[key];
    if (account) {
      const u: AuthUser = { id: account.profile.id, email: key, phone: account.profile.phone };
      const session = { user: u, profile: account.profile, roles: [account.role] };
      setMockSession(session);
      setUser(u);
      setProfile(account.profile);
      setRoles([account.role]);
      return { error: null };
    }
    // For unknown identifiers, create a farmer account
    const newProfile: Profile = {
      id: "mock-" + Math.random().toString(36).slice(2, 10),
      full_name: null,
      phone: type === "phone" ? normalizeBangladeshPhone(identifier) : null,
      district: null,
      language: "bn",
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    const u: AuthUser = { id: newProfile.id, email: type === "email" ? key : "", phone: newProfile.phone };
    const session = { user: u, profile: newProfile, roles: ["farmer" as AppRole] };
    setMockSession(session);
    setUser(u);
    setProfile(newProfile);
    setRoles(["farmer"]);
    return { error: null };
  };

  const signUp: AuthCtx["signUp"] = async (email, password, fullName, role = "farmer") => {
    await new Promise((r) => setTimeout(r, 800));
    if (password.length < 8) return { error: "Password must be at least 8 characters." };
    const key = email.trim().toLowerCase();
    if (MOCK_USERS[key]) return { error: "An account with this email already exists." };
    const newProfile: Profile = {
      id: "mock-" + Math.random().toString(36).slice(2, 10),
      full_name: fullName || null,
      phone: null,
      district: null,
      language: "bn",
      avatar_url: null,
      created_at: new Date().toISOString(),
    };
    const u: AuthUser = { id: newProfile.id, email: key };
    const session = { user: u, profile: newProfile, roles: [role] };
    setMockSession(session);
    setUser(u);
    setProfile(newProfile);
    setRoles([role]);
    return { error: null };
  };

  const signOut = async () => {
    setMockSession(null);
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
        isFarmer: roles.includes("farmer"),
        signIn,
        signInWithOtp,
        sendOtp,
        signUp,
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

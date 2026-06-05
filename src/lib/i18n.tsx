import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Lang = "en" | "bn";

const dict: Record<Lang, Record<string, string>> = {
  en: {
    "app.brand": "Acqua Lence",
    "nav.dashboard": "Dashboard",
    "nav.live": "Live View",
    "nav.farms": "Farms & Ponds",
    "nav.alerts": "Alerts",
    "nav.reports": "Reports",
    "nav.devices": "Devices",
    "nav.settings": "Settings",
    "nav.setup": "Setup Device",
    "nav.calibration": "Calibration",
    "nav.maintenance": "Maintenance",
    "nav.users": "Users",
    "nav.support": "Support",
    "nav.system": "System Settings",
    "auth.signin": "Sign in",
    "auth.signup": "Create account",
    "auth.signout": "Sign out",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.fullName": "Full name",
    "auth.noAccount": "No account yet?",
    "auth.haveAccount": "Already have an account?",
    "dashboard.title": "Farm overview",
    "dashboard.subtitle": "A calm view of your ponds, devices and risks.",
    "dashboard.totalPonds": "Total ponds",
    "dashboard.good": "Good",
    "dashboard.warning": "Warning",
    "dashboard.critical": "Critical",
    "dashboard.offline": "Offline devices",
    "dashboard.todaysAlerts": "Today's alerts",
    "dashboard.recommended": "Recommended action",
    "dashboard.deviceHealth": "Device health",
    "dashboard.empty.title": "Add your first pond and device to start monitoring",
    "dashboard.empty.cta1": "Add pond",
    "dashboard.empty.cta2": "Setup device",
    "status.good": "Good",
    "status.watch": "Watch",
    "status.warning": "Warning",
    "status.critical": "Critical",
    "status.offline": "Offline",
    "status.calibration_due": "Calibration due",
    "param.do": "Dissolved O₂",
    "param.ph": "pH",
    "param.temp": "Temperature",
    "param.turbidity": "Turbidity",
    "param.salinity": "Salinity",
    "param.ammonia": "Ammonia",
    "common.lastUpdated": "Last updated",
    "common.viewAll": "View all",
    "common.search": "Search",
  },
  bn: {
    "app.brand": "অ্যাকুয়া লেন্স",
    "nav.dashboard": "ড্যাশবোর্ড",
    "nav.live": "লাইভ ভিউ",
    "nav.farms": "খামার ও পুকুর",
    "nav.alerts": "সতর্কতা",
    "nav.reports": "রিপোর্ট",
    "nav.devices": "ডিভাইস",
    "nav.settings": "সেটিংস",
    "nav.setup": "ডিভাইস সেটআপ",
    "nav.calibration": "ক্যালিব্রেশন",
    "nav.maintenance": "রক্ষণাবেক্ষণ",
    "nav.users": "ব্যবহারকারী",
    "nav.support": "সাপোর্ট",
    "nav.system": "সিস্টেম সেটিংস",
    "auth.signin": "সাইন ইন",
    "auth.signup": "অ্যাকাউন্ট তৈরি করুন",
    "auth.signout": "সাইন আউট",
    "auth.email": "ইমেইল",
    "auth.password": "পাসওয়ার্ড",
    "auth.fullName": "পুরো নাম",
    "auth.noAccount": "অ্যাকাউন্ট নেই?",
    "auth.haveAccount": "ইতিমধ্যে অ্যাকাউন্ট আছে?",
    "dashboard.title": "খামার ওভারভিউ",
    "dashboard.subtitle": "আপনার পুকুর, ডিভাইস ও ঝুঁকির একটি শান্ত দৃশ্য।",
    "dashboard.totalPonds": "মোট পুকুর",
    "dashboard.good": "ভালো",
    "dashboard.warning": "সতর্কতা",
    "dashboard.critical": "জরুরি",
    "dashboard.offline": "অফলাইন ডিভাইস",
    "dashboard.todaysAlerts": "আজকের সতর্কতা",
    "dashboard.recommended": "প্রস্তাবিত পদক্ষেপ",
    "dashboard.deviceHealth": "ডিভাইসের স্বাস্থ্য",
    "dashboard.empty.title": "মনিটরিং শুরু করতে প্রথম পুকুর ও ডিভাইস যোগ করুন",
    "dashboard.empty.cta1": "পুকুর যোগ করুন",
    "dashboard.empty.cta2": "ডিভাইস সেটআপ",
    "status.good": "ভালো",
    "status.watch": "নজরে রাখুন",
    "status.warning": "সতর্কতা",
    "status.critical": "জরুরি",
    "status.offline": "অফলাইন",
    "status.calibration_due": "ক্যালিব্রেশন প্রয়োজন",
    "param.do": "দ্রবীভূত O₂",
    "param.ph": "পিএইচ",
    "param.temp": "তাপমাত্রা",
    "param.turbidity": "ঘোলাটে",
    "param.salinity": "লবণাক্ততা",
    "param.ammonia": "অ্যামোনিয়া",
    "common.lastUpdated": "শেষ আপডেট",
    "common.viewAll": "সব দেখুন",
    "common.search": "অনুসন্ধান",
  },
};

type I18nCtx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };
const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("acqua_lang") as Lang | null;
    if (saved === "en" || saved === "bn") setLangState(saved);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem("acqua_lang", l);
  }, []);

  const t = useCallback((key: string) => dict[lang][key] ?? dict.en[key] ?? key, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

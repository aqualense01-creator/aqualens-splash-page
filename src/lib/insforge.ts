import { createClient } from "@insforge/sdk";

export const insforge = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_URL,
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY,
});

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  tagline: string | null;
  price_cents: number;
  attachment_url: string | null;
  attachment_key: string | null;
  attachment_name: string | null;
  attachment_uploaded_at: string | null;
};

import { useEffect, useRef, useState } from "react";
import { insforge, type Product } from "@/lib/insforge";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";

const BUCKET = "product-attachments";

function isImage(name: string | null) {
  if (!name) return false;
  return /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(name);
}

export default function ProductAttachments() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    setLoading(true);
    const { data, error } = await insforge.database
      .from("products")
      .select(
        "id, sku, name, category, tagline, price_cents, attachment_url, attachment_key, attachment_name, attachment_uploaded_at"
      )
      .order("price_cents", { ascending: false });
    if (error) setError(error.message ?? "Failed to load products");
    else setProducts((data as Product[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleFile(product: Product, file: File) {
    if (file.size > 20 * 1024 * 1024) {
      setError("File must be 20MB or smaller.");
      return;
    }
    setError(null);
    setUploadingId(product.id);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `${product.id}/${Date.now()}-${safe}`;

      const { data: up, error: upErr } = await insforge.storage
        .from(BUCKET)
        .upload(key, file);
      if (upErr || !up) throw new Error(upErr?.message ?? "Upload failed");

      const { error: dbErr } = await insforge.database
        .from("products")
        .update({
          attachment_url: up.url,
          attachment_key: up.key,
          attachment_name: file.name,
          attachment_uploaded_at: new Date().toISOString(),
        })
        .eq("id", product.id);
      if (dbErr) throw new Error(dbErr.message);

      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? {
                ...p,
                attachment_url: up.url,
                attachment_key: up.key,
                attachment_name: file.name,
                attachment_uploaded_at: new Date().toISOString(),
              }
            : p
        )
      );
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <header className="mb-10 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">
          Product files
        </p>
        <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight">
          Attach datasheets & photos
        </h2>
        <p className="mt-3 text-muted-foreground">
          Upload a spec sheet, calibration certificate, or product image. Files
          are stored in InsForge Storage and linked to the product record.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading products…
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {products.map((p) => (
            <article
              key={p.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {p.category} · {p.sku}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">{p.name}</h3>
                  {p.tagline && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {p.tagline}
                    </p>
                  )}
                </div>
                <div className="text-right text-sm font-medium">
                  ${(p.price_cents / 100).toFixed(2)}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-4">
                {p.attachment_url ? (
                  <div className="space-y-3">
                    {isImage(p.attachment_name) ? (
                      <img
                        src={p.attachment_url}
                        alt={p.attachment_name ?? "attachment"}
                        className="w-full max-h-48 object-cover rounded-lg border border-border"
                      />
                    ) : (
                      <a
                        href={p.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        {p.attachment_name ?? "Open attachment"}
                      </a>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      Attached
                      {p.attachment_uploaded_at && (
                        <span>
                          ·{" "}
                          {new Date(
                            p.attachment_uploaded_at
                          ).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No file attached yet.
                  </p>
                )}

                <div className="mt-3">
                  <input
                    ref={(el) => (fileInputs.current[p.id] = el)}
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(p, f);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={uploadingId === p.id}
                    onClick={() => fileInputs.current[p.id]?.click()}
                  >
                    {uploadingId === p.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {p.attachment_url ? "Replace file" : "Upload file"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

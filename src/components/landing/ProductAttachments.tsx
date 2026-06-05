import { useEffect, useRef, useState, useCallback } from "react";
import { insforge, type Product } from "@/lib/insforge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Lock,
  ArrowRight,
  PlusCircle,
  Layers,
} from "lucide-react";

const BUCKET = "product-attachments";

function isImage(name: string | null) {
  if (!name) return false;
  return /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(name);
}

export default function ProductAttachments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("sensor");
  const [newTagline, setNewTagline] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await insforge.database
      .from("products")
      .select(
        "id, user_id, sku, name, category, tagline, price_cents, attachment_url, attachment_key, attachment_name, attachment_uploaded_at",
      )
      .eq("user_id", user.id)
      .order("price_cents", { ascending: false });

    if (error) setError(error.message ?? "Failed to load products");
    else setProducts((data as Product[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!newName.trim() || !newSku.trim()) {
      setError("Product Name and SKU are required.");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const priceCents = Math.round(parseFloat(newPrice || "0") * 100);
      const { error: insErr } = await insforge.database.from("products").insert([
        {
          sku: newSku.trim(),
          name: newName.trim(),
          category: newCategory,
          tagline: newTagline.trim() || null,
          description: newDescription.trim() || null,
          price_cents: priceCents,
          user_id: user.id,
        },
      ]);

      if (insErr) throw new Error(insErr.message);

      setNewSku("");
      setNewName("");
      setNewCategory("sensor");
      setNewTagline("");
      setNewPrice("");
      setNewDescription("");
      setShowAddForm(false);

      await load();
    } catch (e: any) {
      setError(e.message ?? "Failed to create product");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(productId: string) {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this product?")) return;
    setError(null);
    try {
      const { error: delErr } = await insforge.database
        .from("products")
        .delete()
        .eq("id", productId)
        .eq("user_id", user.id);
      if (delErr) throw new Error(delErr.message);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (e: any) {
      setError(e.message ?? "Failed to delete product");
    }
  }

  async function handleFile(product: Product, file: File) {
    if (!user) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("File must be 20MB or smaller.");
      return;
    }
    setError(null);
    setUploadingId(product.id);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `${product.id}/${Date.now()}-${safe}`;

      const { data: up, error: upErr } = await insforge.storage.from(BUCKET).upload(key, file);
      if (upErr || !up) throw new Error(upErr?.message ?? "Upload failed");

      const { error: dbErr } = await insforge.database
        .from("products")
        .update({
          attachment_url: up.url,
          attachment_key: up.key,
          attachment_name: file.name,
          attachment_uploaded_at: new Date().toISOString(),
        })
        .eq("id", product.id)
        .eq("user_id", user.id);
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
            : p,
        ),
      );
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <header className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">Product files</p>
          <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight">
            Attach datasheets & photos
          </h2>
          <p className="mt-3 text-muted-foreground">
            Upload a spec sheet, calibration certificate, or product image. Files are stored in
            InsForge Storage and linked to your product records.
          </p>
        </div>
        {user && (
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full md:w-auto h-11 flex items-center justify-center gap-2"
          >
            {showAddForm ? (
              "Cancel"
            ) : (
              <>
                <Plus className="h-4 w-4" /> Add Product
              </>
            )}
          </Button>
        )}
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Unauthenticated State */}
      {!user ? (
        <div className="rounded-3xl border border-border/60 bg-white/70 p-12 text-center shadow-soft backdrop-blur-sm max-w-xl mx-auto">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Authentication Required</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            You must be logged in to view your catalog and upload datasheets or product photos.
          </p>
          <Button
            onClick={() => navigate({ to: "/login" })}
            className="mt-6 h-11 px-6 font-semibold"
          >
            Sign In Now <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          {/* Create Product Form */}
          {showAddForm && (
            <div className="mb-8 rounded-3xl border border-border bg-card p-6 shadow-sm max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" /> Create New Product Record
              </h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      SKU / Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SENS-DO-04"
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Optical DO Probe"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Category *</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="buoy">Buoy</option>
                      <option value="sensor">Sensor</option>
                      <option value="power">Power</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Price (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Tagline</label>
                  <input
                    type="text"
                    placeholder="Short summary tagline"
                    value={newTagline}
                    onChange={(e) => setNewTagline(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <textarea
                    placeholder="Describe the product details..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Product"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Products List */}
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading products…
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center max-w-xl mx-auto mt-6">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No Products Created Yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Get started by creating your first product record. You can then attach spec sheets
                or images.
              </p>
              <Button onClick={() => setShowAddForm(true)} className="mt-4 h-10">
                <Plus className="mr-2 h-4 w-4" /> Create First Product
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {products.map((p) => (
                <article
                  key={p.id}
                  className="group relative rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        {p.category} · {p.sku}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">{p.name}</h3>
                      {p.tagline && (
                        <p className="text-sm text-muted-foreground mt-1">{p.tagline}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm font-medium">
                        ${(p.price_cents / 100).toFixed(2)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(p.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                        title="Delete product record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
                            <span>· {new Date(p.attachment_uploaded_at).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No file attached yet.</p>
                    )}

                    <div className="mt-3">
                      <input
                        ref={(el) => {
                          fileInputs.current[p.id] = el;
                        }}
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
        </>
      )}
    </section>
  );
}

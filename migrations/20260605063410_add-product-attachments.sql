-- Add attachment columns to products for InsForge Storage uploads
ALTER TABLE public.products
  ADD COLUMN attachment_url text,
  ADD COLUMN attachment_key text,
  ADD COLUMN attachment_name text,
  ADD COLUMN attachment_uploaded_at timestamptz;

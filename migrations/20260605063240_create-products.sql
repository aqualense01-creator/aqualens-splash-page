-- Products catalog for AcquaLence Shop section
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  tagline text,
  description text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  image_url text,
  in_stock boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_category_idx ON public.products (category);
CREATE INDEX products_featured_idx ON public.products (featured) WHERE featured = true;

-- RLS: public catalog is readable by anyone; writes are admin-only
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT
  USING (true);

-- Sample data
INSERT INTO public.products (sku, name, category, tagline, description, price_cents, image_url, featured, specs) VALUES
  ('BUOY-LX1', 'Lence X1 Smart Buoy', 'buoy', 'Solar-powered monitoring buoy', 'Flagship rugged buoy with multi-sensor payload, satellite uplink, and 5-year battery.', 489900, '/src/assets/buoy-product.png', true,
    '{"ip_rating":"IP67","depth_m":50,"uplink":"LTE-M + Iridium","battery_years":5}'::jsonb),
  ('SENS-PH-02', 'pH Sensor Module', 'sensor', 'Industrial pH probe', 'Glass-electrode pH sensor with auto-calibration and temperature compensation.', 34900, '/src/assets/sensor-ph.png', true,
    '{"range":"0-14 pH","accuracy":"±0.02","temp_comp":true}'::jsonb),
  ('SENS-DO-03', 'Dissolved Oxygen Probe', 'sensor', 'Optical DO sensor', 'Membrane-free optical DO probe with 2-year cap lifespan and zero drift.', 42900, '/src/assets/sensor-do.png', false,
    '{"range":"0-20 mg/L","accuracy":"±0.1","method":"optical"}'::jsonb),
  ('SENS-TURB-01', 'Turbidity Sensor', 'sensor', 'Self-cleaning turbidity', 'NTU turbidity sensor with mechanical wiper for fouling resistance.', 38900, '/src/assets/sensor-turbidity.png', false,
    '{"range":"0-4000 NTU","wiper":true}'::jsonb),
  ('SOLAR-KIT-1', 'Solar Power Kit', 'power', '40W marine-grade solar', 'Marine solar panel + MPPT controller + LiFePO4 battery pack.', 79900, '/src/assets/solar-kit.png', true,
    '{"panel_w":40,"battery_wh":300,"chemistry":"LiFePO4"}'::jsonb);

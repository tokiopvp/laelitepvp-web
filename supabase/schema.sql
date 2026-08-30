-- ============================================
-- La Elite PvP - Supabase Schema
-- Run this in Supabase Dashboard > SQL Editor > New Query > Run
-- ============================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner','admin','moderator','editor','member')),
  bio TEXT,
  discord_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEMBERS (clan official)
-- ============================================
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  nickname TEXT NOT NULL,
  free_fire_id TEXT,
  role_in_clan TEXT CHECK (role_in_clan IN ('leader','interim_leader','elder','member')),
  rank TEXT,
  level INT DEFAULT 1,
  kd_ratio DECIMAL(4,2) DEFAULT 0,
  headshots INT DEFAULT 0,
  wins INT DEFAULT 0,
  booyahs INT DEFAULT 0,
  avatar_url TEXT,
  outfit_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TOPS (dynamic rankings)
-- ============================================
CREATE TABLE tops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('kd','headshots','wins','booyahs','level','rank')),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  value DECIMAL(10,2) NOT NULL,
  rank_position INT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TOURNAMENTS
-- ============================================
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  game_mode TEXT CHECK (game_mode IN ('Solo','Duo','Squad','Clash Squad')),
  prize TEXT,
  placement INT,
  date_played DATE,
  screenshot_url TEXT,
  replay_url TEXT,
  participants_count INT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TOURNAMENT PARTICIPANTS
-- ============================================
CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  placement INT,
  kills INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUCTS (PagoStore)
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('diamonds','membership','bundle','pass')),
  diamonds_amount INT,
  price_usd DECIMAL(10,2) NOT NULL,
  discount_percent INT DEFAULT 0,
  stock INT DEFAULT -1,
  image_url TEXT,
  description TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDERS (PagoStore)
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_discord TEXT,
  free_fire_id TEXT,
  product_id UUID REFERENCES products(id),
  quantity INT DEFAULT 1,
  total_usd DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','processing','delivered','cancelled')),
  payment_method TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- APPLICATIONS (Unirse)
-- ============================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  free_fire_id TEXT NOT NULL,
  rank TEXT,
  age INT,
  experience TEXT,
  discord TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NEWS
-- ============================================
CREATE TABLE news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT,
  cover_image_url TEXT,
  author_id UUID REFERENCES profiles(id),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACTIVITY LOGS
-- ============================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tops ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ policies
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "members_public_read" ON members FOR SELECT USING (true);
CREATE POLICY "tops_public_read" ON tops FOR SELECT USING (true);
CREATE POLICY "tournaments_public_read" ON tournaments FOR SELECT USING (true);
CREATE POLICY "tournament_participants_public_read" ON tournament_participants FOR SELECT USING (true);
CREATE POLICY "products_public_read" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "news_public_read" ON news FOR SELECT USING (is_published = true);
CREATE POLICY "orders_public_read" ON orders FOR SELECT USING (
  auth.uid() = created_by OR
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator','editor'))
);

-- WRITE policies (authenticated roles)
CREATE POLICY "members_write_roles" ON members
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator')));
CREATE POLICY "tops_write_roles" ON tops
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator')));
CREATE POLICY "members_write_roles2" ON tournaments
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator')));
CREATE POLICY "products_write_roles" ON products
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','editor')));
CREATE POLICY "orders_write_roles" ON orders
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator','editor')));
CREATE POLICY "applications_insert_public" ON applications FOR INSERT WITH CHECK (true);
CREATE POLICY "applications_read_roles" ON applications
  FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','moderator')));
CREATE POLICY "news_write_roles" ON news
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('owner','admin','editor')));

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE members, tops, tournaments, orders, products;

-- ============================================
-- TRIGGER: auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

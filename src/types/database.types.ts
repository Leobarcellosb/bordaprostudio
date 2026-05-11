// Database schema types for Borda Pro Supabase instance.
// Keep in sync with migrations; regenerate via `supabase gen types typescript` when schema changes.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "admin" | "user" | "moderator";
export type SubscriptionStatus = "active" | "pending" | "inactive" | "canceled" | "refunded";
export type PlanCode = "mensal" | "anual" | "basic";

export type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  last_name: string | null;
  phone: string | null;
  brand_name: string | null;
  avatar_url: string | null;
  plan: PlanCode | null;
  machine_format: string | null;
  machine_hoop_size: string | null;
  created_at: string;
  updated_at: string;
};

export type UserRole = {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  email: string | null;
  provider: string;
  provider_buyer_id: string | null;
  provider_invoice_id: string | null;
  provider_offer_id: string | null;
  plan_code: PlanCode;
  status: SubscriptionStatus;
  access_expires_at: string | null;
  last_event: string | null;
  raw_payload: Json | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
};

export type Design = {
  id: string;
  name: string;
  generated_title: string | null;
  raw_filename: string | null;
  cover_image: string | null;
  description: string | null;
  category_id: string | null;
  hoop_size: string | null;
  width_mm: number | null;
  height_mm: number | null;
  stitch_count: number | null;
  colors_count: number | null;
  tags_text: string | null;
  is_published: boolean;
  featured_for_daily_inspiration: boolean;
  created_at: string;
  updated_at: string;
};

export type KitArquivo = {
  id: string;
  design_id: string;
  file_name: string;
  file_url: string;
  format: string;
  size_bytes: number | null;
  created_at: string;
};

export type Kit = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  cover_image: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type Favorite = {
  id: string;
  user_id: string;
  design_id: string;
  created_at: string;
};

export type Download = {
  id: string;
  user_id: string;
  design_id: string;
  format: string | null;
  created_at: string;
};

export type MatrixRequestVote = {
  id: string;
  request_id: string;
  user_id: string;
  created_at: string;
};

export type KitDesign = {
  id: string;
  kit_id: string;
  design_id: string;
  order_index: number;
  created_at: string;
};

export type IntegrationLog = {
  id: string;
  integration: string;
  event_type: string;
  email: string | null;
  user_id: string | null;
  status: "success" | "error" | "pending";
  message: string | null;
  payload: Json | null;
  created_at: string;
};

export type CommunityPost = {
  id: string;
  user_id: string;
  image_url: string;
  comment: string | null;
  design_name: string | null;
  created_at: string;
};

export type MatrixRequest = {
  id: string;
  user_id: string;
  theme: string;
  category: string | null;
  comment: string | null;
  votes_count: number;
  created_at: string;
};

export type UserPreferences = {
  id: string;
  user_id: string;
  usage_goal: string | null;
  favorite_categories: string[] | null;
  hoop_size: string | null;
  experience_level: string | null;
  selling_activity: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Catalog = {
  id: string;
  user_id: string;
  name: string;
  subtitle: string | null;
  layout_type: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogItem = {
  id: string;
  catalog_id: string;
  design_id: string;
  order_index: number;
  created_at: string;
};

export type PremiumKit = {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  zip_url: string | null;
  purchase_url: string | null;
  designs_count: number;
  price: number | null;
  access_rule: "included_in_annual" | "purchase_only" | "both";
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

type Tbl<R> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Tbl<Profile>;
      user_roles: Tbl<UserRole>;
      subscriptions: Tbl<Subscription>;
      categories: Tbl<Category>;
      designs: Tbl<Design>;
      kit_arquivos: Tbl<KitArquivo>;
      kits: Tbl<Kit>;
      favorites: Tbl<Favorite>;
      downloads: Tbl<Download>;
      community_posts: Tbl<CommunityPost>;
      matrix_requests: Tbl<MatrixRequest>;
      matrix_request_votes: Tbl<MatrixRequestVote>;
      kit_designs: Tbl<KitDesign>;
      integration_logs: Tbl<IntegrationLog>;
      user_preferences: Tbl<UserPreferences>;
      catalogs: Tbl<Catalog>;
      catalog_items: Tbl<CatalogItem>;
      premium_kits: Tbl<PremiumKit>;
    };
    Views: Record<string, never>;
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: AppRole };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: AppRole;
    };
  };
};

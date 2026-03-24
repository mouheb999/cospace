export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          role: 'client' | 'admin'
          avatar_url: string | null
          referral_code: string
          referred_by: string | null
          freeze_tokens: number
          current_streak: number
          longest_streak: number
          last_checkin: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          role?: 'client' | 'admin'
          avatar_url?: string | null
          referral_code: string
          referred_by?: string | null
          freeze_tokens?: number
          current_streak?: number
          longest_streak?: number
          last_checkin?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          role?: 'client' | 'admin'
          avatar_url?: string | null
          referral_code?: string
          referred_by?: string | null
          freeze_tokens?: number
          current_streak?: number
          longest_streak?: number
          last_checkin?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      memberships: {
        Row: {
          id: string
          user_id: string
          plan_type: 'daily' | 'weekly' | 'monthly' | 'quarterly'
          price_paid: number
          start_date: string
          end_date: string
          status: 'active' | 'expired' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_type: 'daily' | 'weekly' | 'monthly' | 'quarterly'
          price_paid: number
          start_date: string
          end_date: string
          status?: 'active' | 'expired' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_type?: 'daily' | 'weekly' | 'monthly' | 'quarterly'
          price_paid?: number
          start_date?: string
          end_date?: string
          status?: 'active' | 'expired' | 'cancelled'
          created_at?: string
        }
      }
      checkins: {
        Row: {
          id: string
          user_id: string
          photo_url: string
          streak_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          photo_url: string
          streak_count: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          photo_url?: string
          streak_count?: number
          created_at?: string
        }
      }
      pricing: {
        Row: {
          id: string
          plan_type: 'daily' | 'weekly' | 'monthly' | 'quarterly'
          name: string
          description: string
          price: number
          duration_days: number
          features: string[]
          is_featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_type: 'daily' | 'weekly' | 'monthly' | 'quarterly'
          name: string
          description: string
          price: number
          duration_days: number
          features?: string[]
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_type?: 'daily' | 'weekly' | 'monthly' | 'quarterly'
          name?: string
          description?: string
          price?: number
          duration_days?: number
          features?: string[]
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      announcements: {
        Row: {
          id: string
          title: string
          content: string
          is_pinned: boolean
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          is_pinned?: boolean
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          is_pinned?: boolean
          created_by?: string
          created_at?: string
        }
      }
      income_logs: {
        Row: {
          id: string
          user_id: string
          membership_id: string
          amount: number
          plan_type: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          membership_id: string
          amount: number
          plan_type: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          membership_id?: string
          amount?: number
          plan_type?: string
          created_at?: string
        }
      }
      price_audit: {
        Row: {
          id: string
          pricing_id: string
          plan_type: string
          old_price: number
          new_price: number
          changed_by: string
          created_at: string
        }
        Insert: {
          id?: string
          pricing_id: string
          plan_type: string
          old_price: number
          new_price: number
          changed_by: string
          created_at?: string
        }
        Update: {
          id?: string
          pricing_id?: string
          plan_type?: string
          old_price?: number
          new_price?: number
          changed_by?: string
          created_at?: string
        }
      }
      leaderboard_settings: {
        Row: {
          id: string
          reward_text: string
          updated_by: string
          updated_at: string
        }
        Insert: {
          id?: string
          reward_text: string
          updated_by: string
          updated_at?: string
        }
        Update: {
          id?: string
          reward_text?: string
          updated_by?: string
          updated_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_streak: {
        Args: { user_id: string }
        Returns: number
      }
      get_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          user_id: string
          first_name: string
          last_name: string
          streak: number
          checked_in_today: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Membership = Database['public']['Tables']['memberships']['Row']
export type Checkin = Database['public']['Tables']['checkins']['Row']
export type Pricing = Database['public']['Tables']['pricing']['Row']
export type Announcement = Database['public']['Tables']['announcements']['Row']
export type IncomeLog = Database['public']['Tables']['income_logs']['Row']
export type PriceAudit = Database['public']['Tables']['price_audit']['Row']

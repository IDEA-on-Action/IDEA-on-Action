export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_locks: {
        Row: {
          id: string
          is_locked: boolean
          lock_reason: string
          locked_at: string
          locked_by: string | null
          unlock_at: string | null
          unlock_reason: string | null
          unlock_token: string | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_locked?: boolean
          lock_reason: string
          locked_at?: string
          locked_by?: string | null
          unlock_at?: string | null
          unlock_reason?: string | null
          unlock_token?: string | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_locked?: boolean
          lock_reason?: string
          locked_at?: string
          locked_by?: string | null
          unlock_at?: string | null
          unlock_reason?: string | null
          unlock_token?: string | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string | null
          id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_name: string
          event_params: Json | null
          id: string
          ip_address: unknown
          page_url: string | null
          referrer: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_name: string
          event_params?: Json | null
          id?: string
          ip_address?: unknown
          page_url?: string | null
          referrer?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_name?: string
          event_params?: Json | null
          id?: string
          ip_address?: unknown
          page_url?: string | null
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          resource: string
          resource_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource: string
          resource_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource?: string
          resource_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      billing_keys: {
        Row: {
          billing_key: string
          card_number: string | null
          card_type: string | null
          created_at: string | null
          customer_key: string
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_key: string
          card_number?: string | null
          card_type?: string | null
          created_at?: string | null
          customer_key: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_key?: string
          card_number?: string | null
          card_type?: string | null
          created_at?: string | null
          customer_key?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          post_count: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          post_count?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          post_count?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string
          category_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured: boolean | null
          featured_image: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          read_time: number | null
          slug: string
          status: string
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          category_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured?: boolean | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          read_time?: number | null
          slug: string
          status?: string
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          category_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured?: boolean | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          read_time?: number | null
          slug?: string
          status?: string
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_fk"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "post_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_blog_posts_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      bounties: {
        Row: {
          applicants: string[] | null
          assignee_id: string | null
          created_at: string | null
          deadline: string | null
          deliverables: string[] | null
          description: string
          difficulty: string
          estimated_hours: number | null
          id: number
          metadata: Json | null
          project_id: string | null
          reward: number
          skills_required: string[] | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          applicants?: string[] | null
          assignee_id?: string | null
          created_at?: string | null
          deadline?: string | null
          deliverables?: string[] | null
          description: string
          difficulty: string
          estimated_hours?: number | null
          id?: number
          metadata?: Json | null
          project_id?: string | null
          reward: number
          skills_required?: string[] | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          applicants?: string[] | null
          assignee_id?: string | null
          created_at?: string | null
          deadline?: string | null
          deliverables?: string[] | null
          description?: string
          difficulty?: string
          estimated_hours?: number | null
          id?: number
          metadata?: Json | null
          project_id?: string | null
          reward?: number
          skills_required?: string[] | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bounties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string | null
          id: string
          package_name: string | null
          price: number
          quantity: number
          service_id: string
          updated_at: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string | null
          id?: string
          package_name?: string | null
          price: number
          quantity?: number
          service_id: string
          updated_at?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string | null
          id?: string
          package_name?: string | null
          price?: number
          quantity?: number
          service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      connected_accounts: {
        Row: {
          connected_at: string | null
          id: string
          is_primary: boolean | null
          last_used_at: string | null
          provider: string
          provider_account_email: string | null
          provider_account_id: string
          user_id: string
        }
        Insert: {
          connected_at?: string | null
          id?: string
          is_primary?: boolean | null
          last_used_at?: string | null
          provider: string
          provider_account_email?: string | null
          provider_account_id: string
          user_id: string
        }
        Update: {
          connected_at?: string | null
          id?: string
          is_primary?: boolean | null
          last_used_at?: string | null
          provider?: string
          provider_account_email?: string | null
          provider_account_id?: string
          user_id?: string
        }
        Relationships: []
      }
      email_verifications: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      lab_items: {
        Row: {
          category: string
          content: string | null
          contributors: string[] | null
          created_at: string | null
          created_by: string | null
          demo_url: string | null
          description: string
          github_url: string | null
          id: string
          published: boolean | null
          slug: string
          start_date: string | null
          status: string
          subtitle: string | null
          tags: string[] | null
          tech_stack: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          content?: string | null
          contributors?: string[] | null
          created_at?: string | null
          created_by?: string | null
          demo_url?: string | null
          description: string
          github_url?: string | null
          id?: string
          published?: boolean | null
          slug: string
          start_date?: string | null
          status: string
          subtitle?: string | null
          tags?: string[] | null
          tech_stack?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: string | null
          contributors?: string[] | null
          created_at?: string | null
          created_by?: string | null
          demo_url?: string | null
          description?: string
          github_url?: string | null
          id?: string
          published?: boolean | null
          slug?: string
          start_date?: string | null
          status?: string
          subtitle?: string | null
          tags?: string[] | null
          tech_stack?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["user_id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: unknown
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      logs: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: number
          metadata: Json | null
          project_id: string | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: number
          metadata?: Json | null
          project_id?: string | null
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: number
          metadata?: Json | null
          project_id?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscriptions: {
        Row: {
          confirmed_at: string | null
          email: string
          id: string
          metadata: Json | null
          preferences: Json | null
          status: string
          subscribed_at: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          confirmed_at?: string | null
          email: string
          id?: string
          metadata?: Json | null
          preferences?: Json | null
          status?: string
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          confirmed_at?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          preferences?: Json | null
          status?: string
          subscribed_at?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      notices: {
        Row: {
          author_id: string
          content: string
          created_at: string
          expires_at: string | null
          id: string
          is_pinned: boolean
          published_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          published_at?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          published_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          package_name: string | null
          quantity: number
          service_description: string | null
          service_id: string | null
          service_snapshot: Json | null
          service_title: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          package_name?: string | null
          quantity?: number
          service_description?: string | null
          service_id?: string | null
          service_snapshot?: Json | null
          service_title: string
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          package_name?: string | null
          quantity?: number
          service_description?: string | null
          service_id?: string | null
          service_snapshot?: Json | null
          service_title?: string
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          confirmed_at: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          delivered_at: string | null
          discount_amount: number | null
          id: string
          order_number: string
          payment_id: string | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_fee: number | null
          shipping_name: string | null
          shipping_note: string | null
          shipping_phone: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          id?: string
          order_number: string
          payment_id?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_fee?: number | null
          shipping_name?: string | null
          shipping_note?: string | null
          shipping_phone?: string | null
          status?: string
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          id?: string
          order_number?: string
          payment_id?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_fee?: number | null
          shipping_name?: string | null
          shipping_note?: string | null
          shipping_phone?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          card_info: Json | null
          created_at: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          paid_at: string | null
          payment_method: string | null
          provider: string | null
          provider_transaction_id: string | null
          refunded_at: string | null
          status: string
        }
        Insert: {
          amount: number
          card_info?: Json | null
          created_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          provider?: string | null
          provider_transaction_id?: string | null
          refunded_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          card_info?: Json | null
          created_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          provider?: string | null
          provider_transaction_id?: string | null
          refunded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          resource?: string
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          challenges: string | null
          client_logo: string | null
          client_name: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration: string | null
          end_date: string | null
          featured: boolean | null
          github_url: string | null
          id: string
          images: string[] | null
          outcomes: string | null
          project_type: string
          project_url: string | null
          published: boolean | null
          slug: string
          solutions: string | null
          start_date: string | null
          summary: string
          team_size: number | null
          tech_stack: string[] | null
          testimonial: Json | null
          thumbnail: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          challenges?: string | null
          client_logo?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration?: string | null
          end_date?: string | null
          featured?: boolean | null
          github_url?: string | null
          id?: string
          images?: string[] | null
          outcomes?: string | null
          project_type: string
          project_url?: string | null
          published?: boolean | null
          slug: string
          solutions?: string | null
          start_date?: string | null
          summary: string
          team_size?: number | null
          tech_stack?: string[] | null
          testimonial?: Json | null
          thumbnail?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          challenges?: string | null
          client_logo?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration?: string | null
          end_date?: string | null
          featured?: boolean | null
          github_url?: string | null
          id?: string
          images?: string[] | null
          outcomes?: string | null
          project_type?: string
          project_url?: string | null
          published?: boolean | null
          slug?: string
          solutions?: string | null
          start_date?: string | null
          summary?: string
          team_size?: number | null
          tech_stack?: string[] | null
          testimonial?: Json | null
          thumbnail?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["user_id"]
          },
        ]
      }
      post_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_tag_relations: {
        Row: {
          created_at: string
          post_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tag_relations_post_fk"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tag_relations_tag_fk"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "post_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          image: string | null
          links: Json | null
          metrics: Json | null
          slug: string
          status: string
          summary: string
          tags: string[] | null
          tech: Json | null
          timeline: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id: string
          image?: string | null
          links?: Json | null
          metrics?: Json | null
          slug: string
          status: string
          summary: string
          tags?: string[] | null
          tech?: Json | null
          timeline?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          links?: Json | null
          metrics?: Json | null
          slug?: string
          status?: string
          summary?: string
          tags?: string[] | null
          tech?: Json | null
          timeline?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          admin_notes: string | null
          budget: string | null
          company: string | null
          created_at: string | null
          email: string
          id: number
          message: string
          name: string
          package: string
          phone: string | null
          preferred_contact: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          budget?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          id?: number
          message: string
          name: string
          package: string
          phone?: string | null
          preferred_contact?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          budget?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          id?: number
          message?: string
          name?: string
          package?: string
          phone?: string | null
          preferred_contact?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      roadmap: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: number
          kpis: Json | null
          milestones: Json | null
          owner: string | null
          progress: number | null
          quarter: string
          related_projects: string[] | null
          risk_level: string | null
          start_date: string | null
          theme: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: number
          kpis?: Json | null
          milestones?: Json | null
          owner?: string | null
          progress?: number | null
          quarter: string
          related_projects?: string[] | null
          risk_level?: string | null
          start_date?: string | null
          theme: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: number
          kpis?: Json | null
          milestones?: Json | null
          owner?: string | null
          progress?: number | null
          quarter?: string
          related_projects?: string[] | null
          risk_level?: string | null
          start_date?: string | null
          theme?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      roadmap_items: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          priority: number | null
          progress: number | null
          published: boolean | null
          start_date: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          priority?: number | null
          progress?: number | null
          published?: boolean | null
          start_date?: string | null
          status: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          priority?: number | null
          progress?: number | null
          published?: boolean | null
          start_date?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["user_id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_packages: {
        Row: {
          created_at: string
          display_order: number
          features: Json | null
          id: string
          is_popular: boolean
          name: string
          price: number
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          features?: Json | null
          id?: string
          is_popular?: boolean
          name: string
          price?: number
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          features?: Json | null
          id?: string
          is_popular?: boolean
          name?: string
          price?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string | null
          created_at: string
          deliverables: Json | null
          description: string | null
          faq: Json | null
          features: Json | null
          id: string
          image_url: string | null
          images: Json | null
          metrics: Json | null
          price: number
          pricing_data: Json | null
          process_steps: Json | null
          slug: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          deliverables?: Json | null
          description?: string | null
          faq?: Json | null
          features?: Json | null
          id?: string
          image_url?: string | null
          images?: Json | null
          metrics?: Json | null
          price?: number
          pricing_data?: Json | null
          process_steps?: Json | null
          slug?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          deliverables?: Json | null
          description?: string | null
          faq?: Json | null
          features?: Json | null
          id?: string
          image_url?: string | null
          images?: Json | null
          metrics?: Json | null
          price?: number
          pricing_data?: Json | null
          process_steps?: Json | null
          slug?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string | null
          error_code: string | null
          error_message: string | null
          id: string
          order_id: string | null
          paid_at: string | null
          payment_key: string | null
          status: string
          subscription_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          order_id?: string | null
          paid_at?: string | null
          payment_key?: string | null
          status?: string
          subscription_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          order_id?: string | null
          paid_at?: string | null
          payment_key?: string | null
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_cycle: string
          created_at: string
          display_order: number
          features: Json | null
          id: string
          is_popular: boolean
          plan_name: string
          price: number
          service_id: string
          updated_at: string
        }
        Insert: {
          billing_cycle: string
          created_at?: string
          display_order?: number
          features?: Json | null
          id?: string
          is_popular?: boolean
          plan_name: string
          price?: number
          service_id: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          display_order?: number
          features?: Json | null
          id?: string
          is_popular?: boolean
          plan_name?: string
          price?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_key_id: string | null
          cancel_at_period_end: boolean | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          next_billing_date: string | null
          plan_id: string
          service_id: string
          status: string
          trial_end_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_key_id?: string | null
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start?: string
          id?: string
          next_billing_date?: string | null
          plan_id: string
          service_id: string
          status?: string
          trial_end_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_key_id?: string | null
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          next_billing_date?: string | null
          plan_id?: string
          service_id?: string
          status?: string
          trial_end_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_billing_key_id_fkey"
            columns: ["billing_key_id"]
            isOneToOne: false
            referencedRelation: "billing_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          active: boolean | null
          avatar: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          priority: number | null
          role: string
          skills: string[] | null
          social_links: Json | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          avatar?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          priority?: number | null
          role: string
          skills?: string[] | null
          social_links?: Json | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          avatar?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          priority?: number | null
          role?: string
          skills?: string[] | null
          social_links?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      two_factor_auth: {
        Row: {
          backup_codes: string[] | null
          backup_codes_used: number | null
          created_at: string | null
          enabled: boolean | null
          id: string
          last_used_at: string | null
          secret: string
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          backup_codes?: string[] | null
          backup_codes_used?: number | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_used_at?: string | null
          secret: string
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          backup_codes?: string[] | null
          backup_codes_used?: number | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_used_at?: string | null
          secret?: string
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          email_verified: boolean | null
          id: string
          last_login_at: string | null
          last_login_ip: unknown
          location: Json | null
          phone: string | null
          phone_verified: boolean | null
          preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email_verified?: boolean | null
          id?: string
          last_login_at?: string | null
          last_login_ip?: unknown
          location?: Json | null
          phone?: string | null
          phone_verified?: boolean | null
          preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email_verified?: boolean | null
          id?: string
          last_login_at?: string | null
          last_login_ip?: unknown
          location?: Json | null
          phone?: string | null
          phone_verified?: boolean | null
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_with_us_inquiries: {
        Row: {
          admin_notes: string | null
          brief: string
          budget: string | null
          company: string | null
          created_at: string | null
          email: string
          id: number
          name: string
          package: string
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          brief: string
          budget?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          id?: number
          name: string
          package: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          brief?: string
          budget?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          id?: number
          name?: string
          package?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_to_bounty: { Args: { bounty_id: number }; Returns: boolean }
      calculate_bounce_rate: {
        Args: { end_date: string; start_date: string }
        Returns: {
          bounced_sessions: number
          total_sessions: number
        }[]
      }
      calculate_funnel: {
        Args: { end_date: string; start_date: string }
        Returns: {
          add_to_cart_count: number
          checkout_count: number
          purchase_count: number
          signup_count: number
          view_service_count: number
        }[]
      }
      can_admin_delete: { Args: { user_uuid: string }; Returns: boolean }
      expire_subscriptions: { Args: never; Returns: number }
      generate_email_verification_token: {
        Args: { p_email: string; p_user_id: string }
        Returns: string
      }
      generate_order_number: { Args: never; Returns: string }
      generate_password_reset_token: {
        Args: { p_email: string }
        Returns: string
      }
      get_event_counts: {
        Args: { end_date: string; start_date: string }
        Returns: {
          event_count: number
          event_name: string
          unique_sessions: number
          unique_users: number
        }[]
      }
      get_kpis: {
        Args: { end_date: string; start_date: string }
        Returns: {
          average_order_value: number
          conversion_rate: number
          new_customers: number
          order_count: number
          returning_customers: number
          total_revenue: number
        }[]
      }
      get_recent_failed_attempts: {
        Args: { p_email: string; p_ip_address: unknown; p_minutes?: number }
        Returns: number
      }
      get_revenue_by_date: {
        Args: { end_date: string; group_by?: string; start_date: string }
        Returns: {
          count: number
          date: string
          total: number
        }[]
      }
      get_revenue_by_service: {
        Args: { end_date: string; start_date: string }
        Returns: {
          order_count: number
          service_id: string
          service_name: string
          total_revenue: number
        }[]
      }
      get_session_timeline: {
        Args: { p_session_id: string }
        Returns: {
          created_at: string
          event_name: string
          event_params: Json
          id: string
          page_url: string
        }[]
      }
      get_user_permissions: {
        Args: { p_user_id: string }
        Returns: {
          action: string
          permission_name: string
          resource: string
        }[]
      }
      get_weekly_logs: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          log_count: number
          log_type: string
          logs: Json
        }[]
      }
      get_weekly_project_activity: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          decision_count: number
          learning_count: number
          log_count: number
          project_id: string
          project_title: string
          release_count: number
        }[]
      }
      get_weekly_stats: {
        Args: { end_date?: string; start_date?: string }
        Returns: Json
      }
      has_active_subscription: {
        Args: { p_service_id?: string; p_user_id: string }
        Returns: boolean
      }
      is_account_locked: { Args: { p_user_id: string }; Returns: boolean }
      is_admin_user: { Args: { user_uuid: string }; Returns: boolean }
      is_blog_post_published: {
        Args: { post_status: string }
        Returns: boolean
      }
      is_super_admin: { Args: { user_uuid: string }; Returns: boolean }
      lock_account_on_failed_attempts: {
        Args: { p_email: string }
        Returns: undefined
      }
      log_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_resource: string
          p_resource_id?: string
          p_user_id: string
        }
        Returns: string
      }
      subscribe_to_newsletter: { Args: { p_email?: string }; Returns: boolean }
      trigger_weekly_recap: { Args: never; Returns: Json }
      unsubscribe_from_newsletter: { Args: never; Returns: boolean }
      user_has_permission: {
        Args: { p_permission_name: string; p_user_id: string }
        Returns: boolean
      }
      verify_email_token: { Args: { p_token: string }; Returns: Json }
      verify_password_reset_token: { Args: { p_token: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const


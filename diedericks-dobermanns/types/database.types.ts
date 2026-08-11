export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          dog_id: string
          id: string
          judge: string | null
          location: string | null
          notes: string | null
          score: string | null
          title: string
          trial_date: string | null
        }
        Insert: {
          created_at?: string
          dog_id: string
          id?: string
          judge?: string | null
          location?: string | null
          notes?: string | null
          score?: string | null
          title: string
          trial_date?: string | null
        }
        Update: {
          created_at?: string
          dog_id?: string
          id?: string
          judge?: string | null
          location?: string | null
          notes?: string | null
          score?: string | null
          title?: string
          trial_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      application_events: {
        Row: {
          application_id: string
          created_at: string
          created_by: string | null
          event_type: string
          from_status: string | null
          id: string
          message: string | null
          to_status: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by?: string | null
          event_type: string
          from_status?: string | null
          id?: string
          message?: string | null
          to_status?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string | null
          event_type?: string
          from_status?: string | null
          id?: string
          message?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          address: string | null
          admin_notes: string | null
          agreed_microchip_policy: boolean | null
          agreed_no_breeding_rights: boolean | null
          agreed_no_resale: boolean | null
          agreed_right_of_recall: boolean | null
          agreed_to_terms: boolean
          agreed_welfare_commitment: boolean | null
          aware_of_commitment: string | null
          aware_of_costs: string | null
          aware_of_dcm: string | null
          budget_range: string | null
          children_ages: string | null
          city: string | null
          country: string
          created_at: string
          current_pets: string | null
          date_of_birth: string | null
          delivery_acknowledged: boolean | null
          dobermann_experience_level: string | null
          dog_interest: string | null
          email: string
          employer: string | null
          exercise_level: string | null
          experience_with_dobermanns: string | null
          facebook_profile: string | null
          full_name: string
          has_secure_yard: string | null
          home_type: string | null
          hours_alone_per_day: string | null
          id: string
          id_number: string | null
          instagram_handle: string | null
          last_reminder_sent_at: string | null
          litter_interest_id: string | null
          occupation: string | null
          personal_reference_name: string | null
          personal_reference_phone: string | null
          phone: string
          preferred_colour: string | null
          preferred_sex: string | null
          preferred_timeline: string | null
          previous_dog_fate: string | null
          province: string | null
          purpose: string | null
          reference_code: string | null
          reminder_count: number
          reviewed_at: string | null
          reviewed_by: string | null
          security_requirements: string | null
          sleeping_arrangement: string | null
          special_requests: string | null
          specific_dog_id: string | null
          status: string
          tail_preference: string | null
          training_planned: boolean | null
          updated_at: string
          user_id: string | null
          vet_name: string | null
          vet_phone: string | null
          why_dobermann: string | null
          yard_size: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          agreed_microchip_policy?: boolean | null
          agreed_no_breeding_rights?: boolean | null
          agreed_no_resale?: boolean | null
          agreed_right_of_recall?: boolean | null
          agreed_to_terms?: boolean
          agreed_welfare_commitment?: boolean | null
          aware_of_commitment?: string | null
          aware_of_costs?: string | null
          aware_of_dcm?: string | null
          budget_range?: string | null
          children_ages?: string | null
          city?: string | null
          country: string
          created_at?: string
          current_pets?: string | null
          date_of_birth?: string | null
          delivery_acknowledged?: boolean | null
          dobermann_experience_level?: string | null
          dog_interest?: string | null
          email: string
          employer?: string | null
          exercise_level?: string | null
          experience_with_dobermanns?: string | null
          facebook_profile?: string | null
          full_name: string
          has_secure_yard?: string | null
          home_type?: string | null
          hours_alone_per_day?: string | null
          id?: string
          id_number?: string | null
          instagram_handle?: string | null
          last_reminder_sent_at?: string | null
          litter_interest_id?: string | null
          occupation?: string | null
          personal_reference_name?: string | null
          personal_reference_phone?: string | null
          phone: string
          preferred_colour?: string | null
          preferred_sex?: string | null
          preferred_timeline?: string | null
          previous_dog_fate?: string | null
          province?: string | null
          purpose?: string | null
          reference_code?: string | null
          reminder_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          security_requirements?: string | null
          sleeping_arrangement?: string | null
          special_requests?: string | null
          specific_dog_id?: string | null
          status?: string
          tail_preference?: string | null
          training_planned?: boolean | null
          updated_at?: string
          user_id?: string | null
          vet_name?: string | null
          vet_phone?: string | null
          why_dobermann?: string | null
          yard_size?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          agreed_microchip_policy?: boolean | null
          agreed_no_breeding_rights?: boolean | null
          agreed_no_resale?: boolean | null
          agreed_right_of_recall?: boolean | null
          agreed_to_terms?: boolean
          agreed_welfare_commitment?: boolean | null
          aware_of_commitment?: string | null
          aware_of_costs?: string | null
          aware_of_dcm?: string | null
          budget_range?: string | null
          children_ages?: string | null
          city?: string | null
          country?: string
          created_at?: string
          current_pets?: string | null
          date_of_birth?: string | null
          delivery_acknowledged?: boolean | null
          dobermann_experience_level?: string | null
          dog_interest?: string | null
          email?: string
          employer?: string | null
          exercise_level?: string | null
          experience_with_dobermanns?: string | null
          facebook_profile?: string | null
          full_name?: string
          has_secure_yard?: string | null
          home_type?: string | null
          hours_alone_per_day?: string | null
          id?: string
          id_number?: string | null
          instagram_handle?: string | null
          last_reminder_sent_at?: string | null
          litter_interest_id?: string | null
          occupation?: string | null
          personal_reference_name?: string | null
          personal_reference_phone?: string | null
          phone?: string
          preferred_colour?: string | null
          preferred_sex?: string | null
          preferred_timeline?: string | null
          previous_dog_fate?: string | null
          province?: string | null
          purpose?: string | null
          reference_code?: string | null
          reminder_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          security_requirements?: string | null
          sleeping_arrangement?: string | null
          special_requests?: string | null
          specific_dog_id?: string | null
          status?: string
          tail_preference?: string | null
          training_planned?: boolean | null
          updated_at?: string
          user_id?: string | null
          vet_name?: string | null
          vet_phone?: string | null
          why_dobermann?: string | null
          yard_size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_litter_interest_id_fkey"
            columns: ["litter_interest_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_specific_dog_id_fkey"
            columns: ["specific_dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      breed_heat_defaults: {
        Row: {
          avg_cycle_length_days: number
          avg_diestrus_days: number
          avg_estrus_days: number
          avg_gestation_days: number
          avg_proestrus_days: number
          breed: string
          created_at: string | null
          id: string
          max_cycle_length_days: number
          min_cycle_length_days: number
          notes: string | null
          optimal_breeding_end_offset_days: number
          optimal_breeding_start_offset_days: number
          ovulation_offset_from_heat_start_days: number
        }
        Insert: {
          avg_cycle_length_days?: number
          avg_diestrus_days?: number
          avg_estrus_days?: number
          avg_gestation_days?: number
          avg_proestrus_days?: number
          breed?: string
          created_at?: string | null
          id?: string
          max_cycle_length_days?: number
          min_cycle_length_days?: number
          notes?: string | null
          optimal_breeding_end_offset_days?: number
          optimal_breeding_start_offset_days?: number
          ovulation_offset_from_heat_start_days?: number
        }
        Update: {
          avg_cycle_length_days?: number
          avg_diestrus_days?: number
          avg_estrus_days?: number
          avg_gestation_days?: number
          avg_proestrus_days?: number
          breed?: string
          created_at?: string | null
          id?: string
          max_cycle_length_days?: number
          min_cycle_length_days?: number
          notes?: string | null
          optimal_breeding_end_offset_days?: number
          optimal_breeding_start_offset_days?: number
          ovulation_offset_from_heat_start_days?: number
        }
        Relationships: []
      }
      broadcast_messages: {
        Row: {
          body: string
          channels: string[]
          created_at: string
          group_id: string | null
          id: string
          image_url: string | null
          recipient_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          title: string
        }
        Insert: {
          body: string
          channels?: string[]
          created_at?: string
          group_id?: string | null
          id?: string
          image_url?: string | null
          recipient_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          title: string
        }
        Update: {
          body?: string
          channels?: string[]
          created_at?: string
          group_id?: string | null
          id?: string
          image_url?: string | null
          recipient_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_reads: {
        Row: {
          broadcast_id: string
          client_id: string
          id: string
          read_at: string
        }
        Insert: {
          broadcast_id: string
          client_id: string
          id?: string
          read_at?: string
        }
        Update: {
          broadcast_id?: string
          client_id?: string
          id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_reads_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcast_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_reads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_line_items: {
        Row: {
          amount: number
          category_id: string
          created_at: string | null
          created_by: string | null
          id: string
          month: number | null
          name: string
          notes: string | null
          sort_order: number
          updated_at: string | null
          year: number
        }
        Insert: {
          amount?: number
          category_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          month?: number | null
          name: string
          notes?: string | null
          sort_order?: number
          updated_at?: string | null
          year: number
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          month?: number | null
          name?: string
          notes?: string | null
          sort_order?: number
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_line_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          budget_type: string
          budgeted_amount: number
          category_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          label: string | null
          month: number | null
          notes: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          budget_type?: string
          budgeted_amount?: number
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          label?: string | null
          month?: number | null
          notes?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          budget_type?: string
          budgeted_amount?: number
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          label?: string | null
          month?: number | null
          notes?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string | null
          dog_id: string | null
          end_date: string | null
          event_date: string
          event_type: string
          id: string
          is_completed: boolean | null
          is_reminder: boolean | null
          litter_id: string | null
          notes: string | null
          reminder_days_before: number | null
          source_id: string | null
          source_table: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          dog_id?: string | null
          end_date?: string | null
          event_date: string
          event_type: string
          id?: string
          is_completed?: boolean | null
          is_reminder?: boolean | null
          litter_id?: string | null
          notes?: string | null
          reminder_days_before?: number | null
          source_id?: string | null
          source_table?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          dog_id?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_completed?: boolean | null
          is_reminder?: boolean | null
          litter_id?: string | null
          notes?: string | null
          reminder_days_before?: number | null
          source_id?: string | null
          source_table?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
        ]
      }
      client_dog_notes: {
        Row: {
          client_id: string
          dog_id: string
          id: string
          nickname: string | null
          personal_notes: string | null
          updated_at: string
          vet_name: string | null
          vet_phone: string | null
          vet_practice: string | null
        }
        Insert: {
          client_id: string
          dog_id: string
          id?: string
          nickname?: string | null
          personal_notes?: string | null
          updated_at?: string
          vet_name?: string | null
          vet_phone?: string | null
          vet_practice?: string | null
        }
        Update: {
          client_id?: string
          dog_id?: string
          id?: string
          nickname?: string | null
          personal_notes?: string | null
          updated_at?: string
          vet_name?: string | null
          vet_phone?: string | null
          vet_practice?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_dog_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_dog_notes_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      client_group_members: {
        Row: {
          added_at: string
          client_id: string
          dog_id: string | null
          group_id: string
          id: string
          litter_id: string | null
        }
        Insert: {
          added_at?: string
          client_id: string
          dog_id?: string | null
          group_id: string
          id?: string
          litter_id?: string | null
        }
        Update: {
          added_at?: string
          client_id?: string
          dog_id?: string | null
          group_id?: string
          id?: string
          litter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_group_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_group_members_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_group_members_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
        ]
      }
      client_groups: {
        Row: {
          colour: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          litter_id: string | null
          member_count: number | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          colour?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          litter_id?: string | null
          member_count?: number | null
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          colour?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          litter_id?: string | null
          member_count?: number | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_groups_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_interactions: {
        Row: {
          body: string | null
          contact_id: string
          created_at: string | null
          direction: string
          id: string
          interaction_date: string
          interaction_type: string
          logged_by: string | null
          subject: string | null
        }
        Insert: {
          body?: string | null
          contact_id: string
          created_at?: string | null
          direction?: string
          id?: string
          interaction_date?: string
          interaction_type: string
          logged_by?: string | null
          subject?: string | null
        }
        Update: {
          body?: string | null
          contact_id?: string
          created_at?: string | null
          direction?: string
          id?: string
          interaction_date?: string
          interaction_type?: string
          logged_by?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          contact_type: string
          country: string | null
          created_at: string | null
          email: string | null
          first_contact_date: string | null
          full_name: string
          id: string
          id_number: string | null
          is_do_not_sell: boolean
          marketing_opt_in: boolean
          notes: string | null
          phone: string | null
          popia_consent: boolean
          popia_consent_date: string | null
          source: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          contact_type?: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_contact_date?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          is_do_not_sell?: boolean
          marketing_opt_in?: boolean
          notes?: string | null
          phone?: string | null
          popia_consent?: boolean
          popia_consent_date?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          contact_type?: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_contact_date?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          is_do_not_sell?: boolean
          marketing_opt_in?: boolean
          notes?: string | null
          phone?: string | null
          popia_consent?: boolean
          popia_consent_date?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_acknowledgements: {
        Row: {
          acknowledged_at: string
          clause_ref: string
          contract_id: string
          id: string
          ip_address: string | null
          label_snapshot: string
          user_agent: string | null
        }
        Insert: {
          acknowledged_at?: string
          clause_ref: string
          contract_id: string
          id?: string
          ip_address?: string | null
          label_snapshot: string
          user_agent?: string | null
        }
        Update: {
          acknowledged_at?: string
          clause_ref?: string
          contract_id?: string
          id?: string
          ip_address?: string | null
          label_snapshot?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_acknowledgements_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_clauses: {
        Row: {
          clause_ref: string
          created_at: string
          id: string
          is_required: boolean
          label: string
          sort_order: number
          template_id: string
        }
        Insert: {
          clause_ref: string
          created_at?: string
          id?: string
          is_required?: boolean
          label: string
          sort_order?: number
          template_id: string
        }
        Update: {
          clause_ref?: string
          created_at?: string
          id?: string
          is_required?: boolean
          label?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_clauses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_events: {
        Row: {
          actor_id: string | null
          actor_label: string | null
          contract_id: string
          created_at: string
          detail: Json | null
          event_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_label?: string | null
          contract_id: string
          created_at?: string
          detail?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_label?: string | null
          contract_id?: string
          created_at?: string
          detail?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          body_html: string
          contract_title: string
          created_at: string
          created_by: string | null
          description: string | null
          dog_label: string | null
          footer_text: string | null
          id: string
          is_active: boolean
          is_addendum: boolean
          name: string
          party_1_label: string | null
          party_2_label: string | null
          programme_tier: string | null
          sort_order: number
          updated_at: string
          version: number
        }
        Insert: {
          body_html?: string
          contract_title: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          dog_label?: string | null
          footer_text?: string | null
          id?: string
          is_active?: boolean
          is_addendum?: boolean
          name: string
          party_1_label?: string | null
          party_2_label?: string | null
          programme_tier?: string | null
          sort_order?: number
          updated_at?: string
          version?: number
        }
        Update: {
          body_html?: string
          contract_title?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          dog_label?: string | null
          footer_text?: string | null
          id?: string
          is_active?: boolean
          is_addendum?: boolean
          name?: string
          party_1_label?: string | null
          party_2_label?: string | null
          programme_tier?: string | null
          sort_order?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          body_html: string | null
          body_snapshot_at: string | null
          breeder_signed_at: string | null
          client_id: string
          client_ip_on_sign: string | null
          client_signature_device: string | null
          client_signature_url: string | null
          client_signed_at: string | null
          contract_number: string | null
          contract_title: string | null
          created_at: string
          document_url: string | null
          dog_id: string | null
          esign_expires_at: string | null
          esign_sent_at: string | null
          esign_token: string | null
          id: string
          litter_id: string | null
          notes: string | null
          parent_contract_id: string | null
          reservation_id: string | null
          signed_at: string | null
          signed_by_breeder: boolean
          signed_by_client: boolean
          status: string
          template_id: string | null
          template_version: number | null
        }
        Insert: {
          body_html?: string | null
          body_snapshot_at?: string | null
          breeder_signed_at?: string | null
          client_id: string
          client_ip_on_sign?: string | null
          client_signature_device?: string | null
          client_signature_url?: string | null
          client_signed_at?: string | null
          contract_number?: string | null
          contract_title?: string | null
          created_at?: string
          document_url?: string | null
          dog_id?: string | null
          esign_expires_at?: string | null
          esign_sent_at?: string | null
          esign_token?: string | null
          id?: string
          litter_id?: string | null
          notes?: string | null
          parent_contract_id?: string | null
          reservation_id?: string | null
          signed_at?: string | null
          signed_by_breeder?: boolean
          signed_by_client?: boolean
          status?: string
          template_id?: string | null
          template_version?: number | null
        }
        Update: {
          body_html?: string | null
          body_snapshot_at?: string | null
          breeder_signed_at?: string | null
          client_id?: string
          client_ip_on_sign?: string | null
          client_signature_device?: string | null
          client_signature_url?: string | null
          client_signed_at?: string | null
          contract_number?: string | null
          contract_title?: string | null
          created_at?: string
          document_url?: string | null
          dog_id?: string | null
          esign_expires_at?: string | null
          esign_sent_at?: string | null
          esign_token?: string | null
          id?: string
          litter_id?: string | null
          notes?: string | null
          parent_contract_id?: string | null
          reservation_id?: string | null
          signed_at?: string | null
          signed_by_breeder?: boolean
          signed_by_client?: boolean
          status?: string
          template_id?: string | null
          template_version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      deworming_records: {
        Row: {
          administered_by: string | null
          created_at: string | null
          doctor_name: string | null
          dog_id: string
          dosage: string | null
          health_product_id: string | null
          id: string
          next_due_date: string | null
          notes: string | null
          product_name: string
          schedule_type: string | null
          treatment_date: string
          treatment_type: string | null
          vet_practice_id: string | null
        }
        Insert: {
          administered_by?: string | null
          created_at?: string | null
          doctor_name?: string | null
          dog_id: string
          dosage?: string | null
          health_product_id?: string | null
          id?: string
          next_due_date?: string | null
          notes?: string | null
          product_name: string
          schedule_type?: string | null
          treatment_date: string
          treatment_type?: string | null
          vet_practice_id?: string | null
        }
        Update: {
          administered_by?: string | null
          created_at?: string | null
          doctor_name?: string | null
          dog_id?: string
          dosage?: string | null
          health_product_id?: string | null
          id?: string
          next_due_date?: string | null
          notes?: string | null
          product_name?: string
          schedule_type?: string | null
          treatment_date?: string
          treatment_type?: string | null
          vet_practice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deworming_records_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deworming_records_health_product_id_fkey"
            columns: ["health_product_id"]
            isOneToOne: false
            referencedRelation: "health_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deworming_records_vet_practice_id_fkey"
            columns: ["vet_practice_id"]
            isOneToOne: false
            referencedRelation: "vet_practices"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_log: {
        Row: {
          accessed_at: string | null
          accessed_by: string | null
          action: string
          document_id: string | null
          id: string
          ip_address: string | null
        }
        Insert: {
          accessed_at?: string | null
          accessed_by?: string | null
          action: string
          document_id?: string | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          accessed_at?: string | null
          accessed_by?: string | null
          action?: string
          document_id?: string | null
          id?: string
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_access_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          allowed_user_ids: string[] | null
          category: string
          client_visible: boolean
          date_of_document: string | null
          description: string | null
          document_name: string
          document_number: string | null
          entity_id: string
          entity_type: string
          expiry_date: string | null
          expiry_reminder_sent_at: string | null
          file_size_bytes: number | null
          file_type: string
          id: string
          is_public: boolean
          issued_by: string | null
          mime_type: string | null
          original_filename: string
          related_invoice_id: string | null
          related_quote_id: string | null
          requires_auth: boolean
          review_note: string | null
          review_status: string | null
          storage_path: string
          tags: string[] | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          allowed_user_ids?: string[] | null
          category: string
          client_visible?: boolean
          date_of_document?: string | null
          description?: string | null
          document_name: string
          document_number?: string | null
          entity_id: string
          entity_type: string
          expiry_date?: string | null
          expiry_reminder_sent_at?: string | null
          file_size_bytes?: number | null
          file_type: string
          id?: string
          is_public?: boolean
          issued_by?: string | null
          mime_type?: string | null
          original_filename: string
          related_invoice_id?: string | null
          related_quote_id?: string | null
          requires_auth?: boolean
          review_note?: string | null
          review_status?: string | null
          storage_path: string
          tags?: string[] | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          allowed_user_ids?: string[] | null
          category?: string
          client_visible?: boolean
          date_of_document?: string | null
          description?: string | null
          document_name?: string
          document_number?: string | null
          entity_id?: string
          entity_type?: string
          expiry_date?: string | null
          expiry_reminder_sent_at?: string | null
          file_size_bytes?: number | null
          file_type?: string
          id?: string
          is_public?: boolean
          issued_by?: string | null
          mime_type?: string | null
          original_filename?: string
          related_invoice_id?: string | null
          related_quote_id?: string | null
          requires_auth?: boolean
          review_note?: string | null
          review_status?: string | null
          storage_path?: string
          tags?: string[] | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_related_invoice_id_fkey"
            columns: ["related_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_related_quote_id_fkey"
            columns: ["related_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_media: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          caption: string | null
          client_consent: boolean
          dog_id: string
          id: string
          is_primary: boolean
          is_public: boolean
          sort_order: number
          thumbnail_url: string | null
          type: string
          uploaded_at: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string | null
          client_consent?: boolean
          dog_id: string
          id?: string
          is_primary?: boolean
          is_public?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          type: string
          uploaded_at?: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string | null
          client_consent?: boolean
          dog_id?: string
          id?: string
          is_primary?: boolean
          is_public?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          type?: string
          uploaded_at?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "dog_media_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_shows: {
        Row: {
          award: string | null
          club: string | null
          created_at: string
          dog_id: string
          end_date: string | null
          id: string
          location: string | null
          notes: string | null
          organisation: string | null
          placement: string | null
          start_date: string | null
          title: string
        }
        Insert: {
          award?: string | null
          club?: string | null
          created_at?: string
          dog_id: string
          end_date?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          organisation?: string | null
          placement?: string | null
          start_date?: string | null
          title: string
        }
        Update: {
          award?: string | null
          club?: string | null
          created_at?: string
          dog_id?: string
          end_date?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          organisation?: string | null
          placement?: string | null
          start_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "dog_shows_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_temperament_scores: {
        Row: {
          assessed_at: string
          assessed_by: string | null
          courage: number | null
          created_at: string | null
          dog_id: string
          drive_and_energy: number | null
          environmental_confidence: number | null
          evaluation_standard: string
          hardness: number | null
          id: string
          nerve_stability: number | null
          notes: string | null
          obedience: number | null
          social_behavior: number | null
          total_score: number | null
          working_willingness: number | null
        }
        Insert: {
          assessed_at?: string
          assessed_by?: string | null
          courage?: number | null
          created_at?: string | null
          dog_id: string
          drive_and_energy?: number | null
          environmental_confidence?: number | null
          evaluation_standard?: string
          hardness?: number | null
          id?: string
          nerve_stability?: number | null
          notes?: string | null
          obedience?: number | null
          social_behavior?: number | null
          total_score?: number | null
          working_willingness?: number | null
        }
        Update: {
          assessed_at?: string
          assessed_by?: string | null
          courage?: number | null
          created_at?: string | null
          dog_id?: string
          drive_and_energy?: number | null
          environmental_confidence?: number | null
          evaluation_standard?: string
          hardness?: number | null
          id?: string
          nerve_stability?: number | null
          notes?: string | null
          obedience?: number | null
          social_behavior?: number | null
          total_score?: number | null
          working_willingness?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dog_temperament_scores_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_timeline: {
        Row: {
          author_id: string | null
          category: string
          created_at: string
          dog_id: string
          entry_date: string
          id: string
          notes: string | null
          photo_urls: string[]
          source: string
          title: string
          video_url: string | null
        }
        Insert: {
          author_id?: string | null
          category?: string
          created_at?: string
          dog_id: string
          entry_date?: string
          id?: string
          notes?: string | null
          photo_urls?: string[]
          source?: string
          title: string
          video_url?: string | null
        }
        Update: {
          author_id?: string | null
          category?: string
          created_at?: string
          dog_id?: string
          entry_date?: string
          id?: string
          notes?: string | null
          photo_urls?: string[]
          source?: string
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dog_timeline_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dog_timeline_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dogs: {
        Row: {
          birth_weight_grams: number | null
          bloodline: string | null
          bloodline_type: string | null
          body_length_cm: number | null
          breed: string
          breeding_role: string | null
          call_name: string | null
          call_sign: string | null
          category: string
          chest_depth_cm: number | null
          chest_girth_cm: number | null
          coat_type: string | null
          collar_colour: string | null
          colour: string | null
          created_at: string
          date_of_birth: string | null
          dcm_status: string | null
          delivered_at: string | null
          delivery_method: string | null
          delivery_notes: string | null
          description: string | null
          dna_number: string | null
          ear_type: string | null
          elbow_score: string | null
          eye_colour: string | null
          father_id: string | null
          flag_bridge_sire: boolean | null
          flag_dcm_carrier: boolean | null
          flag_high_coi_bg: boolean | null
          flag_last_litter: boolean | null
          flag_sale_only: boolean | null
          generation: number | null
          genetics_b_locus: string | null
          genetics_d_locus: string | null
          genetics_dcm1_status: string | null
          genetics_dcm2_status: string | null
          genetics_notes: string | null
          genetics_vwd_status: string | null
          handover_date: string | null
          handover_status: string | null
          health_dcm1: string | null
          health_dcm2: string | null
          health_dcm3: string | null
          health_dcm4: string | null
          health_dcm5: string | null
          health_ed: string | null
          health_hd: string | null
          health_tested: boolean
          height_cm: number | null
          hip_score: string | null
          holter_date: string | null
          holter_result: string | null
          id: string
          insurance_number: string | null
          is_featured: boolean
          is_public: boolean
          is_spayed_neutered: boolean
          line: string | null
          litter_id: string | null
          location: string | null
          microchip_number: string | null
          mother_id: string | null
          name: string
          new_owner_name: string | null
          notes: string | null
          origin_pairing_id: string | null
          owner_id: string | null
          passport_number: string | null
          pedigree_url: string | null
          price: number | null
          programme_tier: string | null
          registered_name: string | null
          registration_number: string | null
          registration_type: string | null
          released_at: string | null
          reserved_for_name: string | null
          sex: string | null
          standard: string | null
          status: string
          tattoo_number: string | null
          temperament_notes: string | null
          training_notes: string | null
          updated_at: string
          urgency_flag: boolean
          wrights_coi: number | null
        }
        Insert: {
          birth_weight_grams?: number | null
          bloodline?: string | null
          bloodline_type?: string | null
          body_length_cm?: number | null
          breed?: string
          breeding_role?: string | null
          call_name?: string | null
          call_sign?: string | null
          category?: string
          chest_depth_cm?: number | null
          chest_girth_cm?: number | null
          coat_type?: string | null
          collar_colour?: string | null
          colour?: string | null
          created_at?: string
          date_of_birth?: string | null
          dcm_status?: string | null
          delivered_at?: string | null
          delivery_method?: string | null
          delivery_notes?: string | null
          description?: string | null
          dna_number?: string | null
          ear_type?: string | null
          elbow_score?: string | null
          eye_colour?: string | null
          father_id?: string | null
          flag_bridge_sire?: boolean | null
          flag_dcm_carrier?: boolean | null
          flag_high_coi_bg?: boolean | null
          flag_last_litter?: boolean | null
          flag_sale_only?: boolean | null
          generation?: number | null
          genetics_b_locus?: string | null
          genetics_d_locus?: string | null
          genetics_dcm1_status?: string | null
          genetics_dcm2_status?: string | null
          genetics_notes?: string | null
          genetics_vwd_status?: string | null
          handover_date?: string | null
          handover_status?: string | null
          health_dcm1?: string | null
          health_dcm2?: string | null
          health_dcm3?: string | null
          health_dcm4?: string | null
          health_dcm5?: string | null
          health_ed?: string | null
          health_hd?: string | null
          health_tested?: boolean
          height_cm?: number | null
          hip_score?: string | null
          holter_date?: string | null
          holter_result?: string | null
          id?: string
          insurance_number?: string | null
          is_featured?: boolean
          is_public?: boolean
          is_spayed_neutered?: boolean
          line?: string | null
          litter_id?: string | null
          location?: string | null
          microchip_number?: string | null
          mother_id?: string | null
          name: string
          new_owner_name?: string | null
          notes?: string | null
          origin_pairing_id?: string | null
          owner_id?: string | null
          passport_number?: string | null
          pedigree_url?: string | null
          price?: number | null
          programme_tier?: string | null
          registered_name?: string | null
          registration_number?: string | null
          registration_type?: string | null
          released_at?: string | null
          reserved_for_name?: string | null
          sex?: string | null
          standard?: string | null
          status?: string
          tattoo_number?: string | null
          temperament_notes?: string | null
          training_notes?: string | null
          updated_at?: string
          urgency_flag?: boolean
          wrights_coi?: number | null
        }
        Update: {
          birth_weight_grams?: number | null
          bloodline?: string | null
          bloodline_type?: string | null
          body_length_cm?: number | null
          breed?: string
          breeding_role?: string | null
          call_name?: string | null
          call_sign?: string | null
          category?: string
          chest_depth_cm?: number | null
          chest_girth_cm?: number | null
          coat_type?: string | null
          collar_colour?: string | null
          colour?: string | null
          created_at?: string
          date_of_birth?: string | null
          dcm_status?: string | null
          delivered_at?: string | null
          delivery_method?: string | null
          delivery_notes?: string | null
          description?: string | null
          dna_number?: string | null
          ear_type?: string | null
          elbow_score?: string | null
          eye_colour?: string | null
          father_id?: string | null
          flag_bridge_sire?: boolean | null
          flag_dcm_carrier?: boolean | null
          flag_high_coi_bg?: boolean | null
          flag_last_litter?: boolean | null
          flag_sale_only?: boolean | null
          generation?: number | null
          genetics_b_locus?: string | null
          genetics_d_locus?: string | null
          genetics_dcm1_status?: string | null
          genetics_dcm2_status?: string | null
          genetics_notes?: string | null
          genetics_vwd_status?: string | null
          handover_date?: string | null
          handover_status?: string | null
          health_dcm1?: string | null
          health_dcm2?: string | null
          health_dcm3?: string | null
          health_dcm4?: string | null
          health_dcm5?: string | null
          health_ed?: string | null
          health_hd?: string | null
          health_tested?: boolean
          height_cm?: number | null
          hip_score?: string | null
          holter_date?: string | null
          holter_result?: string | null
          id?: string
          insurance_number?: string | null
          is_featured?: boolean
          is_public?: boolean
          is_spayed_neutered?: boolean
          line?: string | null
          litter_id?: string | null
          location?: string | null
          microchip_number?: string | null
          mother_id?: string | null
          name?: string
          new_owner_name?: string | null
          notes?: string | null
          origin_pairing_id?: string | null
          owner_id?: string | null
          passport_number?: string | null
          pedigree_url?: string | null
          price?: number | null
          programme_tier?: string | null
          registered_name?: string | null
          registration_number?: string | null
          registration_type?: string | null
          released_at?: string | null
          reserved_for_name?: string | null
          sex?: string | null
          standard?: string | null
          status?: string
          tattoo_number?: string | null
          temperament_notes?: string | null
          training_notes?: string | null
          updated_at?: string
          urgency_flag?: boolean
          wrights_coi?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dogs_father_id_fkey"
            columns: ["father_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dogs_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dogs_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dogs_origin_pairing_id_fkey"
            columns: ["origin_pairing_id"]
            isOneToOne: false
            referencedRelation: "pairings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dogs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiries: {
        Row: {
          admin_notes: string | null
          country: string | null
          created_at: string
          dog_id: string | null
          email: string
          full_name: string
          id: string
          message: string
          phone: string | null
          replied_at: string | null
          replied_by: string | null
          status: string
          subject: string | null
        }
        Insert: {
          admin_notes?: string | null
          country?: string | null
          created_at?: string
          dog_id?: string | null
          email: string
          full_name: string
          id?: string
          message: string
          phone?: string | null
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          admin_notes?: string | null
          country?: string | null
          created_at?: string
          dog_id?: string | null
          email?: string
          full_name?: string
          id?: string
          message?: string
          phone?: string | null
          replied_at?: string | null
          replied_by?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_replied_by_fkey"
            columns: ["replied_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          colour: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          colour?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          colour?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          allocation_type: string
          amount: number
          category_id: string | null
          created_at: string
          creditor_name: string | null
          currency: string
          description: string
          dog_id: string | null
          expense_date: string
          id: string
          invoice_reference: string | null
          is_payable: boolean
          is_recurring: boolean
          litter_id: string | null
          notes: string | null
          payable_due_date: string | null
          payable_paid_date: string | null
          payment_account_id: string | null
          payment_account_name: string | null
          price_excl_vat: number | null
          receipt_url: string | null
          recorded_by: string | null
          recurrence_end_date: string | null
          recurrence_interval: string | null
          source: string
          status: string
          supplier_name: string | null
          updated_at: string
          vat_amount: number | null
          vat_applicable: boolean
          vat_rate: number | null
        }
        Insert: {
          allocation_type?: string
          amount: number
          category_id?: string | null
          created_at?: string
          creditor_name?: string | null
          currency?: string
          description: string
          dog_id?: string | null
          expense_date?: string
          id?: string
          invoice_reference?: string | null
          is_payable?: boolean
          is_recurring?: boolean
          litter_id?: string | null
          notes?: string | null
          payable_due_date?: string | null
          payable_paid_date?: string | null
          payment_account_id?: string | null
          payment_account_name?: string | null
          price_excl_vat?: number | null
          receipt_url?: string | null
          recorded_by?: string | null
          recurrence_end_date?: string | null
          recurrence_interval?: string | null
          source?: string
          status?: string
          supplier_name?: string | null
          updated_at?: string
          vat_amount?: number | null
          vat_applicable?: boolean
          vat_rate?: number | null
        }
        Update: {
          allocation_type?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          creditor_name?: string | null
          currency?: string
          description?: string
          dog_id?: string | null
          expense_date?: string
          id?: string
          invoice_reference?: string | null
          is_payable?: boolean
          is_recurring?: boolean
          litter_id?: string | null
          notes?: string | null
          payable_due_date?: string | null
          payable_paid_date?: string | null
          payment_account_id?: string | null
          payment_account_name?: string | null
          price_excl_vat?: number | null
          receipt_url?: string | null
          recorded_by?: string | null
          recurrence_end_date?: string | null
          recurrence_interval?: string | null
          source?: string
          status?: string
          supplier_name?: string | null
          updated_at?: string
          vat_amount?: number | null
          vat_applicable?: boolean
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      faq: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          is_published: boolean
          question: string
          sort_order: number
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          question: string
          sort_order?: number
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          question?: string
          sort_order?: number
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          discipline: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          photo_taken_at: string | null
          sort_order: number
          title: string | null
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          discipline?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          photo_taken_at?: string | null
          sort_order?: number
          title?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          discipline?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          photo_taken_at?: string | null
          sort_order?: number
          title?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      health_products: {
        Row: {
          category: string
          created_at: string | null
          default_schedule_type: string | null
          id: string
          is_active: boolean
          manufacturer: string | null
          notes: string | null
          product_name: string
        }
        Insert: {
          category: string
          created_at?: string | null
          default_schedule_type?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          notes?: string | null
          product_name: string
        }
        Update: {
          category?: string
          created_at?: string | null
          default_schedule_type?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          notes?: string | null
          product_name?: string
        }
        Relationships: []
      }
      health_tests: {
        Row: {
          certificate_url: string | null
          created_at: string
          dog_id: string
          id: string
          lab: string | null
          notes: string | null
          result: string | null
          test_name: string
          tested_date: string | null
        }
        Insert: {
          certificate_url?: string | null
          created_at?: string
          dog_id: string
          id?: string
          lab?: string | null
          notes?: string | null
          result?: string | null
          test_name: string
          tested_date?: string | null
        }
        Update: {
          certificate_url?: string | null
          created_at?: string
          dog_id?: string
          id?: string
          lab?: string | null
          notes?: string | null
          result?: string | null
          test_name?: string
          tested_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_tests_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      heat_cycles: {
        Row: {
          actual_cycle_length_days: number | null
          actual_whelp_date: string | null
          cancelled_reason: string | null
          created_at: string
          cycle_confirmed_at: string | null
          dog_id: string
          estrus_start_date: string | null
          expected_whelp_date: string | null
          go_home_earliest: string | null
          go_home_latest: string | null
          heat_end_date: string | null
          heat_start_date: string
          id: string
          is_predicted: boolean
          mating_date: string | null
          mating_type: string | null
          notes: string | null
          ovulation_date: string | null
          predicted_next_heat_date: string | null
          proestrus_start_date: string | null
          progesterone_tests: Json | null
          resulting_litter_id: string | null
          sire_id: string | null
          status: string
          updated_at: string
          whelp_date_earliest: string | null
          whelp_date_latest: string | null
        }
        Insert: {
          actual_cycle_length_days?: number | null
          actual_whelp_date?: string | null
          cancelled_reason?: string | null
          created_at?: string
          cycle_confirmed_at?: string | null
          dog_id: string
          estrus_start_date?: string | null
          expected_whelp_date?: string | null
          go_home_earliest?: string | null
          go_home_latest?: string | null
          heat_end_date?: string | null
          heat_start_date: string
          id?: string
          is_predicted?: boolean
          mating_date?: string | null
          mating_type?: string | null
          notes?: string | null
          ovulation_date?: string | null
          predicted_next_heat_date?: string | null
          proestrus_start_date?: string | null
          progesterone_tests?: Json | null
          resulting_litter_id?: string | null
          sire_id?: string | null
          status?: string
          updated_at?: string
          whelp_date_earliest?: string | null
          whelp_date_latest?: string | null
        }
        Update: {
          actual_cycle_length_days?: number | null
          actual_whelp_date?: string | null
          cancelled_reason?: string | null
          created_at?: string
          cycle_confirmed_at?: string | null
          dog_id?: string
          estrus_start_date?: string | null
          expected_whelp_date?: string | null
          go_home_earliest?: string | null
          go_home_latest?: string | null
          heat_end_date?: string | null
          heat_start_date?: string
          id?: string
          is_predicted?: boolean
          mating_date?: string | null
          mating_type?: string | null
          notes?: string | null
          ovulation_date?: string | null
          predicted_next_heat_date?: string | null
          proestrus_start_date?: string | null
          progesterone_tests?: Json | null
          resulting_litter_id?: string | null
          sire_id?: string | null
          status?: string
          updated_at?: string
          whelp_date_earliest?: string | null
          whelp_date_latest?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "heat_cycles_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heat_cycles_resulting_litter_id_fkey"
            columns: ["resulting_litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heat_cycles_sire_id_fkey"
            columns: ["sire_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_income: {
        Row: {
          amount: number
          category: string
          contact_name: string | null
          created_at: string
          currency: string
          description: string | null
          dog_id: string | null
          dog_name: string | null
          id: string
          imported_at: string
          income_date: string
          invoice_number: string | null
          litter_name: string | null
          notes: string | null
          source: string
          tax: number
          total_amount: number
        }
        Insert: {
          amount: number
          category: string
          contact_name?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          dog_id?: string | null
          dog_name?: string | null
          id?: string
          imported_at?: string
          income_date: string
          invoice_number?: string | null
          litter_name?: string | null
          notes?: string | null
          source?: string
          tax?: number
          total_amount: number
        }
        Update: {
          amount?: number
          category?: string
          contact_name?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          dog_id?: string | null
          dog_name?: string | null
          id?: string
          imported_at?: string
          income_date?: string
          invoice_number?: string | null
          litter_name?: string | null
          notes?: string | null
          source?: string
          tax?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "historical_income_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          item_type: string
          line_total: number | null
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          item_type?: string
          line_total?: number | null
          quantity?: number
          sort_order?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          item_type?: string
          line_total?: number | null
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_outstanding: number | null
          amount_paid: number
          client_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          discount_amount: number
          dog_id: string | null
          due_date: string | null
          historical_client_name: string | null
          historical_income_id: string | null
          id: string
          internal_notes: string | null
          invoice_number: string
          issue_date: string
          litter_id: string | null
          notes: string | null
          paid_date: string | null
          quote_id: string | null
          reservation_id: string | null
          source: string | null
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_outstanding?: number | null
          amount_paid?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_amount?: number
          dog_id?: string | null
          due_date?: string | null
          historical_client_name?: string | null
          historical_income_id?: string | null
          id?: string
          internal_notes?: string | null
          invoice_number: string
          issue_date?: string
          litter_id?: string | null
          notes?: string | null
          paid_date?: string | null
          quote_id?: string | null
          reservation_id?: string | null
          source?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_outstanding?: number | null
          amount_paid?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_amount?: number
          dog_id?: string | null
          due_date?: string | null
          historical_client_name?: string | null
          historical_income_id?: string | null
          id?: string
          internal_notes?: string | null
          invoice_number?: string
          issue_date?: string
          litter_id?: string | null
          notes?: string | null
          paid_date?: string | null
          quote_id?: string | null
          reservation_id?: string | null
          source?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_historical_income_id_fkey"
            columns: ["historical_income_id"]
            isOneToOne: false
            referencedRelation: "historical_income"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          detail: string | null
          error_message: string | null
          error_stack: string | null
          fingerprint: string | null
          id: string
          last_seen_at: string
          occurrence_count: number
          page_path: string | null
          reported_by: string | null
          reporter_role: string | null
          resolved_at: string | null
          resolved_by: string | null
          screenshot_document_id: string | null
          severity: string
          source: string
          status: string
          title: string
          user_agent: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          detail?: string | null
          error_message?: string | null
          error_stack?: string | null
          fingerprint?: string | null
          id?: string
          last_seen_at?: string
          occurrence_count?: number
          page_path?: string | null
          reported_by?: string | null
          reporter_role?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_document_id?: string | null
          severity?: string
          source?: string
          status?: string
          title: string
          user_agent?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          detail?: string | null
          error_message?: string | null
          error_stack?: string | null
          fingerprint?: string | null
          id?: string
          last_seen_at?: string
          occurrence_count?: number
          page_path?: string | null
          reported_by?: string | null
          reporter_role?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_document_id?: string | null
          severity?: string
          source?: string
          status?: string
          title?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issue_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_reports_screenshot_document_id_fkey"
            columns: ["screenshot_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kennel_documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_size_bytes: number | null
          file_type: string | null
          id: string
          is_starred: boolean
          name: string
          original_filename: string
          public_url: string | null
          storage_path: string
          tags: string[] | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          is_starred?: boolean
          name: string
          original_filename: string
          public_url?: string | null
          storage_path: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          is_starred?: boolean
          name?: string
          original_filename?: string
          public_url?: string | null
          storage_path?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kennel_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      litter_media: {
        Row: {
          caption: string | null
          created_at: string | null
          dog_id: string | null
          id: string
          litter_id: string | null
          media_type: string
          public_url: string
          sort_order: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          dog_id?: string | null
          id?: string
          litter_id?: string | null
          media_type: string
          public_url: string
          sort_order?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          dog_id?: string | null
          id?: string
          litter_id?: string | null
          media_type?: string
          public_url?: string
          sort_order?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "litter_media_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litter_media_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
        ]
      }
      litter_todos: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          dog_id: string | null
          due_date: string | null
          id: string
          litter_id: string | null
          title: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dog_id?: string | null
          due_date?: string | null
          id?: string
          litter_id?: string | null
          title: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          dog_id?: string | null
          due_date?: string | null
          id?: string
          litter_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "litter_todos_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litter_todos_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
        ]
      }
      litter_transaction_items: {
        Row: {
          amount_cents: number
          description: string
          dog_id: string | null
          id: string
          sort_order: number | null
          tax_cents: number
          transaction_id: string | null
        }
        Insert: {
          amount_cents?: number
          description: string
          dog_id?: string | null
          id?: string
          sort_order?: number | null
          tax_cents?: number
          transaction_id?: string | null
        }
        Update: {
          amount_cents?: number
          description?: string
          dog_id?: string | null
          id?: string
          sort_order?: number | null
          tax_cents?: number
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "litter_transaction_items_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litter_transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "litter_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      litter_transactions: {
        Row: {
          amounts_tax_mode: string | null
          attachment_path: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          id: string
          invoice_number: string | null
          litter_id: string | null
          notes: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amounts_tax_mode?: string | null
          attachment_path?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          id?: string
          invoice_number?: string | null
          litter_id?: string | null
          notes?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          amounts_tax_mode?: string | null
          attachment_path?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          id?: string
          invoice_number?: string | null
          litter_id?: string | null
          notes?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "litter_transactions_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
        ]
      }
      litters: {
        Row: {
          actual_date: string | null
          actual_time: string | null
          announcement_image_url: string | null
          available_count: number | null
          birth_weight_grams: number | null
          created_at: string
          deceased_count: number
          description: string | null
          expected_date: string | null
          father_id: string | null
          female_count: number | null
          go_home_date: string | null
          go_home_earliest: string | null
          go_home_latest: string | null
          go_home_weeks: number | null
          heat_cycle_id: string | null
          id: string
          is_public: boolean
          litter_letter: string | null
          male_count: number | null
          mating_date: string | null
          mating_type: string | null
          mother_id: string | null
          name: string | null
          notes: string | null
          pairing_id: string | null
          public_sections: string[] | null
          puppy_count: number | null
          retained_female_ids: string[] | null
          retained_male_id: string | null
          status: string
          updated_at: string
          whelp_date_earliest: string | null
          whelp_date_latest: string | null
          whelping_notes: string | null
          whelping_type: string | null
        }
        Insert: {
          actual_date?: string | null
          actual_time?: string | null
          announcement_image_url?: string | null
          available_count?: number | null
          birth_weight_grams?: number | null
          created_at?: string
          deceased_count?: number
          description?: string | null
          expected_date?: string | null
          father_id?: string | null
          female_count?: number | null
          go_home_date?: string | null
          go_home_earliest?: string | null
          go_home_latest?: string | null
          go_home_weeks?: number | null
          heat_cycle_id?: string | null
          id?: string
          is_public?: boolean
          litter_letter?: string | null
          male_count?: number | null
          mating_date?: string | null
          mating_type?: string | null
          mother_id?: string | null
          name?: string | null
          notes?: string | null
          pairing_id?: string | null
          public_sections?: string[] | null
          puppy_count?: number | null
          retained_female_ids?: string[] | null
          retained_male_id?: string | null
          status?: string
          updated_at?: string
          whelp_date_earliest?: string | null
          whelp_date_latest?: string | null
          whelping_notes?: string | null
          whelping_type?: string | null
        }
        Update: {
          actual_date?: string | null
          actual_time?: string | null
          announcement_image_url?: string | null
          available_count?: number | null
          birth_weight_grams?: number | null
          created_at?: string
          deceased_count?: number
          description?: string | null
          expected_date?: string | null
          father_id?: string | null
          female_count?: number | null
          go_home_date?: string | null
          go_home_earliest?: string | null
          go_home_latest?: string | null
          go_home_weeks?: number | null
          heat_cycle_id?: string | null
          id?: string
          is_public?: boolean
          litter_letter?: string | null
          male_count?: number | null
          mating_date?: string | null
          mating_type?: string | null
          mother_id?: string | null
          name?: string | null
          notes?: string | null
          pairing_id?: string | null
          public_sections?: string[] | null
          puppy_count?: number | null
          retained_female_ids?: string[] | null
          retained_male_id?: string | null
          status?: string
          updated_at?: string
          whelp_date_earliest?: string | null
          whelp_date_latest?: string | null
          whelping_notes?: string | null
          whelping_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "litters_father_id_fkey"
            columns: ["father_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litters_heat_cycle_id_fkey"
            columns: ["heat_cycle_id"]
            isOneToOne: false
            referencedRelation: "heat_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litters_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litters_pairing_id_fkey"
            columns: ["pairing_id"]
            isOneToOne: false
            referencedRelation: "pairings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litters_retained_male_id_fkey"
            columns: ["retained_male_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_conditions: {
        Row: {
          condition_name: string
          created_at: string
          diagnosed_date: string | null
          dog_id: string
          id: string
          is_active: boolean
          notes: string | null
          resolved_date: string | null
        }
        Insert: {
          condition_name: string
          created_at?: string
          diagnosed_date?: string | null
          dog_id: string
          id?: string
          is_active?: boolean
          notes?: string | null
          resolved_date?: string | null
        }
        Update: {
          condition_name?: string
          created_at?: string
          diagnosed_date?: string | null
          dog_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          resolved_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_conditions_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_log: {
        Row: {
          body: string | null
          id: string
          is_read: boolean
          recipient_id: string | null
          sent_at: string
          status: string
          subject: string | null
          type: string
        }
        Insert: {
          body?: string | null
          id?: string
          is_read?: boolean
          recipient_id?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
          type: string
        }
        Update: {
          body?: string | null
          id?: string
          is_read?: boolean
          recipient_id?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_log_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pairings: {
        Row: {
          coi_estimate: number | null
          created_at: string
          dam_id: string
          date_bred: string | null
          expected_litter_date: string | null
          generation: number
          id: string
          line: string
          litter_id: string | null
          notes: string | null
          priority: string
          sire_id: string
          status: string
          target_date: string | null
          trial_generation: number | null
          trial_notes: string | null
          updated_at: string
        }
        Insert: {
          coi_estimate?: number | null
          created_at?: string
          dam_id: string
          date_bred?: string | null
          expected_litter_date?: string | null
          generation?: number
          id?: string
          line: string
          litter_id?: string | null
          notes?: string | null
          priority?: string
          sire_id: string
          status?: string
          target_date?: string | null
          trial_generation?: number | null
          trial_notes?: string | null
          updated_at?: string
        }
        Update: {
          coi_estimate?: number | null
          created_at?: string
          dam_id?: string
          date_bred?: string | null
          expected_litter_date?: string | null
          generation?: number
          id?: string
          line?: string
          litter_id?: string | null
          notes?: string | null
          priority?: string
          sire_id?: string
          status?: string
          target_date?: string | null
          trial_generation?: number | null
          trial_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pairings_dam_id_fkey"
            columns: ["dam_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairings_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairings_sire_id_fkey"
            columns: ["sire_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_accounts: {
        Row: {
          account_type: string
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          account_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          account_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          currency: string
          id: string
          item_name: string | null
          m_payment_id: string
          notify_url: string | null
          order_type: string
          paid_at: string | null
          payfast_payment_id: string | null
          reference_id: string | null
          return_url: string | null
          status: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          item_name?: string | null
          m_payment_id: string
          notify_url?: string | null
          order_type: string
          paid_at?: string | null
          payfast_payment_id?: string | null
          reference_id?: string | null
          return_url?: string | null
          status?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          item_name?: string | null
          m_payment_id?: string
          notify_url?: string | null
          order_type?: string
          paid_at?: string | null
          payfast_payment_id?: string | null
          reference_id?: string | null
          return_url?: string | null
          status?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          id: string
          invoice_id: string
          method: string
          notes: string | null
          paid_at: string
          proof_document_id: string | null
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          method?: string
          notes?: string | null
          paid_at?: string
          proof_document_id?: string | null
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          notes?: string | null
          paid_at?: string
          proof_document_id?: string | null
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_proof_document_id_fkey"
            columns: ["proof_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pedigree_ancestors: {
        Row: {
          created_at: string
          date_of_birth: string | null
          dog_id: string
          generation: number
          id: string
          own_ancestor_id: string | null
          position: string
          registered_name: string | null
          sort_order: number
          titles_health: string | null
          wrights_coi: number | null
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          dog_id: string
          generation: number
          id?: string
          own_ancestor_id?: string | null
          position: string
          registered_name?: string | null
          sort_order: number
          titles_health?: string | null
          wrights_coi?: number | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          dog_id?: string
          generation?: number
          id?: string
          own_ancestor_id?: string | null
          position?: string
          registered_name?: string | null
          sort_order?: number
          titles_health?: string | null
          wrights_coi?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedigree_ancestors_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedigree_ancestors_own_ancestor_id_fkey"
            columns: ["own_ancestor_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          display_label: string
          id: string
          is_public: boolean
          price: number
          price_on_request: boolean
          sort_order: number
          tier_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          display_label: string
          id?: string
          is_public?: boolean
          price?: number
          price_on_request?: boolean
          sort_order?: number
          tier_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          display_label?: string
          id?: string
          is_public?: boolean
          price?: number
          price_on_request?: boolean
          sort_order?: number
          tier_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tiers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_backups: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      puppy_health_records: {
        Row: {
          administered_by: string | null
          created_at: string | null
          created_by: string | null
          description: string
          dog_id: string | null
          id: string
          litter_id: string | null
          next_due_date: string | null
          notes: string | null
          record_date: string
          record_type: string
          type_label: string
        }
        Insert: {
          administered_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          dog_id?: string | null
          id?: string
          litter_id?: string | null
          next_due_date?: string | null
          notes?: string | null
          record_date: string
          record_type: string
          type_label: string
        }
        Update: {
          administered_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          dog_id?: string | null
          id?: string
          litter_id?: string | null
          next_due_date?: string | null
          notes?: string | null
          record_date?: string
          record_type?: string
          type_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "puppy_health_records_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puppy_health_records_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
        ]
      }
      puppy_sharing: {
        Row: {
          dog_id: string | null
          id: string
          is_pedigree_public: boolean | null
          is_public_page: boolean | null
          updated_at: string | null
        }
        Insert: {
          dog_id?: string | null
          id?: string
          is_pedigree_public?: boolean | null
          is_public_page?: boolean | null
          updated_at?: string | null
        }
        Update: {
          dog_id?: string | null
          id?: string
          is_pedigree_public?: boolean | null
          is_public_page?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "puppy_sharing_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: true
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          description: string
          dog_id: string | null
          id: string
          item_type: string
          line_total: number | null
          quantity: number
          quote_id: string
          sort_order: number
          unit_price: number
        }
        Insert: {
          description: string
          dog_id?: string | null
          id?: string
          item_type: string
          line_total?: number | null
          quantity?: number
          quote_id: string
          sort_order?: number
          unit_price?: number
        }
        Update: {
          description?: string
          dog_id?: string | null
          id?: string
          item_type?: string
          line_total?: number | null
          quantity?: number
          quote_id?: string
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          application_id: string | null
          client_id: string | null
          converted_invoice_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          declined_reason: string | null
          discount: number
          historical_client_name: string | null
          id: string
          notes: string | null
          quote_number: string
          sent_at: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          application_id?: string | null
          client_id?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          declined_reason?: string | null
          discount?: number
          historical_client_name?: string | null
          id?: string
          notes?: string | null
          quote_number: string
          sent_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          application_id?: string | null
          client_id?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          declined_reason?: string | null
          discount?: number
          historical_client_name?: string | null
          id?: string
          notes?: string | null
          quote_number?: string
          sent_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_converted_invoice_id_fkey"
            columns: ["converted_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          actual_pickup_date: string | null
          application_id: string | null
          client_id: string
          created_at: string
          deposit_amount: number | null
          deposit_paid: boolean
          dog_id: string | null
          expected_pickup_date: string | null
          id: string
          litter_id: string | null
          notes: string | null
          status: string
          total_price: number | null
          updated_at: string
        }
        Insert: {
          actual_pickup_date?: string | null
          application_id?: string | null
          client_id: string
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: boolean
          dog_id?: string | null
          expected_pickup_date?: string | null
          id?: string
          litter_id?: string | null
          notes?: string | null
          status?: string
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          actual_pickup_date?: string | null
          application_id?: string | null
          client_id?: string
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: boolean
          dog_id?: string | null
          expected_pickup_date?: string | null
          id?: string
          litter_id?: string | null
          notes?: string | null
          status?: string
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          client_name: string
          content: string
          created_at: string
          dog_name: string | null
          id: string
          is_approved: boolean
          is_featured: boolean
          location: string | null
          photo_url: string | null
          sort_order: number
          video_url: string | null
        }
        Insert: {
          client_name: string
          content: string
          created_at?: string
          dog_name?: string | null
          id?: string
          is_approved?: boolean
          is_featured?: boolean
          location?: string | null
          photo_url?: string | null
          sort_order?: number
          video_url?: string | null
        }
        Update: {
          client_name?: string
          content?: string
          created_at?: string
          dog_name?: string | null
          id?: string
          is_approved?: boolean
          is_featured?: boolean
          location?: string | null
          photo_url?: string | null
          sort_order?: number
          video_url?: string | null
        }
        Relationships: []
      }
      todo_items: {
        Row: {
          application_id: string | null
          assigned_to: string | null
          booking_id: string | null
          category: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          dog_id: string | null
          due_date: string | null
          heat_cycle_id: string | null
          id: string
          is_completed: boolean
          litter_id: string | null
          priority: string | null
          title: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          assigned_to?: string | null
          booking_id?: string | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dog_id?: string | null
          due_date?: string | null
          heat_cycle_id?: string | null
          id?: string
          is_completed?: boolean
          litter_id?: string | null
          priority?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          assigned_to?: string | null
          booking_id?: string | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          dog_id?: string | null
          due_date?: string | null
          heat_cycle_id?: string | null
          id?: string
          is_completed?: boolean
          litter_id?: string | null
          priority?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_items_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "training_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_items_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_items_heat_cycle_id_fkey"
            columns: ["heat_cycle_id"]
            isOneToOne: false
            referencedRelation: "heat_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_items_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
        ]
      }
      training_availability: {
        Row: {
          available_date: string
          created_at: string
          end_time: string
          id: string
          is_blocked: boolean
          max_bookings: number
          notes: string | null
          session_type_id: string | null
          start_time: string
          trainer_id: string | null
        }
        Insert: {
          available_date: string
          created_at?: string
          end_time: string
          id?: string
          is_blocked?: boolean
          max_bookings?: number
          notes?: string | null
          session_type_id?: string | null
          start_time: string
          trainer_id?: string | null
        }
        Update: {
          available_date?: string
          created_at?: string
          end_time?: string
          id?: string
          is_blocked?: boolean
          max_bookings?: number
          notes?: string | null
          session_type_id?: string | null
          start_time?: string
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_availability_session_type_id_fkey"
            columns: ["session_type_id"]
            isOneToOne: false
            referencedRelation: "training_session_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_availability_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      training_booking_media: {
        Row: {
          booking_id: string
          caption: string | null
          created_at: string
          id: string
          media_type: string
          public_url: string | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          booking_id: string
          caption?: string | null
          created_at?: string
          id?: string
          media_type: string
          public_url?: string | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          booking_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          media_type?: string
          public_url?: string | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_booking_media_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "training_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_booking_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      training_booking_messages: {
        Row: {
          body: string
          booking_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          booking_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          booking_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_booking_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "training_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_booking_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      training_bookings: {
        Row: {
          admin_notes: string | null
          availability_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string
          client_notes: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          dog_id: string | null
          duration_minutes: number
          id: string
          reminder_sent: boolean
          scheduled_at: string
          session_format: string
          session_type_id: string
          status: string
          trainer_id: string | null
          trainer_notes: string | null
          updated_at: string
          video_host_url: string | null
          video_room_expires_at: string | null
          video_room_name: string | null
          video_room_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          availability_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id: string
          client_notes?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          dog_id?: string | null
          duration_minutes?: number
          id?: string
          reminder_sent?: boolean
          scheduled_at: string
          session_format?: string
          session_type_id: string
          status?: string
          trainer_id?: string | null
          trainer_notes?: string | null
          updated_at?: string
          video_host_url?: string | null
          video_room_expires_at?: string | null
          video_room_name?: string | null
          video_room_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          availability_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string
          client_notes?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          dog_id?: string | null
          duration_minutes?: number
          id?: string
          reminder_sent?: boolean
          scheduled_at?: string
          session_format?: string
          session_type_id?: string
          status?: string
          trainer_id?: string | null
          trainer_notes?: string | null
          updated_at?: string
          video_host_url?: string | null
          video_room_expires_at?: string | null
          video_room_name?: string | null
          video_room_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_bookings_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "training_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_bookings_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_bookings_session_type_id_fkey"
            columns: ["session_type_id"]
            isOneToOne: false
            referencedRelation: "training_session_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_bookings_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      training_guides: {
        Row: {
          body_html: string
          category: string
          created_at: string
          id: string
          is_published: boolean
          max_age_weeks: number | null
          min_age_weeks: number | null
          slug: string
          sort_order: number
          summary: string | null
          title: string
        }
        Insert: {
          body_html?: string
          category?: string
          created_at?: string
          id?: string
          is_published?: boolean
          max_age_weeks?: number | null
          min_age_weeks?: number | null
          slug: string
          sort_order?: number
          summary?: string | null
          title: string
        }
        Update: {
          body_html?: string
          category?: string
          created_at?: string
          id?: string
          is_published?: boolean
          max_age_weeks?: number | null
          min_age_weeks?: number | null
          slug?: string
          sort_order?: number
          summary?: string | null
          title?: string
        }
        Relationships: []
      }
      training_log_media: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          media_type: string
          public_url: string
          sort_order: number
          storage_path: string | null
          training_log_id: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          media_type: string
          public_url: string
          sort_order?: number
          storage_path?: string | null
          training_log_id: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          media_type?: string
          public_url?: string
          sort_order?: number
          storage_path?: string | null
          training_log_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_log_media_training_log_id_fkey"
            columns: ["training_log_id"]
            isOneToOne: false
            referencedRelation: "training_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_log_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      training_logs: {
        Row: {
          created_at: string
          dog_id: string
          duration_minutes: number | null
          id: string
          is_draft: boolean
          is_public: boolean
          milestone: string | null
          notes: string | null
          phase: string | null
          progress_level: string | null
          session_date: string
          trainer_id: string | null
          training_type: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          dog_id: string
          duration_minutes?: number | null
          id?: string
          is_draft?: boolean
          is_public?: boolean
          milestone?: string | null
          notes?: string | null
          phase?: string | null
          progress_level?: string | null
          session_date: string
          trainer_id?: string | null
          training_type: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          dog_id?: string
          duration_minutes?: number | null
          id?: string
          is_draft?: boolean
          is_public?: boolean
          milestone?: string | null
          notes?: string | null
          phase?: string | null
          progress_level?: string | null
          session_date?: string
          trainer_id?: string | null
          training_type?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_logs_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_logs_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      training_session_types: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number | null
          session_format: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          price?: number | null
          session_format?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          session_format?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      training_video_categories: {
        Row: {
          colour: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          colour?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          colour?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      training_videos: {
        Row: {
          access_tier: string
          bundle_id: string | null
          category_id: string
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          is_active: boolean
          sort_order: number
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_url: string | null
          week_label: string | null
        }
        Insert: {
          access_tier?: string
          bundle_id?: string | null
          category_id: string
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          sort_order?: number
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_url?: string | null
          week_label?: string | null
        }
        Update: {
          access_tier?: string
          bundle_id?: string | null
          category_id?: string
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean
          sort_order?: number
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
          week_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_videos_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "video_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_videos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "training_video_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          current_pets: string | null
          dog_experience: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          expo_push_token: string | null
          full_name: string | null
          has_children: boolean | null
          has_fencing: boolean | null
          id: string
          marketing_opt_in: boolean
          phone: string | null
          profile_completed_at: string | null
          property_type: string | null
          purpose: string[] | null
          role: string
          updated_at: string
          vet_name: string | null
          vet_phone: string | null
          vet_practice: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_pets?: string | null
          dog_experience?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          expo_push_token?: string | null
          full_name?: string | null
          has_children?: boolean | null
          has_fencing?: boolean | null
          id: string
          marketing_opt_in?: boolean
          phone?: string | null
          profile_completed_at?: string | null
          property_type?: string | null
          purpose?: string[] | null
          role?: string
          updated_at?: string
          vet_name?: string | null
          vet_phone?: string | null
          vet_practice?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_pets?: string | null
          dog_experience?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          expo_push_token?: string | null
          full_name?: string | null
          has_children?: boolean | null
          has_fencing?: boolean | null
          id?: string
          marketing_opt_in?: boolean
          phone?: string | null
          profile_completed_at?: string | null
          property_type?: string | null
          purpose?: string[] | null
          role?: string
          updated_at?: string
          vet_name?: string | null
          vet_phone?: string | null
          vet_practice?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      vaccinations: {
        Row: {
          administered_by: string | null
          batch_number: string | null
          created_at: string
          date_administered: string
          doctor_name: string | null
          dog_id: string
          health_product_id: string | null
          id: string
          next_due_date: string | null
          notes: string | null
          schedule_type: string | null
          treatment_type: string | null
          vaccine_name: string
          vet_practice_id: string | null
        }
        Insert: {
          administered_by?: string | null
          batch_number?: string | null
          created_at?: string
          date_administered: string
          doctor_name?: string | null
          dog_id: string
          health_product_id?: string | null
          id?: string
          next_due_date?: string | null
          notes?: string | null
          schedule_type?: string | null
          treatment_type?: string | null
          vaccine_name: string
          vet_practice_id?: string | null
        }
        Update: {
          administered_by?: string | null
          batch_number?: string | null
          created_at?: string
          date_administered?: string
          doctor_name?: string | null
          dog_id?: string
          health_product_id?: string | null
          id?: string
          next_due_date?: string | null
          notes?: string | null
          schedule_type?: string | null
          treatment_type?: string | null
          vaccine_name?: string
          vet_practice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vaccinations_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccinations_health_product_id_fkey"
            columns: ["health_product_id"]
            isOneToOne: false
            referencedRelation: "health_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccinations_vet_practice_id_fkey"
            columns: ["vet_practice_id"]
            isOneToOne: false
            referencedRelation: "vet_practices"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_practices: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          practice_name: string
          updated_at: string | null
          vet_names: string[] | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          practice_name: string
          updated_at?: string | null
          vet_names?: string[] | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          practice_name?: string
          updated_at?: string | null
          vet_names?: string[] | null
        }
        Relationships: []
      }
      vet_visits: {
        Row: {
          clinic_name: string | null
          cost: number | null
          created_at: string | null
          diagnosis: string | null
          doctor_name: string | null
          dog_id: string
          follow_up_date: string | null
          id: string
          medications: string | null
          next_due_date: string | null
          notes: string | null
          reason: string
          schedule_type: string | null
          treatment: string | null
          vet_name: string | null
          vet_practice_id: string | null
          visit_date: string
        }
        Insert: {
          clinic_name?: string | null
          cost?: number | null
          created_at?: string | null
          diagnosis?: string | null
          doctor_name?: string | null
          dog_id: string
          follow_up_date?: string | null
          id?: string
          medications?: string | null
          next_due_date?: string | null
          notes?: string | null
          reason: string
          schedule_type?: string | null
          treatment?: string | null
          vet_name?: string | null
          vet_practice_id?: string | null
          visit_date: string
        }
        Update: {
          clinic_name?: string | null
          cost?: number | null
          created_at?: string | null
          diagnosis?: string | null
          doctor_name?: string | null
          dog_id?: string
          follow_up_date?: string | null
          id?: string
          medications?: string | null
          next_due_date?: string | null
          notes?: string | null
          reason?: string
          schedule_type?: string | null
          treatment?: string | null
          vet_name?: string | null
          vet_practice_id?: string | null
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_visits_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_visits_vet_practice_id_fkey"
            columns: ["vet_practice_id"]
            isOneToOne: false
            referencedRelation: "vet_practices"
            referencedColumns: ["id"]
          },
        ]
      }
      video_bundle_purchases: {
        Row: {
          amount_paid: number | null
          bundle_id: string
          client_id: string
          id: string
          payment_reference: string | null
          purchased_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          bundle_id: string
          client_id: string
          id?: string
          payment_reference?: string | null
          purchased_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          bundle_id?: string
          client_id?: string
          id?: string
          payment_reference?: string | null
          purchased_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_bundle_purchases_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "video_bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_bundles: {
        Row: {
          created_at: string | null
          currency: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: []
      }
      video_watch_progress: {
        Row: {
          client_id: string
          completed: boolean
          id: string
          last_watched_at: string | null
          video_id: string
          watched_seconds: number
        }
        Insert: {
          client_id: string
          completed?: boolean
          id?: string
          last_watched_at?: string | null
          video_id: string
          watched_seconds?: number
        }
        Update: {
          client_id?: string
          completed?: boolean
          id?: string
          last_watched_at?: string | null
          video_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_watch_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "training_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      waiting_list: {
        Row: {
          admin_notes: string | null
          application_id: string | null
          assigned_dog_id: string | null
          assigned_litter_id: string | null
          balance_invoice_id: string | null
          client_id: string | null
          contacted_count: number
          created_at: string
          date_added: string
          deposit_amount: number | null
          deposit_invoice_id: string | null
          deposit_paid_date: string | null
          do_not_sell_reason: string | null
          ear_preference: string | null
          enquirer_country: string | null
          enquirer_email: string | null
          enquirer_name: string | null
          enquirer_phone: string | null
          follow_up_date: string | null
          hold_reason: string | null
          hold_until: string | null
          id: string
          internal_flags: string[] | null
          last_contact_date: string | null
          list_type_id: string | null
          payment_status: string
          pipeline_stage: string
          position: number
          preference_notes: string | null
          preferred_category: string | null
          preferred_colour: string | null
          preferred_sex: string | null
          priority: string
          quote_expires_date: string | null
          quote_id: string | null
          quote_sent_date: string | null
          quoted_price: number | null
          registration_type: string | null
          source: string | null
          stage_updated_at: string | null
          stage_updated_by: string | null
          status: string
          tail_preference: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          application_id?: string | null
          assigned_dog_id?: string | null
          assigned_litter_id?: string | null
          balance_invoice_id?: string | null
          client_id?: string | null
          contacted_count?: number
          created_at?: string
          date_added?: string
          deposit_amount?: number | null
          deposit_invoice_id?: string | null
          deposit_paid_date?: string | null
          do_not_sell_reason?: string | null
          ear_preference?: string | null
          enquirer_country?: string | null
          enquirer_email?: string | null
          enquirer_name?: string | null
          enquirer_phone?: string | null
          follow_up_date?: string | null
          hold_reason?: string | null
          hold_until?: string | null
          id?: string
          internal_flags?: string[] | null
          last_contact_date?: string | null
          list_type_id?: string | null
          payment_status?: string
          pipeline_stage?: string
          position?: number
          preference_notes?: string | null
          preferred_category?: string | null
          preferred_colour?: string | null
          preferred_sex?: string | null
          priority?: string
          quote_expires_date?: string | null
          quote_id?: string | null
          quote_sent_date?: string | null
          quoted_price?: number | null
          registration_type?: string | null
          source?: string | null
          stage_updated_at?: string | null
          stage_updated_by?: string | null
          status?: string
          tail_preference?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          application_id?: string | null
          assigned_dog_id?: string | null
          assigned_litter_id?: string | null
          balance_invoice_id?: string | null
          client_id?: string | null
          contacted_count?: number
          created_at?: string
          date_added?: string
          deposit_amount?: number | null
          deposit_invoice_id?: string | null
          deposit_paid_date?: string | null
          do_not_sell_reason?: string | null
          ear_preference?: string | null
          enquirer_country?: string | null
          enquirer_email?: string | null
          enquirer_name?: string | null
          enquirer_phone?: string | null
          follow_up_date?: string | null
          hold_reason?: string | null
          hold_until?: string | null
          id?: string
          internal_flags?: string[] | null
          last_contact_date?: string | null
          list_type_id?: string | null
          payment_status?: string
          pipeline_stage?: string
          position?: number
          preference_notes?: string | null
          preferred_category?: string | null
          preferred_colour?: string | null
          preferred_sex?: string | null
          priority?: string
          quote_expires_date?: string | null
          quote_id?: string | null
          quote_sent_date?: string | null
          quoted_price?: number | null
          registration_type?: string | null
          source?: string | null
          stage_updated_at?: string | null
          stage_updated_by?: string | null
          status?: string
          tail_preference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiting_list_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_assigned_dog_id_fkey"
            columns: ["assigned_dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_assigned_litter_id_fkey"
            columns: ["assigned_litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_balance_invoice_id_fkey"
            columns: ["balance_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_deposit_invoice_id_fkey"
            columns: ["deposit_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_list_type_id_fkey"
            columns: ["list_type_id"]
            isOneToOne: false
            referencedRelation: "waiting_list_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_stage_updated_by_fkey"
            columns: ["stage_updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      waiting_list_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_stage: string | null
          id: string
          notes: string | null
          to_stage: string
          waiting_list_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          to_stage: string
          waiting_list_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_stage?: string | null
          id?: string
          notes?: string | null
          to_stage?: string
          waiting_list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiting_list_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_history_waiting_list_id_fkey"
            columns: ["waiting_list_id"]
            isOneToOne: false
            referencedRelation: "waiting_list"
            referencedColumns: ["id"]
          },
        ]
      }
      waiting_list_types: {
        Row: {
          colour: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          colour?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          colour?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          created_at: string
          dog_id: string
          id: string
          notes: string | null
          recorded_at: string | null
          recorded_date: string
          session: string | null
          weight_kg: number
          weight_kg_original: number | null
          weight_kg_reconstructed: number | null
        }
        Insert: {
          created_at?: string
          dog_id: string
          id?: string
          notes?: string | null
          recorded_at?: string | null
          recorded_date?: string
          session?: string | null
          weight_kg: number
          weight_kg_original?: number | null
          weight_kg_reconstructed?: number | null
        }
        Update: {
          created_at?: string
          dog_id?: string
          id?: string
          notes?: string | null
          recorded_at?: string | null
          recorded_date?: string
          session?: string | null
          weight_kg?: number
          weight_kg_original?: number | null
          weight_kg_reconstructed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weight_logs_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      finance_category_summary: {
        Row: {
          amount: number | null
          category: string | null
          earliest_date: string | null
          latest_date: string | null
          record_count: number | null
          record_type: string | null
          tax: number | null
          total_amount: number | null
        }
        Relationships: []
      }
      finance_grand_total: {
        Row: {
          net_position: number | null
          total_expenses: number | null
          total_income: number | null
        }
        Relationships: []
      }
      finance_summary: {
        Row: {
          confirmed_income: number | null
          invoice_count: number | null
          month: string | null
          total_invoiced: number | null
          total_received: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_quote: { Args: { p_quote_id: string }; Returns: undefined }
      calculate_litter_dates: {
        Args: { p_mating_date?: string; p_ovulation_date?: string }
        Returns: {
          go_home_earliest: string
          go_home_latest: string
          whelp_earliest: string
          whelp_expected: string
          whelp_latest: string
        }[]
      }
      calculate_next_due_date: {
        Args: { p_date: string; p_schedule_type: string }
        Returns: string
      }
      calculate_next_heat_prediction: {
        Args: { p_dog_id: string }
        Returns: string
      }
      client_owns_quote: { Args: { p_quote_id: string }; Returns: boolean }
      convert_quote_to_invoice: {
        Args: { p_quote_id: string }
        Returns: string
      }
      decline_quote: {
        Args: { p_quote_id: string; p_reason?: string }
        Returns: undefined
      }
      evaluate_pairing: {
        Args: { p_dam_id: string; p_sire_id: string }
        Returns: {
          allowed: boolean
          coi_estimate: number
          reasons: string[]
          severity: string
        }[]
      }
      get_ancestors: {
        Args: { p_depth?: number; p_dog_id: string }
        Returns: {
          ancestor_id: string
          depth: number
          path: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_trainer_or_above: { Args: never; Returns: boolean }
      my_dog_ids: { Args: never; Returns: string[] }
      my_dog_lineage: {
        Args: { target_dog_id: string }
        Returns: {
          parent_id: string
          role: string
        }[]
      }
      my_dog_parent_ids: { Args: never; Returns: string[] }
      sign_contract_as_client: {
        Args: {
          p_contract_id: string
          p_device: string
          p_ip?: string
          p_signature_url: string
        }
        Returns: undefined
      }
      trigger_birthday_greetings_check: { Args: never; Returns: undefined }
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
  public: {
    Enums: {},
  },
} as const

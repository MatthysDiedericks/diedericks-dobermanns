export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      applications: {
        Row: {
          address: string | null
          admin_notes: string | null
          agreed_microchip_policy: boolean
          agreed_no_breeding_rights: boolean
          agreed_no_resale: boolean
          agreed_right_of_recall: boolean
          agreed_to_terms: boolean
          agreed_welfare_commitment: boolean
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
          delivery_acknowledged: boolean
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
          reviewed_at: string | null
          reviewed_by: string | null
          security_requirements: string | null
          sleeping_arrangement: string | null
          special_requests: string | null
          specific_dog_id: string | null
          status: string
          tail_preference: string | null
          training_planned: boolean
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
          agreed_microchip_policy?: boolean
          agreed_no_breeding_rights?: boolean
          agreed_no_resale?: boolean
          agreed_right_of_recall?: boolean
          agreed_to_terms?: boolean
          agreed_welfare_commitment?: boolean
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
          delivery_acknowledged?: boolean
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
          reviewed_at?: string | null
          reviewed_by?: string | null
          security_requirements?: string | null
          sleeping_arrangement?: string | null
          special_requests?: string | null
          specific_dog_id?: string | null
          status?: string
          tail_preference?: string | null
          training_planned?: boolean
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
          agreed_microchip_policy?: boolean
          agreed_no_breeding_rights?: boolean
          agreed_no_resale?: boolean
          agreed_right_of_recall?: boolean
          agreed_to_terms?: boolean
          agreed_welfare_commitment?: boolean
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
          delivery_acknowledged?: boolean
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
          reviewed_at?: string | null
          reviewed_by?: string | null
          security_requirements?: string | null
          sleeping_arrangement?: string | null
          special_requests?: string | null
          specific_dog_id?: string | null
          status?: string
          tail_preference?: string | null
          training_planned?: boolean
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
      contracts: {
        Row: {
          body_html: string | null
          client_id: string
          client_ip_on_sign: string | null
          contract_title: string | null
          created_at: string
          document_url: string | null
          dog_id: string | null
          esign_expires_at: string | null
          esign_sent_at: string | null
          esign_token: string | null
          id: string
          notes: string | null
          reservation_id: string | null
          signed_at: string | null
          signed_by_breeder: boolean | null
          signed_by_client: boolean
          status: string | null
          template_id: string | null
        }
        Insert: {
          body_html?: string | null
          client_id: string
          client_ip_on_sign?: string | null
          contract_title?: string | null
          created_at?: string
          document_url?: string | null
          dog_id?: string | null
          esign_expires_at?: string | null
          esign_sent_at?: string | null
          esign_token?: string | null
          id?: string
          notes?: string | null
          reservation_id?: string | null
          signed_at?: string | null
          signed_by_breeder?: boolean | null
          signed_by_client?: boolean
          status?: string | null
          template_id?: string | null
        }
        Update: {
          body_html?: string | null
          client_id?: string
          client_ip_on_sign?: string | null
          contract_title?: string | null
          created_at?: string
          document_url?: string | null
          dog_id?: string | null
          esign_expires_at?: string | null
          esign_sent_at?: string | null
          esign_token?: string | null
          id?: string
          notes?: string | null
          reservation_id?: string | null
          signed_at?: string | null
          signed_by_breeder?: boolean | null
          signed_by_client?: boolean
          status?: string | null
          template_id?: string | null
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
            foreignKeyName: "contracts_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
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
        ]
      }
      dog_media: {
        Row: {
          caption: string | null
          dog_id: string
          id: string
          is_primary: boolean
          sort_order: number
          thumbnail_url: string | null
          type: string
          uploaded_at: string
          url: string
        }
        Insert: {
          caption?: string | null
          dog_id: string
          id?: string
          is_primary?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          type: string
          uploaded_at?: string
          url: string
        }
        Update: {
          caption?: string | null
          dog_id?: string
          id?: string
          is_primary?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          type?: string
          uploaded_at?: string
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
      dog_temperament_scores: {
        Row: {
          id: string
          dog_id: string
          assessed_by: string | null
          assessed_at: string
          evaluation_standard: string
          nerve_stability: number | null
          drive_and_energy: number | null
          courage: number | null
          hardness: number | null
          environmental_confidence: number | null
          working_willingness: number | null
          social_behavior: number | null
          obedience: number | null
          total_score: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          dog_id: string
          assessed_by?: string | null
          assessed_at?: string
          evaluation_standard?: string
          nerve_stability?: number | null
          drive_and_energy?: number | null
          courage?: number | null
          hardness?: number | null
          environmental_confidence?: number | null
          working_willingness?: number | null
          social_behavior?: number | null
          obedience?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          dog_id?: string
          assessed_by?: string | null
          assessed_at?: string
          evaluation_standard?: string
          nerve_stability?: number | null
          drive_and_energy?: number | null
          courage?: number | null
          hardness?: number | null
          environmental_confidence?: number | null
          working_willingness?: number | null
          social_behavior?: number | null
          obedience?: number | null
          notes?: string | null
          created_at?: string
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
          start_date: string
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
          start_date: string
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
          start_date?: string
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
        }
        Insert: {
          created_at?: string
          dog_id: string
          id?: string
          notes?: string | null
          recorded_at?: string | null
          recorded_date: string
          session?: string | null
          weight_kg: number
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
      contacts: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          contact_type: string
          country: string | null
          created_at: string
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
          updated_at: string
          user_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          contact_type?: string
          country?: string | null
          created_at?: string
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
          updated_at?: string
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          contact_type?: string
          country?: string | null
          created_at?: string
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
          updated_at?: string
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_interactions: {
        Row: {
          id: string
          contact_id: string
          logged_by: string | null
          interaction_type: string
          direction: string
          subject: string | null
          body: string | null
          interaction_date: string
          created_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          logged_by?: string | null
          interaction_type: string
          direction?: string
          subject?: string | null
          body?: string | null
          interaction_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          contact_id?: string
          logged_by?: string | null
          interaction_type?: string
          direction?: string
          subject?: string | null
          body?: string | null
          interaction_date?: string
          created_at?: string
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
      deworming_records: {
        Row: {
          created_at: string
          created_by: string | null
          date_treated: string
          dog_ids: string[]
          doctor_name: string | null
          health_product_id: string | null
          id: string
          next_due_date: string | null
          notes: string | null
          product_name: string | null
          schedule_type: string | null
          treatment_type: string
          vet_practice_id: string | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_treated: string
          dog_ids: string[]
          doctor_name?: string | null
          health_product_id?: string | null
          id?: string
          next_due_date?: string | null
          notes?: string | null
          product_name?: string | null
          schedule_type?: string | null
          treatment_type: string
          vet_practice_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_treated?: string
          dog_ids?: string[]
          doctor_name?: string | null
          health_product_id?: string | null
          id?: string
          next_due_date?: string | null
          notes?: string | null
          product_name?: string | null
          schedule_type?: string | null
          treatment_type?: string
          vet_practice_id?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      dogs: {
        Row: {
          bloodline: string | null
          breed: string
          breeding_status: string | null
          call_name: string | null
          category: string
          coat_type: string | null
          colour: string | null
          collar_colour: string | null
          birth_weight_grams: number | null
          created_at: string
          dna_number: string | null
          ear_type: string | null
          eye_colour: string | null
          genetics_b_locus: string | null
          genetics_d_locus: string | null
          genetics_dcm1_status: string | null
          genetics_dcm2_status: string | null
          genetics_notes: string | null
          genetics_vwd_status: string | null
          height_cm: number | null
          body_length_cm: number | null
          chest_depth_cm: number | null
          chest_girth_cm: number | null
          standard: string | null
          bloodline_type: string | null
          insurance_number: string | null
          is_spayed_neutered: boolean
          location: string | null
          owner_id: string | null
          passport_number: string | null
          registration_type: string | null
          tattoo_number: string | null
          wrights_coi: number | null
          date_of_birth: string | null
          dcm_status: string | null
          description: string | null
          elbow_score: string | null
          father_id: string | null
          generation: number | null
          health_dcm1: string | null
          health_dcm2: string | null
          health_dcm3: string | null
          health_dcm4: string | null
          health_dcm5: string | null
          health_ed: string | null
          health_hd: string | null
          health_tested: boolean
          hip_score: string | null
          holter_date: string | null
          holter_result: string | null
          id: string
          is_featured: boolean
          is_public: boolean
          line: string | null
          litter_id: string | null
          microchip_number: string | null
          mother_id: string | null
          name: string
          new_owner_name: string | null
          notes: string | null
          origin_pairing_id: string | null
          pedigree: Json | null
          pedigree_url: string | null
          price: number | null
          registration_number: string | null
          reserved_for_name: string | null
          sex: string | null
          status: string
          temperament_notes: string | null
          training_notes: string | null
          updated_at: string
          urgency_flag: boolean
          breeding_role: string | null
        }
        Insert: {
          bloodline?: string | null
          breed?: string
          call_name?: string | null
          category?: string
          coat_type?: string | null
          colour?: string | null
          collar_colour?: string | null
          birth_weight_grams?: number | null
          created_at?: string
          dna_number?: string | null
          ear_type?: string | null
          eye_colour?: string | null
          genetics_b_locus?: string | null
          genetics_d_locus?: string | null
          genetics_dcm1_status?: string | null
          genetics_dcm2_status?: string | null
          genetics_notes?: string | null
          genetics_vwd_status?: string | null
          height_cm?: number | null
          body_length_cm?: number | null
          chest_depth_cm?: number | null
          chest_girth_cm?: number | null
          standard?: string | null
          bloodline_type?: string | null
          insurance_number?: string | null
          is_spayed_neutered?: boolean
          location?: string | null
          passport_number?: string | null
          registration_type?: string | null
          tattoo_number?: string | null
          wrights_coi?: number | null
          date_of_birth?: string | null
          dcm_status?: string | null
          description?: string | null
          elbow_score?: string | null
          father_id?: string | null
          generation?: number | null
          health_dcm1?: string | null
          health_dcm2?: string | null
          health_dcm3?: string | null
          health_dcm4?: string | null
          health_dcm5?: string | null
          health_ed?: string | null
          health_hd?: string | null
          health_tested?: boolean
          hip_score?: string | null
          holter_date?: string | null
          holter_result?: string | null
          id?: string
          is_featured?: boolean
          is_public?: boolean
          line?: string | null
          litter_id?: string | null
          microchip_number?: string | null
          mother_id?: string | null
          name: string
          notes?: string | null
          origin_pairing_id?: string | null
          pedigree?: Json | null
          pedigree_url?: string | null
          price?: number | null
          sex?: string | null
          status?: string
          temperament_notes?: string | null
          training_notes?: string | null
          updated_at?: string
          urgency_flag?: boolean
          breeding_role?: string | null
        }
        Update: {
          bloodline?: string | null
          breed?: string
          call_name?: string | null
          category?: string
          coat_type?: string | null
          colour?: string | null
          collar_colour?: string | null
          birth_weight_grams?: number | null
          created_at?: string
          dna_number?: string | null
          ear_type?: string | null
          eye_colour?: string | null
          genetics_b_locus?: string | null
          genetics_d_locus?: string | null
          genetics_dcm1_status?: string | null
          genetics_dcm2_status?: string | null
          genetics_notes?: string | null
          genetics_vwd_status?: string | null
          height_cm?: number | null
          body_length_cm?: number | null
          chest_depth_cm?: number | null
          chest_girth_cm?: number | null
          standard?: string | null
          bloodline_type?: string | null
          insurance_number?: string | null
          is_spayed_neutered?: boolean
          location?: string | null
          passport_number?: string | null
          registration_type?: string | null
          tattoo_number?: string | null
          wrights_coi?: number | null
          date_of_birth?: string | null
          dcm_status?: string | null
          description?: string | null
          elbow_score?: string | null
          father_id?: string | null
          generation?: number | null
          health_dcm1?: string | null
          health_dcm2?: string | null
          health_dcm3?: string | null
          health_dcm4?: string | null
          health_dcm5?: string | null
          health_ed?: string | null
          health_hd?: string | null
          health_tested?: boolean
          hip_score?: string | null
          holter_date?: string | null
          holter_result?: string | null
          id?: string
          is_featured?: boolean
          is_public?: boolean
          line?: string | null
          litter_id?: string | null
          microchip_number?: string | null
          mother_id?: string | null
          name?: string
          notes?: string | null
          origin_pairing_id?: string | null
          pedigree?: Json | null
          pedigree_url?: string | null
          price?: number | null
          sex?: string | null
          status?: string
          temperament_notes?: string | null
          training_notes?: string | null
          updated_at?: string
          urgency_flag?: boolean
          breeding_role?: string | null
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
            foreignKeyName: "dogs_mother_id_fkey"
            columns: ["mother_id"]
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
            foreignKeyName: "dog_timeline_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dog_timeline_author_id_fkey"
            columns: ["author_id"]
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
          id: string
          image_url: string | null
          is_featured: boolean
          sort_order: number
          title: string | null
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          sort_order?: number
          title?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          sort_order?: number
          title?: string | null
          video_url?: string | null
        }
        Relationships: []
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
            foreignKeyName: "pairings_sire_id_fkey"
            columns: ["sire_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pairings_dam_id_fkey"
            columns: ["dam_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      litters: {
        Row: {
          actual_date: string | null
          actual_time: string | null
          available_count: number | null
          created_at: string
          deceased_count: number
          description: string | null
          expected_date: string | null
          father_id: string | null
          female_count: number | null
          go_home_date: string | null
          go_home_weeks: number | null
          heat_cycle_id: string | null
          id: string
          is_public: boolean
          litter_letter: string | null
          male_count: number | null
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
          whelping_notes: string | null
          whelping_type: string | null
        }
        Insert: {
          actual_date?: string | null
          actual_time?: string | null
          available_count?: number | null
          created_at?: string
          deceased_count?: number
          description?: string | null
          expected_date?: string | null
          father_id?: string | null
          female_count?: number | null
          go_home_date?: string | null
          go_home_weeks?: number | null
          heat_cycle_id?: string | null
          id?: string
          is_public?: boolean
          litter_letter?: string | null
          male_count?: number | null
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
          whelping_notes?: string | null
          whelping_type?: string | null
        }
        Update: {
          actual_date?: string | null
          actual_time?: string | null
          available_count?: number | null
          created_at?: string
          deceased_count?: number
          description?: string | null
          expected_date?: string | null
          father_id?: string | null
          female_count?: number | null
          go_home_date?: string | null
          go_home_weeks?: number | null
          heat_cycle_id?: string | null
          id?: string
          is_public?: boolean
          litter_letter?: string | null
          male_count?: number | null
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
            foreignKeyName: "litters_mother_id_fkey"
            columns: ["mother_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      litter_media: {
        Row: {
          id: string
          litter_id: string | null
          dog_id: string | null
          media_type: string
          storage_path: string
          public_url: string
          caption: string | null
          sort_order: number | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          litter_id?: string | null
          dog_id?: string | null
          media_type: string
          storage_path: string
          public_url: string
          caption?: string | null
          sort_order?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          litter_id?: string | null
          dog_id?: string | null
          media_type?: string
          storage_path?: string
          public_url?: string
          caption?: string | null
          sort_order?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      litter_todos: {
        Row: {
          id: string
          litter_id: string | null
          dog_id: string | null
          due_date: string | null
          title: string
          description: string | null
          completed: boolean
          completed_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          litter_id?: string | null
          dog_id?: string | null
          due_date?: string | null
          title: string
          description?: string | null
          completed?: boolean
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          litter_id?: string | null
          dog_id?: string | null
          due_date?: string | null
          title?: string
          description?: string | null
          completed?: boolean
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      litter_transactions: {
        Row: {
          id: string
          litter_id: string | null
          transaction_date: string
          transaction_type: string
          category: string | null
          currency: string
          amounts_tax_mode: string | null
          invoice_number: string | null
          notes: string | null
          attachment_path: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          litter_id?: string | null
          transaction_date?: string
          transaction_type: string
          category?: string | null
          currency?: string
          amounts_tax_mode?: string | null
          invoice_number?: string | null
          notes?: string | null
          attachment_path?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          litter_id?: string | null
          transaction_date?: string
          transaction_type?: string
          category?: string | null
          currency?: string
          amounts_tax_mode?: string | null
          invoice_number?: string | null
          notes?: string | null
          attachment_path?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      litter_transaction_items: {
        Row: {
          id: string
          transaction_id: string | null
          dog_id: string | null
          description: string
          amount_cents: number
          tax_cents: number
          sort_order: number | null
        }
        Insert: {
          id?: string
          transaction_id?: string | null
          dog_id?: string | null
          description: string
          amount_cents?: number
          tax_cents?: number
          sort_order?: number | null
        }
        Update: {
          id?: string
          transaction_id?: string | null
          dog_id?: string | null
          description?: string
          amount_cents?: number
          tax_cents?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      puppy_health_records: {
        Row: {
          id: string
          litter_id: string | null
          dog_id: string | null
          record_type: string
          record_date: string
          type_label: string
          description: string
          notes: string | null
          administered_by: string | null
          next_due_date: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          litter_id?: string | null
          dog_id?: string | null
          record_type: string
          record_date: string
          type_label: string
          description: string
          notes?: string | null
          administered_by?: string | null
          next_due_date?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          litter_id?: string | null
          dog_id?: string | null
          record_type?: string
          record_date?: string
          type_label?: string
          description?: string
          notes?: string | null
          administered_by?: string | null
          next_due_date?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      puppy_sharing: {
        Row: {
          id: string
          dog_id: string | null
          is_public_page: boolean
          is_pedigree_public: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          dog_id?: string | null
          is_public_page?: boolean
          is_pedigree_public?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          dog_id?: string | null
          is_public_page?: boolean
          is_pedigree_public?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      notifications_log: {
        Row: {
          body: string | null
          id: string
          recipient_id: string | null
          sent_at: string
          status: string
          subject: string | null
          type: string
        }
        Insert: {
          body?: string | null
          id?: string
          recipient_id?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
          type: string
        }
        Update: {
          body?: string | null
          id?: string
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
      training_logs: {
        Row: {
          created_at: string
          dog_id: string
          duration_minutes: number | null
          id: string
          milestone: string | null
          notes: string | null
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
          milestone?: string | null
          notes?: string | null
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
          milestone?: string | null
          notes?: string | null
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
        Relationships: []
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
        Relationships: []
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
        ]
      }
      waiting_list: {
        Row: {
          client_id: string
          created_at: string
          expected_delivery_date: string | null
          feedback: string | null
          follow_up_date: string | null
          id: string
          litter_id: string | null
          pipeline_stage: string | null
          position: number | null
          preference_notes: string | null
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          expected_delivery_date?: string | null
          feedback?: string | null
          id?: string
          litter_id?: string | null
          position?: number | null
          preference_notes?: string | null
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          expected_delivery_date?: string | null
          feedback?: string | null
          id?: string
          litter_id?: string | null
          position?: number | null
          preference_notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiting_list_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          application_id: string | null
          client_id: string | null
          created_at: string
          currency: string
          discount: number
          id: string
          notes: string | null
          quote_number: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          application_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          notes?: string | null
          quote_number?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          application_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          notes?: string | null
          quote_number?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
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
        ]
      }
      quote_items: {
        Row: {
          description: string
          dog_id: string | null
          id: string
          item_type: string
          line_total: number
          quantity: number
          quote_id: string
          sort_order: number
          unit_price: number
        }
        Insert: {
          description: string
          dog_id?: string | null
          id?: string
          item_type?: string
          line_total?: number
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
          line_total?: number
          quantity?: number
          quote_id?: string
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          colour: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          colour?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          colour?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      budgets: {
        Row: {
          id: string
          year: number
          month: number | null
          category_id: string | null
          label: string | null
          budget_type: string
          budgeted_amount: number
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          year: number
          month?: number | null
          category_id?: string | null
          label?: string | null
          budget_type?: string
          budgeted_amount?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          year?: number
          month?: number | null
          category_id?: string | null
          label?: string | null
          budget_type?: string
          budgeted_amount?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
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
      expenses: {
        Row: {
          amount: number
          allocation_type: string
          category_id: string
          created_at: string
          creditor_name: string | null
          currency: string | null
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
          status: string | null
          supplier_name: string | null
          updated_at: string
          vat_amount: number | null
          vat_applicable: boolean
          vat_rate: number | null
        }
        Insert: {
          amount: number
          allocation_type?: string
          category_id: string
          created_at?: string
          creditor_name?: string | null
          currency?: string | null
          description: string
          dog_id?: string | null
          expense_date: string
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
          status?: string | null
          supplier_name?: string | null
          updated_at?: string
          vat_amount?: number | null
          vat_applicable?: boolean
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          allocation_type?: string
          category_id?: string
          created_at?: string
          creditor_name?: string | null
          currency?: string | null
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
          status?: string | null
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
        ]
      }
      invoices: {
        Row: {
          amount_outstanding: number
          amount_paid: number
          client_id: string | null
          created_at: string
          currency: string
          discount_amount: number
          dog_id: string | null
          due_date: string | null
          id: string
          internal_notes: string | null
          invoice_number: string
          issue_date: string
          litter_id: string | null
          notes: string | null
          paid_date: string | null
          reservation_id: string | null
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_outstanding?: never
          amount_paid?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          dog_id?: string | null
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          invoice_number?: string
          issue_date?: string
          litter_id?: string | null
          notes?: string | null
          paid_date?: string | null
          reservation_id?: string | null
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_outstanding?: never
          amount_paid?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          dog_id?: string | null
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          invoice_number?: string
          issue_date?: string
          litter_id?: string | null
          notes?: string | null
          paid_date?: string | null
          reservation_id?: string | null
          status?: string
          subtotal?: number
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
            foreignKeyName: "invoices_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_litter_id_fkey"
            columns: ["litter_id"]
            isOneToOne: false
            referencedRelation: "litters"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          item_type: string
          line_total: number
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          item_type?: string
          line_total?: never
          quantity?: number
          sort_order?: number
          unit_price: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          item_type?: string
          line_total?: never
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
          payment_date: string
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
          heat_end_date: string | null
          heat_start_date: string
          id: string
          is_predicted: boolean
          mating_date: string | null
          mating_type: string | null
          notes: string | null
          ovulation_date: string | null
          proestrus_start_date: string | null
          progesterone_tests: Json | null
          resulting_litter_id: string | null
          sire_id: string | null
          status: string
          updated_at: string
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
          heat_end_date?: string | null
          heat_start_date: string
          id?: string
          is_predicted?: boolean
          mating_date?: string | null
          mating_type?: string | null
          notes?: string | null
          ovulation_date?: string | null
          proestrus_start_date?: string | null
          progesterone_tests?: Json | null
          resulting_litter_id?: string | null
          sire_id?: string | null
          status?: string
          updated_at?: string
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
          heat_end_date?: string | null
          heat_start_date?: string
          id?: string
          is_predicted?: boolean
          mating_date?: string | null
          mating_type?: string | null
          notes?: string | null
          ovulation_date?: string | null
          proestrus_start_date?: string | null
          progesterone_tests?: Json | null
          resulting_litter_id?: string | null
          sire_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "heat_cycles_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      breed_heat_defaults: {
        Row: {
          id: string
          breed: string
          avg_cycle_days: number
          ovulation_offset_days: number
          proestrus_days: number
          estrus_days: number
          diestrus_days: number | null
          anestrus_days: number | null
          gestation_days: number
          created_at: string
        }
        Insert: {
          id?: string
          breed: string
          avg_cycle_days?: number
          ovulation_offset_days?: number
          proestrus_days?: number
          estrus_days?: number
          diestrus_days?: number | null
          anestrus_days?: number | null
          gestation_days?: number
          created_at?: string
        }
        Update: {
          id?: string
          breed?: string
          avg_cycle_days?: number
          ovulation_offset_days?: number
          proestrus_days?: number
          estrus_days?: number
          diestrus_days?: number | null
          anestrus_days?: number | null
          gestation_days?: number
          created_at?: string
        }
        Relationships: []
      }
      todo_items: {
        Row: {
          application_id: string | null
          assigned_to: string | null
          booking_id: string | null
          category: string
          completed_at: string | null
          created_at: string
          description: string | null
          dog_id: string | null
          due_date: string | null
          id: string
          is_completed: boolean
          litter_id: string | null
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          assigned_to?: string | null
          booking_id?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          dog_id?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          litter_id?: string | null
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          assigned_to?: string | null
          booking_id?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          dog_id?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          litter_id?: string | null
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      health_products: {
        Row: {
          category: string
          created_at: string
          default_schedule_type: string | null
          id: string
          is_active: boolean
          manufacturer: string | null
          product_name: string
        }
        Insert: {
          category: string
          created_at?: string
          default_schedule_type?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          product_name: string
        }
        Update: {
          category?: string
          created_at?: string
          default_schedule_type?: string | null
          id?: string
          is_active?: boolean
          manufacturer?: string | null
          product_name?: string
        }
        Relationships: []
      }
      vet_practices: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          phone: string | null
          practice_name: string
          vet_names: string[] | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          practice_name: string
          vet_names?: string[] | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          practice_name?: string
          vet_names?: string[] | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          dog_id: string | null
          end_date: string | null
          event_date: string
          event_type: string
          id: string
          is_completed: boolean
          is_reminder: boolean
          notes: string | null
          source_id: string | null
          source_table: string | null
          title: string
        }
        Insert: {
          created_at?: string
          dog_id?: string | null
          end_date?: string | null
          event_date: string
          event_type: string
          id?: string
          is_completed?: boolean
          is_reminder?: boolean
          notes?: string | null
          source_id?: string | null
          source_table?: string | null
          title: string
        }
        Update: {
          created_at?: string
          dog_id?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_completed?: boolean
          is_reminder?: boolean
          notes?: string | null
          source_id?: string | null
          source_table?: string | null
          title?: string
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          body_html: string
          contract_title: string
          created_at: string
          description: string | null
          dog_label: string
          id: string
          name: string
          party_1_label: string
          party_2_label: string
          updated_at: string
        }
        Insert: {
          body_html: string
          contract_title: string
          created_at?: string
          description?: string | null
          dog_label?: string
          id?: string
          name: string
          party_1_label?: string
          party_2_label?: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          contract_title?: string
          created_at?: string
          description?: string | null
          dog_label?: string
          id?: string
          name?: string
          party_1_label?: string
          party_2_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      vet_visits: {
        Row: {
          cost: number | null
          created_at: string
          created_by: string | null
          diagnosis: string | null
          doctor_name: string | null
          dog_id: string | null
          follow_up_date: string | null
          follow_up_required: boolean
          id: string
          medications: string | null
          next_due_date: string | null
          notes: string | null
          reason: string
          schedule_type: string | null
          treatment: string | null
          vet_clinic: string | null
          vet_name: string | null
          vet_practice_id: string | null
          visit_date: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          doctor_name?: string | null
          dog_id?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean
          id?: string
          medications?: string | null
          next_due_date?: string | null
          notes?: string | null
          reason: string
          schedule_type?: string | null
          treatment?: string | null
          vet_clinic?: string | null
          vet_name?: string | null
          vet_practice_id?: string | null
          visit_date: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          doctor_name?: string | null
          dog_id?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean
          id?: string
          medications?: string | null
          next_due_date?: string | null
          notes?: string | null
          reason?: string
          schedule_type?: string | null
          treatment?: string | null
          vet_clinic?: string | null
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
        ]
      }
      document_access_log: {
        Row: {
          id: string
          document_id: string
          accessed_by: string
          action: string
          accessed_at: string
        }
        Insert: {
          id?: string
          document_id: string
          accessed_by: string
          action: string
          accessed_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          accessed_by?: string
          action?: string
          accessed_at?: string
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
          id: string
          entity_type: string
          entity_id: string
          document_name: string
          original_filename: string
          storage_path: string
          file_type: string
          category: string
          date_of_document: string | null
          expiry_date: string | null
          issued_by: string | null
          document_number: string | null
          description: string | null
          client_visible: boolean
          allowed_user_ids: string[] | null
          is_public: boolean
          uploaded_by: string | null
          uploaded_at: string
          file_size_bytes: number | null
          mime_type: string | null
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          document_name: string
          original_filename: string
          storage_path: string
          file_type: string
          category: string
          date_of_document?: string | null
          expiry_date?: string | null
          issued_by?: string | null
          document_number?: string | null
          description?: string | null
          client_visible?: boolean
          allowed_user_ids?: string[] | null
          is_public?: boolean
          uploaded_by?: string | null
          uploaded_at?: string
          file_size_bytes?: number | null
          mime_type?: string | null
        }
        Update: {
          id?: string
          entity_type?: string
          entity_id?: string
          document_name?: string
          original_filename?: string
          storage_path?: string
          file_type?: string
          category?: string
          date_of_document?: string | null
          expiry_date?: string | null
          issued_by?: string | null
          document_number?: string | null
          description?: string | null
          client_visible?: boolean
          allowed_user_ids?: string[] | null
          is_public?: boolean
          uploaded_by?: string | null
          uploaded_at?: string
          file_size_bytes?: number | null
          mime_type?: string | null
        }
        Relationships: []
      }
      kennel_documents: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          file_size: number | null
          file_url: string
          id: string
          is_starred: boolean
          linked_dog_id: string | null
          linked_litter_id: string | null
          mime_type: string | null
          name: string
          notes: string | null
          original_filename: string
          storage_path: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          is_starred?: boolean
          mime_type?: string | null
          name: string
          notes?: string | null
          original_filename: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          is_starred?: boolean
          mime_type?: string | null
          name?: string
          notes?: string | null
          original_filename?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_ancestors: {
        Args: { p_dog_id: string; p_depth?: number }
        Returns: { ancestor_id: string; depth: number; path: string }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_trainer_or_above: { Args: never; Returns: boolean }
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

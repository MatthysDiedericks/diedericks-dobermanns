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
      applications: {
        Row: {
          address: string | null
          admin_notes: string | null
          agreed_to_terms: boolean
          children_ages: string | null
          city: string | null
          country: string
          created_at: string
          current_pets: string | null
          dog_interest: string | null
          email: string
          experience_with_dobermanns: string | null
          full_name: string
          has_secure_yard: boolean | null
          home_type: string | null
          id: string
          id_number: string | null
          litter_interest_id: string | null
          personal_reference_name: string | null
          personal_reference_phone: string | null
          phone: string
          province: string | null
          purpose: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          security_requirements: string | null
          specific_dog_id: string | null
          status: string
          updated_at: string
          user_id: string | null
          vet_name: string | null
          vet_phone: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          agreed_to_terms?: boolean
          children_ages?: string | null
          city?: string | null
          country: string
          created_at?: string
          current_pets?: string | null
          dog_interest?: string | null
          email: string
          experience_with_dobermanns?: string | null
          full_name: string
          has_secure_yard?: boolean | null
          home_type?: string | null
          id?: string
          id_number?: string | null
          litter_interest_id?: string | null
          personal_reference_name?: string | null
          personal_reference_phone?: string | null
          phone: string
          province?: string | null
          purpose?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          security_requirements?: string | null
          specific_dog_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          vet_name?: string | null
          vet_phone?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          agreed_to_terms?: boolean
          children_ages?: string | null
          city?: string | null
          country?: string
          created_at?: string
          current_pets?: string | null
          dog_interest?: string | null
          email?: string
          experience_with_dobermanns?: string | null
          full_name?: string
          has_secure_yard?: boolean | null
          home_type?: string | null
          id?: string
          id_number?: string | null
          litter_interest_id?: string | null
          personal_reference_name?: string | null
          personal_reference_phone?: string | null
          phone?: string
          province?: string | null
          purpose?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          security_requirements?: string | null
          specific_dog_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          vet_name?: string | null
          vet_phone?: string | null
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
      contracts: {
        Row: {
          client_id: string
          created_at: string
          document_url: string
          dog_id: string | null
          id: string
          notes: string | null
          reservation_id: string | null
          signed_at: string | null
          signed_by_client: boolean
        }
        Insert: {
          client_id: string
          created_at?: string
          document_url: string
          dog_id?: string | null
          id?: string
          notes?: string | null
          reservation_id?: string | null
          signed_at?: string | null
          signed_by_client?: boolean
        }
        Update: {
          client_id?: string
          created_at?: string
          document_url?: string
          dog_id?: string | null
          id?: string
          notes?: string | null
          reservation_id?: string | null
          signed_at?: string | null
          signed_by_client?: boolean
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
      dogs: {
        Row: {
          bloodline: string | null
          breed: string
          category: string
          colour: string | null
          created_at: string
          date_of_birth: string | null
          dcm_status: string | null
          description: string | null
          elbow_score: string | null
          father_id: string | null
          health_tested: boolean
          hip_score: string | null
          id: string
          is_featured: boolean
          is_public: boolean
          microchip_number: string | null
          mother_id: string | null
          name: string
          pedigree_url: string | null
          price: number | null
          sex: string | null
          status: string
          temperament_notes: string | null
          training_notes: string | null
          updated_at: string
        }
        Insert: {
          bloodline?: string | null
          breed?: string
          category?: string
          colour?: string | null
          created_at?: string
          date_of_birth?: string | null
          dcm_status?: string | null
          description?: string | null
          elbow_score?: string | null
          father_id?: string | null
          health_tested?: boolean
          hip_score?: string | null
          id?: string
          is_featured?: boolean
          is_public?: boolean
          microchip_number?: string | null
          mother_id?: string | null
          name: string
          pedigree_url?: string | null
          price?: number | null
          sex?: string | null
          status?: string
          temperament_notes?: string | null
          training_notes?: string | null
          updated_at?: string
        }
        Update: {
          bloodline?: string | null
          breed?: string
          category?: string
          colour?: string | null
          created_at?: string
          date_of_birth?: string | null
          dcm_status?: string | null
          description?: string | null
          elbow_score?: string | null
          father_id?: string | null
          health_tested?: boolean
          hip_score?: string | null
          id?: string
          is_featured?: boolean
          is_public?: boolean
          microchip_number?: string | null
          mother_id?: string | null
          name?: string
          pedigree_url?: string | null
          price?: number | null
          sex?: string | null
          status?: string
          temperament_notes?: string | null
          training_notes?: string | null
          updated_at?: string
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
      litters: {
        Row: {
          actual_date: string | null
          available_count: number | null
          created_at: string
          description: string | null
          expected_date: string | null
          father_id: string | null
          id: string
          is_public: boolean
          mother_id: string | null
          name: string | null
          puppy_count: number | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_date?: string | null
          available_count?: number | null
          created_at?: string
          description?: string | null
          expected_date?: string | null
          father_id?: string | null
          id?: string
          is_public?: boolean
          mother_id?: string | null
          name?: string | null
          puppy_count?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_date?: string | null
          available_count?: number | null
          created_at?: string
          description?: string | null
          expected_date?: string | null
          father_id?: string | null
          id?: string
          is_public?: boolean
          mother_id?: string | null
          name?: string | null
          puppy_count?: number | null
          status?: string
          updated_at?: string
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
      users: {
        Row: {
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          expo_push_token: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          expo_push_token?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          expo_push_token?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      vaccinations: {
        Row: {
          administered_by: string | null
          batch_number: string | null
          created_at: string
          date_administered: string
          dog_id: string
          id: string
          next_due_date: string | null
          notes: string | null
          vaccine_name: string
        }
        Insert: {
          administered_by?: string | null
          batch_number?: string | null
          created_at?: string
          date_administered: string
          dog_id: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          vaccine_name: string
        }
        Update: {
          administered_by?: string | null
          batch_number?: string | null
          created_at?: string
          date_administered?: string
          dog_id?: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          vaccine_name?: string
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
          id: string
          litter_id: string | null
          position: number | null
          preference_notes: string | null
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          litter_id?: string | null
          position?: number | null
          preference_notes?: string | null
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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

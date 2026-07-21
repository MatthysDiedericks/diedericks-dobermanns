import type { Database } from '@/types/database.types';

/**
 * Permissive Supabase schema used by the mobile app client.
 * The checked-in generated `database.types.ts` covers Phase 9 core tables only;
 * the live database has many additional tables/columns used by kennel admin code.
 */
type LooseTable = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Row: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Insert: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Update: any;
  Relationships: [];
};

export type AppDatabase = {
  public: {
    Tables: Record<string, LooseTable>;
    Views: Database['public']['Views'];
    Functions: Database['public']['Functions'] & {
      get_ancestors: {
        Args: { p_dog_id: string; p_depth?: number };
        Returns: { ancestor_id: string; depth: number; path: string }[];
      };
      sign_contract_as_client: {
        Args: { p_contract_id: string; p_signature_url: string; p_device: string; p_ip: string | null };
        Returns: void;
      };
      convert_quote_to_invoice: {
        Args: { p_quote_id: string };
        Returns: string;
      };
    };
    Enums: Database['public']['Enums'];
    CompositeTypes: Database['public']['CompositeTypes'];
  };
};

export type AppTablesInsert<T extends string> = AppDatabase['public']['Tables'][T]['Insert'];
export type AppTablesUpdate<T extends string> = AppDatabase['public']['Tables'][T]['Update'];

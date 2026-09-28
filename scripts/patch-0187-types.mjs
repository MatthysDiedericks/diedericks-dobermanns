/**
 * One-off patch for 0187 types. Run:
 *   node scripts/patch-0187-types.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  path.join(root, "diedericksdobermann-web/src/types/database.types.ts"),
  path.join(root, "diedericks-dobermanns/types/database.types.ts"),
];

const productsTable = `      products: {
        Row: {
          category: string
          cost_price: number
          created_at: string
          id: string
          image_path: string | null
          is_active: boolean
          is_client_visible: boolean
          name: string
          reorder_level: number
          sell_price: number
          short_description: string | null
          sku: string
          unit: string
          updated_at: string
          updated_by: string | null
          vat_rate: number
        }
        Insert: {
          category: string
          cost_price?: number
          created_at?: string
          id?: string
          image_path?: string | null
          is_active?: boolean
          is_client_visible?: boolean
          name: string
          reorder_level?: number
          sell_price?: number
          short_description?: string | null
          sku: string
          unit: string
          updated_at?: string
          updated_by?: string | null
          vat_rate?: number
        }
        Update: {
          category?: string
          cost_price?: number
          created_at?: string
          id?: string
          image_path?: string | null
          is_active?: boolean
          is_client_visible?: boolean
          name?: string
          reorder_level?: number
          sell_price?: number
          short_description?: string | null
          sku?: string
          unit?: string
          updated_at?: string
          updated_by?: string | null
          vat_rate?: number
        }
        Relationships: []
      }
`;

const stockTables = `      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          dog_id: string | null
          id: string
          invoice_id: string | null
          litter_id: string | null
          movement_type: string
          occurred_at: string
          product_id: string
          quantity: number
          reason: string | null
          receipt_id: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dog_id?: string | null
          id?: string
          invoice_id?: string | null
          litter_id?: string | null
          movement_type: string
          occurred_at?: string
          product_id: string
          quantity: number
          reason?: string | null
          receipt_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dog_id?: string | null
          id?: string
          invoice_id?: string | null
          litter_id?: string | null
          movement_type?: string
          occurred_at?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          receipt_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_receipt_lines: {
        Row: {
          id: string
          line_total: number
          product_id: string
          quantity: number
          receipt_id: string
          unit_cost: number
        }
        Insert: {
          id?: string
          line_total: number
          product_id: string
          quantity: number
          receipt_id: string
          unit_cost: number
        }
        Update: {
          id?: string
          line_total?: number
          product_id?: string
          quantity?: number
          receipt_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipt_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipt_lines_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "stock_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_receipts: {
        Row: {
          created_at: string
          created_by: string | null
          expense_id: string | null
          id: string
          notes: string | null
          received_on: string
          status: string
          supplier_invoice_no: string | null
          supplier_name: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expense_id?: string | null
          id?: string
          notes?: string | null
          received_on?: string
          status?: string
          supplier_invoice_no?: string | null
          supplier_name: string
          total_amount?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expense_id?: string | null
          id?: string
          notes?: string | null
          received_on?: string
          status?: string
          supplier_invoice_no?: string | null
          supplier_name?: string
          total_amount?: number
        }
        Relationships: []
      }
`;

const productStockView = `      v_product_stock: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string | null
          id: string | null
          image_path: string | null
          is_active: boolean | null
          is_client_visible: boolean | null
          name: string | null
          needs_reorder: boolean | null
          qty_on_hand: number | null
          reorder_level: number | null
          sell_price: number | null
          short_description: string | null
          sku: string | null
          unit: string | null
          updated_at: string | null
          updated_by: string | null
          vat_rate: number | null
        }
        Insert: {
          [_ in never]: never
        }
        Update: {
          [_ in never]: never
        }
        Relationships: []
      }
`;

function patch(src) {
  let out = src;
  if (!out.includes("equipment_type: string | null")) {
    throw new Error("catalogue equipment_type already gone?");
  }
  out = out.replace(/\n          equipment_type: string \| null/g, "");
  out = out.replace(/\n          equipment_type\?: string \| null/g, "");
  out = out.replace(/\n          stock_status: string/g, "");
  out = out.replace(/\n          stock_status\?: string/g, "");
  out = out.replace(
    `        Relationships: [
          {
            foreignKeyName: "catalogue_items_equipment_type_fkey"
            columns: ["equipment_type"]
            isOneToOne: false
            referencedRelation: "equipment_types"
            referencedColumns: ["key"]
          },
        ]
      }
      check_ins:`,
    `        Relationships: []
      }
      check_ins:`,
  );

  const productIdRow = "          product_id: string | null\n";
  const productIdInsert = "          product_id?: string | null\n";
  if (!out.includes("quote_items:")) throw new Error("quote_items missing");

  out = out.replace(
    `      invoice_items: {
        Row: {
          catalogue_code: string | null
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
          catalogue_code?: string | null
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
          catalogue_code?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          item_type?: string
          line_total?: number | null
          quantity?: number
          sort_order?: number
          unit_price?: number
        }`,
    `      invoice_items: {
        Row: {
          catalogue_code: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          item_type: string
          line_total: number | null
          product_id: string | null
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          catalogue_code?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          item_type?: string
          line_total?: number | null
          product_id?: string | null
          quantity?: number
          sort_order?: number
          unit_price: number
        }
        Update: {
          catalogue_code?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          item_type?: string
          line_total?: number | null
          product_id?: string | null
          quantity?: number
          sort_order?: number
          unit_price?: number
        }`,
  );

  out = out.replace(
    `      quote_items: {
        Row: {
          catalogue_code: string | null
          description: string
          dog_id: string | null
          id: string
          item_type: string
          line_total: number | null
          litter_id: string | null
          quantity: number
          quote_id: string
          sort_order: number
          subject_kind: string
          unit_price: number
        }
        Insert: {
          catalogue_code?: string | null
          description: string
          dog_id?: string | null
          id?: string
          item_type: string
          line_total?: number | null
          litter_id?: string | null
          quantity?: number
          quote_id: string
          sort_order?: number
          subject_kind?: string
          unit_price?: number
        }
        Update: {
          catalogue_code?: string | null
          description?: string
          dog_id?: string | null
          id?: string
          item_type?: string
          line_total?: number | null
          litter_id?: string | null
          quantity?: number
          quote_id?: string
          sort_order?: number
          subject_kind?: string
          unit_price?: number
        }`,
    `      quote_items: {
        Row: {
          catalogue_code: string | null
          description: string
          dog_id: string | null
          id: string
          item_type: string
          line_total: number | null
          litter_id: string | null
          product_id: string | null
          quantity: number
          quote_id: string
          sort_order: number
          subject_kind: string
          unit_price: number
        }
        Insert: {
          catalogue_code?: string | null
          description: string
          dog_id?: string | null
          id?: string
          item_type: string
          line_total?: number | null
          litter_id?: string | null
          product_id?: string | null
          quantity?: number
          quote_id: string
          sort_order?: number
          subject_kind?: string
          unit_price?: number
        }
        Update: {
          catalogue_code?: string | null
          description?: string
          dog_id?: string | null
          id?: string
          item_type?: string
          line_total?: number | null
          litter_id?: string | null
          product_id?: string | null
          quantity?: number
          quote_id?: string
          sort_order?: number
          subject_kind?: string
          unit_price?: number
        }`,
  );

  if (!out.includes("      products:")) {
    out = out.replace("      project_backups: {", productsTable + "      project_backups: {");
  }
  if (!out.includes("      stock_movements:")) {
    out = out.replace("      testimonials: {", stockTables + "      testimonials: {");
  }
  if (!out.includes("      v_product_stock:")) {
    out = out.replace("      v_public_gallery: {", productStockView + "      v_public_gallery: {");
  }

  const fns = `      confirm_stock_receipt: {
        Args: { p_expense: Json; p_receipt_id: string }
        Returns: Json
      }
      post_invoice_product_stock: {
        Args: {
          p_allow_negative?: boolean
          p_invoice_id: string
          p_reason?: string
        }
        Returns: Json
      }
      product_qty_on_hand: { Args: { p_product_id: string }; Returns: number }
      record_stock_adjustment: {
        Args: {
          p_allow_negative?: boolean
          p_dog_id?: string
          p_litter_id?: string
          p_movement_type?: string
          p_product_id: string
          p_quantity: number
          p_reason: string
        }
        Returns: Json
      }
      reverse_invoice_product_stock: {
        Args: { p_invoice_id: string }
        Returns: Json
      }
`;
  if (!out.includes("confirm_stock_receipt:")) {
    out = out.replace(
      "      convert_quote_to_invoice:",
      fns + "      convert_quote_to_invoice:",
    );
  }

  return out;
}

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const next = patch(src);
  if (next === src) throw new Error("No change: " + file);
  fs.writeFileSync(file, next);
  console.log("patched", path.relative(root, file));
}

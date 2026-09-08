/** Equipment shop domain. Retail only — never reads the dog pipeline. */

export type EquipmentFulfilment = 'delivery' | 'collection';
export type EquipmentEnquiryStatus = 'new' | 'quoted' | 'closed';

export type ShopBasketItem = {
  catalogue_item_id: string;
  quantity: number;
};

export type EquipmentEnquiryItem = {
  id: string;
  catalogue_item_id: string;
  quantity: number;
  note: string | null;
  label: string;
  code: string | null;
  default_price: number | null;
  price_varies: boolean;
  description_template: string | null;
  item_type: string;
};

export type EquipmentEnquiry = {
  id: string;
  contact_id: string | null;
  client_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  fulfilment: EquipmentFulfilment;
  delivery_address: string | null;
  message: string | null;
  status: EquipmentEnquiryStatus;
  quote_id: string | null;
  created_at: string;
  updated_at: string;
  items: EquipmentEnquiryItem[];
};

export type ShopContactPrefill = {
  full_name: string;
  email: string;
  phone: string;
};

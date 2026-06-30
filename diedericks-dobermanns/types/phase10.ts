export type CalendarViewMode = 'day' | 'week' | 'month' | 'year';

export type CalendarEventType =
  | 'litter_birth'
  | 'litter_go_home'
  | 'whelping'
  | 'go_home'
  | 'heat'
  | 'heat_mated'
  | 'heat_predicted'
  | 'heat_confirmed'
  | 'vet'
  | 'vet_visit'
  | 'vaccination'
  | 'deworming'
  | 'tick_flea'
  | 'todo'
  | 'training';

export interface CalendarEvent {
  id: string;
  date: string;
  type: CalendarEventType;
  colour: string;
  title: string;
  route?: string;
  params?: Record<string, string>;
  allDay?: boolean;
}

export interface ContactRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  whatsapp_number?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  company?: string | null;
  id_number?: string | null;
  tags: string[] | null;
  is_do_not_sell: boolean;
  popia_consent?: boolean;
  popia_consent_date?: string | null;
  marketing_opt_in?: boolean;
  contact_type?: ContactType;
  user_id?: string | null;
  source?: string | null;
  first_contact_date?: string | null;
  created_at: string;
  updated_at?: string;
  notes: string | null;
}

export type ContactType =
  | 'client'
  | 'prospect'
  | 'breeder'
  | 'supplier'
  | 'judge'
  | 'staff'
  | 'other';

export type ContactSegment = 'all' | 'client' | 'prospect' | 'other';

export interface ContactInteraction {
  id: string;
  contact_id: string;
  logged_by: string | null;
  interaction_type: 'whatsapp' | 'email' | 'call' | 'meeting' | 'note' | 'sms';
  direction: 'outbound' | 'inbound';
  subject: string | null;
  body: string | null;
  interaction_date: string;
  created_at: string;
}

export interface ContactInput {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  company?: string | null;
  id_number?: string | null;
  contact_type: string;
  tags?: string[];
  marketing_opt_in?: boolean;
  popia_consent?: boolean;
  notes?: string | null;
  source?: string;
}

export interface ContactSummaryCounts {
  client: number;
  prospect: number;
  other: number;
  total: number;
}

export type DogFilterTab = 'breeding' | 'expecting' | 'deceased' | 'alumni';

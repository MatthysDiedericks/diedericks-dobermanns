/**
 * Application domain types. These mirror the Supabase schema
 * (see supabase/migrations) and are used across hooks, stores and screens.
 */

export type UserRole =
  | 'visitor'
  | 'client'
  | 'trainer'
  | 'management'
  | 'admin'
  | 'super_admin';

export interface AppUser {
  id: string;
  full_name: string | null;
  /** Not selected by every query (e.g. mock data / some admin lists) — optional. */
  email?: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  whatsapp_number: string | null;
  dog_experience: string | null;
  current_pets: string | null;
  has_children: boolean | null;
  property_type: string | null;
  has_fencing: boolean | null;
  purpose: string[] | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  vet_practice: string | null;
  vet_name: string | null;
  vet_phone: string | null;
  profile_completed_at: string | null;
  role: UserRole;
  avatar_url: string | null;
  marketing_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Normalised, UI-facing social/contact settings. The live `app_settings` table
 * is key/value (keys: social_whatsapp, social_facebook, social_instagram,
 * social_telegram, social_youtube, whatsapp_community_url); useAppSettings maps
 * those rows into this object.
 */
export interface AppSettings {
  whatsapp_number: string | null;
  whatsapp_community_url: string | null;
  telegram_channel_url: string | null;
  facebook_page_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
}

export type ClientGroupType = 'litter' | 'training' | 'custom' | 'all_clients';

export interface ClientGroup {
  id: string;
  name: string;
  type: ClientGroupType;
  litter_id: string | null;
  created_at: string;
  member_count?: number | null;
  last_message_at?: string | null;
}

export interface ClientGroupMember {
  id: string;
  group_id: string;
  client_id: string;
  added_at: string;
  client?: AppUser | null;
}

export type BroadcastChannel = 'push' | 'whatsapp' | 'telegram';
export type BroadcastStatus = 'draft' | 'scheduled' | 'sent';

export interface BroadcastMessage {
  id: string;
  group_id: string | null;
  title: string;
  body: string;
  image_url: string | null;
  channels: BroadcastChannel[];
  status: BroadcastStatus;
  scheduled_for: string | null;
  sent_at: string | null;
  sent_by: string | null;
  recipient_count?: number | null;
  created_at: string;
  group?: ClientGroup | null;
  read_at?: string | null;
}

// Training booking system --------------------------------------------------
export type SessionFormat = 'in_person' | 'video_call' | 'both';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface TrainingSessionType {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  currency: string;
  session_format: SessionFormat;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingAvailability {
  id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  session_type_id: string | null;
  trainer_id: string | null;
  max_bookings: number;
  is_blocked: boolean;
  notes: string | null;
  created_at: string;
  /** Computed: confirmed + pending bookings against this slot. */
  booked_count?: number;
}

export interface TrainingBookingMedia {
  id: string;
  booking_id: string;
  media_type: 'image' | 'video';
  storage_path: string;
  public_url: string | null;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface TrainingBooking {
  id: string;
  client_id: string;
  session_type_id: string;
  availability_id: string | null;
  dog_id: string | null;
  trainer_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  session_format: SessionFormat;
  status: BookingStatus;
  client_notes: string | null;
  trainer_notes: string | null;
  admin_notes: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  reminder_sent: boolean;
  video_room_name: string | null;
  video_room_url: string | null;
  video_host_url: string | null;
  video_room_expires_at: string | null;
  created_at: string;
  updated_at: string;
  session_type?: TrainingSessionType | null;
  dog?: Dog | null;
  client?: AppUser | null;
  trainer?: AppUser | null;
  media?: TrainingBookingMedia[];
}

export type DogColour = 'black/rust' | 'blue/rust' | 'fawn/rust' | 'red/rust';
export type DogSex = 'male' | 'female';
export type DogStatus =
  | 'available'
  | 'reserved'
  | 'sold'
  | 'donated'
  | 'gifted'
  | 'keep'
  | 'stud'
  | 'in_training'
  | 'breeding_stock'
  | 'deceased'
  | 'retired'
  | 'puppy';
export type DogCategory = 'puppy' | 'adult' | 'breeding_stock' | 'training_dog';
export type Bloodline =
  | 'altobello'
  | 'dominator'
  | 'quantum'
  | 'american'
  | 'kennel_own';
export type DcmStatus = 'clear' | 'carrier' | 'affected';

/** A single ancestor in a dog's pedigree chart. */
export interface PedigreeNode {
  name: string;
  titles?: string;
  registration?: string;
}

/**
 * Up to three generations of ancestry. Keys read sire/dam first, then the
 * paternal/maternal split for each subsequent generation. All slots optional.
 */
export interface DogPedigree {
  sire?: PedigreeNode;
  dam?: PedigreeNode;
  // Generation 2 — grandparents
  sireSire?: PedigreeNode;
  sireDam?: PedigreeNode;
  damSire?: PedigreeNode;
  damDam?: PedigreeNode;
  // Generation 3 — great-grandparents
  sireSireSire?: PedigreeNode;
  sireSireDam?: PedigreeNode;
  sireDamSire?: PedigreeNode;
  sireDamDam?: PedigreeNode;
  damSireSire?: PedigreeNode;
  damSireDam?: PedigreeNode;
  damDamSire?: PedigreeNode;
  damDamDam?: PedigreeNode;
}

export type PedigreeSlot = keyof DogPedigree;

export interface Dog {
  id: string;
  name: string;
  breed: string;
  colour: DogColour | null;
  sex: DogSex | null;
  date_of_birth: string | null;
  father_id: string | null;
  mother_id: string | null;
  microchip_number: string | null;
  status: DogStatus | null;
  category: DogCategory | null;
  price: number | null;
  bloodline: Bloodline | null;
  health_tested: boolean;
  hip_score: string | null;
  elbow_score: string | null;
  dcm_status: DcmStatus | null;
  pedigree_url: string | null;
  pedigree?: DogPedigree | null;
  description: string | null;
  temperament_notes: string | null;
  training_notes: string | null;
  call_name?: string | null;
  coat_type?: string | null;
  height_cm?: number | null;
  ear_type?: 'natural' | 'cropped' | 'unknown' | null;
  eye_colour?: string | null;
  tattoo_number?: string | null;
  passport_number?: string | null;
  dna_number?: string | null;
  insurance_number?: string | null;
  registration_number?: string | null;
  registration_type?: string | null;
  location?: string | null;
  is_spayed_neutered?: boolean;
  wrights_coi?: number | null;
  registered_name?: string | null;
  genetics_b_locus?: string | null;
  genetics_d_locus?: string | null;
  genetics_vwd_status?: string | null;
  genetics_dcm1_status?: string | null;
  genetics_dcm2_status?: string | null;
  genetics_notes?: string | null;
  litter_id?: string | null;
  collar_colour?: string | null;
  birth_weight_grams?: number | null;
  standard?: 'fci_kusa' | 'akc' | null;
  bloodline_type?: 'european' | 'american' | 'mixed' | null;
  body_length_cm?: number | null;
  chest_depth_cm?: number | null;
  chest_girth_cm?: number | null;
  owner_id?: string | null;
  /** When the "Release & Send Contract" action was taken for this puppy — independent of `status`. */
  released_at?: string | null;
  is_featured: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // Joined / derived
  media?: DogMedia[];
}

export type TimelineCategory =
  | 'general'
  | 'training'
  | 'milestone'
  | 'health'
  | 'client_update';
export type TimelineSource = 'kennel' | 'client';

export interface TimelineEntry {
  id: string;
  dog_id: string;
  author_id: string | null;
  source: TimelineSource;
  category: TimelineCategory;
  entry_date: string;
  title: string;
  notes: string | null;
  photo_urls: string[];
  video_url: string | null;
  created_at: string;
}

export interface DogMedia {
  id: string;
  dog_id: string;
  type: 'photo' | 'video';
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  is_primary: boolean;
  sort_order: number;
  uploaded_at: string;
}

export interface DogShow {
  id: string;
  dog_id: string;
  title: string;
  location: string | null;
  club: string | null;
  organisation: string | null;
  start_date: string;
  end_date: string | null;
  placement: string | null;
  award: string | null;
  notes: string | null;
}

export interface MedicalCondition {
  id: string;
  dog_id: string;
  condition_name: string;
  diagnosed_date: string | null;
  resolved_date: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface WeightLog {
  id: string;
  dog_id: string;
  weight_kg: number;
  recorded_date: string;
  notes: string | null;
}

export interface HealthTest {
  id: string;
  dog_id: string;
  test_name: string;
  result: string | null;
  tested_date: string | null;
  lab: string | null;
  certificate_url: string | null;
  notes: string | null;
}

export type LitterStatus = 'planned' | 'expected' | 'born' | 'placed';

export interface Litter {
  id: string;
  name: string | null;
  litter_letter: string | null;
  mother_id: string | null;
  father_id: string | null;
  whelping_type: 'natural' | 'c_section' | null;
  expected_date: string | null;
  actual_date: string | null;
  actual_time: string | null;
  go_home_date: string | null;
  puppy_count: number | null;
  male_count: number | null;
  female_count: number | null;
  available_count: number | null;
  description: string | null;
  status: LitterStatus | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface LitterWithPuppies {
  id: string;
  name: string | null;
  status: string;
  litter_letter: string | null;
  actual_date: string | null;
  expected_date: string | null;
  go_home_date: string | null;
  go_home_weeks: number | null;
  puppy_count: number | null;
  available_count: number | null;
  male_count: number | null;
  female_count: number | null;
  deceased_count: number | null;
  notes: string | null;
  whelping_notes: string | null;
  description: string | null;
  updated_at: string | null;
  mother: { id: string; name: string } | null;
  father: { id: string; name: string } | null;
  puppies: Dog[];
}

export interface PortalReservation {
  id: string;
  status: string;
  deposit_paid: boolean;
  deposit_amount: number | null;
  total_price: number | null;
  expected_pickup_date: string | null;
  dog: Dog | null;
}

export interface Vaccination {
  id: string;
  dog_id: string;
  vaccine_name: string;
  date_administered: string;
  next_due_date: string | null;
  administered_by: string | null;
  batch_number: string | null;
  notes: string | null;
  created_at: string;
}

export type TrainingType =
  | 'obedience'
  | 'protection'
  | 'psa'
  | 'socialization'
  | 'foundation';
export type ProgressLevel =
  | 'foundation'
  | 'intermediate'
  | 'advanced'
  | 'proofed';

export interface TrainingLog {
  id: string;
  dog_id: string;
  trainer_id: string | null;
  training_type: TrainingType;
  session_date: string;
  duration_minutes: number | null;
  milestone: string | null;
  progress_level: ProgressLevel | null;
  notes: string | null;
  video_url: string | null;
  created_at: string;
}

export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'waitlisted';
export type DogInterest = 'puppy' | 'elite_developed' | 'protection_dog';
export type ApplicationPurpose = 'family' | 'protection' | 'sport' | 'companion';
export type HomeType = 'house' | 'apartment' | 'smallholding' | 'farm';

export interface Application {
  id: string;
  user_id: string | null;
  full_name: string;
  date_of_birth: string | null;
  email: string;
  phone: string;
  id_number: string | null;
  occupation: string | null;
  employer: string | null;
  country: string;
  province: string | null;
  city: string | null;
  address: string | null;
  instagram_handle: string | null;
  facebook_profile: string | null;
  dog_interest: DogInterest | null;
  specific_dog_id: string | null;
  litter_interest_id: string | null;
  purpose: ApplicationPurpose | null;
  experience_with_dobermanns: string | null;
  current_pets: string | null;
  home_type: HomeType | null;
  has_secure_yard: string | null;
  yard_size: string | null;
  sleeping_arrangement: string | null;
  hours_alone_per_day: string | null;
  exercise_level: string | null;
  why_dobermann: string | null;
  dobermann_experience_level: string | null;
  aware_of_dcm: string | null;
  aware_of_commitment: string | null;
  aware_of_costs: string | null;
  previous_dog_fate: string | null;
  preferred_sex: string | null;
  preferred_colour: string | null;
  tail_preference: string | null;
  preferred_timeline: string | null;
  budget_range: string | null;
  training_planned: boolean;
  delivery_acknowledged: boolean;
  special_requests: string | null;
  children_ages: string | null;
  security_requirements: string | null;
  vet_name: string | null;
  vet_phone: string | null;
  personal_reference_name: string | null;
  personal_reference_phone: string | null;
  status: ApplicationStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  agreed_no_breeding_rights: boolean;
  agreed_right_of_recall: boolean;
  agreed_no_resale: boolean;
  agreed_welfare_commitment: boolean;
  agreed_microchip_policy: boolean;
  agreed_to_terms: boolean;
  created_at: string;
  updated_at: string;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Reservation {
  id: string;
  client_id: string | null;
  dog_id: string | null;
  litter_id: string | null;
  application_id: string | null;
  deposit_paid: boolean;
  deposit_amount: number | null;
  total_price: number | null;
  status: ReservationStatus | null;
  expected_pickup_date: string | null;
  actual_pickup_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  dog?: Dog;
}

export type WaitingListStatus = 'active' | 'offered' | 'converted' | 'removed';
export type WaitlistPriority = 'high' | 'normal' | 'low';
export type WaitlistPaymentStatus = 'not_paid' | 'deposit_paid' | 'paid_in_full';
export type WaitlistSource = 'app' | 'website' | 'instagram' | 'referral' | 'phone' | 'manual';

export interface WaitingListType {
  id: string;
  name: string;
  slug: string;
  colour: string | null;
  sort_order: number;
  is_system: boolean;
  created_at: string;
}

export interface WaitingListHistoryRow {
  id: string;
  waiting_list_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
  changed_by_user?: Pick<AppUser, 'id' | 'full_name'> | null;
}

export interface WaitingListEntry {
  id: string;
  client_id: string | null;
  list_type_id: string | null;
  application_id: string | null;
  litter_id: string | null;
  enquirer_name: string | null;
  enquirer_email: string | null;
  enquirer_phone: string | null;
  enquirer_country: string | null;
  source: WaitlistSource | string | null;
  preferred_category: string | null;
  preferred_sex: string | null;
  preferred_colour: string | null;
  ear_preference: string | null;
  tail_preference: string | null;
  registration_preference: string | null;
  priority: WaitlistPriority;
  payment_status: WaitlistPaymentStatus;
  deposit_amount: number | null;
  deposit_paid_date: string | null;
  deposit_invoice_id: string | null;
  quoted_price: number | null;
  quote_id: string | null;
  quote_sent_date: string | null;
  quote_expires_date: string | null;
  balance_invoice_id: string | null;
  assigned_dog_id: string | null;
  assigned_litter_id: string | null;
  last_contact_date: string | null;
  preference_notes: string | null;
  admin_notes: string | null;
  client_visible_note: string | null;
  internal_flags: string[];
  do_not_sell_reason: string | null;
  position: number | null;
  status: WaitingListStatus;
  pipeline_stage: string | null;
  follow_up_date: string | null;
  feedback: string | null;
  expected_delivery_date: string | null;
  created_at: string;
  updated_at?: string;
  client?: Pick<AppUser, 'id' | 'full_name' | 'phone' | 'email'> | null;
  list_type?: WaitingListType | null;
  assigned_dog?: Pick<Dog, 'id' | 'name' | 'colour' | 'sex' | 'category' | 'price'> | null;
  assigned_litter?: Pick<Litter, 'id' | 'name'> | null;
}

// Quotes & invoices ----------------------------------------------------------
export type LineItemType =
  | 'dog'
  | 'delivery'
  | 'board_train'
  | 'training'
  | 'transport'
  | 'accessory'
  | 'other';

export interface LineItem {
  id: string;
  item_type: LineItemType;
  dog_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
}

export type QuoteStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled';

export interface Quote {
  id: string;
  quote_number: string | null;
  client_id: string | null;
  /** Walk-in client with no app account — mirrors invoices.historical_client_name. */
  historical_client_name: string | null;
  application_id: string | null;
  status: QuoteStatus;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  valid_until: string | null;
  converted_invoice_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined / derived
  client?: AppUser;
  items?: LineItem[];
}

// Real invoice types live in `types/finance.ts` (aligned with the live
// `invoices` schema — see `lib/finance/queries.ts` / `hooks/useInvoices.ts`).
// There used to be a second, stale `Invoice`/`InvoiceStatus` pair here with
// column names that didn't match the database; removed as dead code.

export interface Contract {
  id: string;
  reservation_id: string | null;
  client_id: string | null;
  dog_id: string | null;
  document_url: string;
  signed_by_client: boolean;
  signed_at: string | null;
  notes: string | null;
  created_at: string;
  contract_title?: string | null;
  status?: string | null;
  client_signed_at?: string | null;
  client_signature_url?: string | null;
  client_signature_device?: string | null;
  client_ip_on_sign?: string | null;
}

export type NotificationType =
  | 'push'
  | 'email'
  | 'whatsapp'
  | 'application_confirmation'
  | 'document_expiry';
export type NotificationStatus = 'sent' | 'delivered' | 'failed';

export interface NotificationLog {
  id: string;
  recipient_id: string | null;
  type: NotificationType;
  subject: string | null;
  body: string | null;
  status: NotificationStatus | null;
  sent_at: string;
}

export interface Achievement {
  id: string;
  dog_id: string;
  title: string;
  trial_date: string | null;
  location: string | null;
  judge: string | null;
  score: string | null;
  notes: string | null;
  created_at: string;
}

export type EnquiryStatus = 'new' | 'replied' | 'closed';

export interface Enquiry {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  dog_id: string | null;
  country: string | null;
  status: EnquiryStatus;
  admin_notes: string | null;
  replied_by: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface Testimonial {
  id: string;
  client_name: string;
  location: string | null;
  dog_name: string | null;
  content: string;
  video_url: string | null;
  photo_url: string | null;
  is_featured: boolean;
  is_approved: boolean;
  sort_order: number;
  created_at: string;
}

export type GalleryCategory =
  | 'puppies'
  | 'training'
  | 'competition'
  | 'family'
  | 'kennel';

export interface GalleryItem {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  video_url: string | null;
  category: GalleryCategory | null;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

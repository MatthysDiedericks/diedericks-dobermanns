export const WAITLIST_SELECT =
  'id, client_id, list_type_id, application_id, litter_id, enquirer_name, enquirer_email, enquirer_phone, enquirer_country, source, preferred_category, preferred_sex, preferred_colour, ear_preference, tail_preference, registration_preference, priority, payment_status, deposit_amount, deposit_paid_date, deposit_invoice_id, quoted_price, quote_id, quote_sent_date, quote_expires_date, balance_invoice_id, assigned_dog_id, assigned_litter_id, last_contact_date, preference_notes, admin_notes, client_visible_note, internal_flags, do_not_sell_reason, position, status, pipeline_stage, follow_up_date, feedback, expected_delivery_date, created_at, updated_at, client:users(id, full_name, phone, email), list_type:waiting_list_types(id, name, slug, colour, sort_order, is_system, created_at), assigned_dog:dogs!waiting_list_assigned_dog_id_fkey(id, name, colour, sex, category, price), assigned_litter:litters!waiting_list_assigned_litter_id_fkey(id, name)';

export const WAITLIST_HISTORY_SELECT =
  'id, waiting_list_id, from_stage, to_stage, changed_by, notes, created_at, changed_by_user:users!waiting_list_history_changed_by_fkey(id, full_name)';

export const WAITLIST_TYPE_SELECT = 'id, name, slug, colour, sort_order, is_system, created_at';

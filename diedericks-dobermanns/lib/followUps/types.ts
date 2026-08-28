export type OwnershipStatus =
  | 'unknown'
  | 'with_owner'
  | 'rehomed'
  | 'returned'
  | 'deceased'
  | 'lost_contact';

export type CheckInKind =
  | 'post_placement'
  | 'birthday'
  | 'health_milestone'
  | 'manual';

export type CheckInStatus =
  | 'due'
  | 'sent'
  | 'answered'
  | 'skipped'
  | 'no_response';

export type OverallHealth =
  | 'excellent'
  | 'good'
  | 'fair'
  | 'poor'
  | 'deceased';

export type DueCheckIn = {
  id: string;
  dog_id: string;
  contact_id: string | null;
  kind: CheckInKind;
  due_date: string;
  status: CheckInStatus;
  draft_message: string | null;
  dog: {
    id: string;
    name: string;
    call_name: string | null;
    date_of_birth: string | null;
    sex: string | null;
    ownership_status: OwnershipStatus;
    do_not_contact: boolean;
    litter_id: string | null;
    owner_id: string | null;
  } | null;
  contact: {
    id: string;
    full_name: string;
    phone: string | null;
    whatsapp_number: string | null;
    email: string | null;
  } | null;
};

export const KIND_LABELS: Record<CheckInKind, string> = {
  post_placement: 'Post-placement',
  birthday: 'Birthday',
  health_milestone: 'Health milestone',
  manual: 'Manual',
};

export const OWNERSHIP_LABELS: Record<OwnershipStatus, string> = {
  unknown: 'Unknown',
  with_owner: 'With owner',
  rehomed: 'Rehomed',
  returned: 'Returned',
  deceased: 'Deceased',
  lost_contact: 'Lost contact',
};

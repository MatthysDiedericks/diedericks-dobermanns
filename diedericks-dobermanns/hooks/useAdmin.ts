import { useCallback, useEffect, useState } from 'react';

import {
  MOCK_APPLICATIONS,
  MOCK_BROADCASTS,
  MOCK_CLIENT_GROUPS,
  MOCK_CLIENTS,
  MOCK_DOGS,
  MOCK_ENQUIRIES,
  MOCK_FAQ,
  MOCK_GALLERY,
  MOCK_GROUP_MEMBERS,
  MOCK_LITTERS,
  MOCK_TESTIMONIALS,
  MOCK_WAITING_LIST,
} from '@/lib/mockData';
import { supabase, requireSupabase } from '@/lib/supabase';
import { useRemoteList, type ListResult } from '@/hooks/useRemoteList';
import type {
  AppUser,
  Application,
  BroadcastMessage,
  ClientGroup,
  ClientGroupMember,
  Dog,
  Enquiry,
  FaqItem,
  GalleryItem,
  Litter,
  Testimonial,
  WaitingListEntry,
} from '@/types/app.types';

const ADMIN_DOG_SELECT =
  'id, name, breed, colour, sex, status, date_of_birth, category, price, is_public, is_featured, created_at, media:dog_media(id, dog_id, url, thumbnail_url, is_primary, type, sort_order, caption)';

const WAITING_LIST_SELECT =
  'id, client_id, litter_id, preference_notes, position, status, pipeline_stage, follow_up_date, feedback, expected_delivery_date, created_at, client:users(id, full_name, phone)';

const BROADCAST_SELECT =
  'id, group_id, title, body, image_url, channels, status, scheduled_for, sent_at, sent_by, recipient_count, created_at, group:client_groups(id, name, type, colour, member_count, litter_id, created_at)';

const CLIENT_GROUP_DETAIL_SELECT =
  'id, name, type, description, colour, member_count, litter_id, created_at';

const CLIENT_GROUP_MEMBER_SELECT =
  'id, group_id, client_id, added_at, client:users(id, full_name, phone)';

/** All dogs, including non-public — admin only. */
export function useAdminDogs(): ListResult<Dog> {
  return useRemoteList<Dog>(MOCK_DOGS, (client) =>
    client.from('dogs').select(ADMIN_DOG_SELECT).order('created_at', { ascending: false }),
  );
}

export function useAdminApplications(): ListResult<Application> {
  return useRemoteList<Application>(MOCK_APPLICATIONS, (client) =>
    client
      .from('applications')
      .select('id, full_name, email, phone, status, purpose, country, created_at, admin_notes')
      .order('created_at', { ascending: false }),
  );
}

export function useAdminLitters(): ListResult<Litter> {
  return useRemoteList<Litter>(MOCK_LITTERS, (client) =>
    client
      .from('litters')
      .select(
        'id, name, litter_letter, status, mother_id, father_id, whelping_type, expected_date, actual_date, actual_time, go_home_date, puppy_count, available_count, description, is_public, created_at, updated_at',
      )
      .order('expected_date'),
  );
}

export function useClients(): ListResult<AppUser> {
  return useRemoteList<AppUser>(MOCK_CLIENTS, (client) =>
    client
      .from('users')
      .select('id, full_name, email, phone, role, created_at')
      .in('role', ['client', 'trainer'])
      .order('created_at', { ascending: false }),
  );
}

export function useEnquiries(): ListResult<Enquiry> {
  return useRemoteList<Enquiry>(MOCK_ENQUIRIES, (client) =>
    client
      .from('enquiries')
      .select('id, full_name, email, phone, subject, message, status, created_at, replied_at')
      .order('created_at', { ascending: false }),
  );
}

export function useWaitingList(): ListResult<WaitingListEntry> {
  return useRemoteList<WaitingListEntry>(MOCK_WAITING_LIST, (client) =>
    client.from('waiting_list').select(WAITING_LIST_SELECT).order('position'),
  );
}

// Content managers — admin sees ALL rows (incl. unapproved / unpublished).
export function useAdminTestimonials(): ListResult<Testimonial> {
  return useRemoteList<Testimonial>(MOCK_TESTIMONIALS, (client) =>
    client
      .from('testimonials')
      .select('id, author_name, content, rating, is_published, sort_order, photo_url')
      .order('sort_order'),
  );
}

export function useAdminGallery(): ListResult<GalleryItem> {
  return useRemoteList<GalleryItem>(MOCK_GALLERY, (client) =>
    client
      .from('gallery_items')
      .select('id, title, url, thumbnail_url, type, sort_order, is_published')
      .order('sort_order'),
  );
}

export function useAdminFaq(): ListResult<FaqItem> {
  return useRemoteList<FaqItem>(MOCK_FAQ, (client) =>
    client
      .from('faq')
      .select('id, question, answer, is_published, sort_order')
      .order('sort_order'),
  );
}

// Communication hub ---------------------------------------------------------
export function useClientGroups(): ListResult<ClientGroup> {
  return useRemoteList<ClientGroup>(MOCK_CLIENT_GROUPS, (client) =>
    client
      .from('client_groups')
      .select('id, name, type, description, colour, member_count, litter_id, created_at')
      .order('created_at', { ascending: false }),
  );
}

export function useBroadcasts(): ListResult<BroadcastMessage> {
  return useRemoteList<BroadcastMessage>(MOCK_BROADCASTS, (client) =>
    client.from('broadcast_messages').select(BROADCAST_SELECT).order('created_at', { ascending: false }),
  );
}

/** A single group plus its members (with the joined client record). */
export function useClientGroup(groupId: string | undefined) {
  const [group, setGroup] = useState<ClientGroup | null>(null);
  const [members, setMembers] = useState<ClientGroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    if (!supabase) {
      setGroup(MOCK_CLIENT_GROUPS.find((g) => g.id === groupId) ?? null);
      setMembers(MOCK_GROUP_MEMBERS.filter((m) => m.group_id === groupId));
      setLoading(false);
      return;
    }
    const [{ data: g }, { data: m }] = await Promise.all([
      supabase.from('client_groups').select(CLIENT_GROUP_DETAIL_SELECT).eq('id', groupId).maybeSingle(),
      supabase.from('client_group_members').select(CLIENT_GROUP_MEMBER_SELECT).eq('group_id', groupId),
    ]);
    setGroup((g as ClientGroup) ?? null);
    setMembers((m ?? []) as unknown as ClientGroupMember[]);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  return { group, members, loading, refetch: load };
}

const APPLICATION_DETAIL_SELECT =
  'id, user_id, full_name, date_of_birth, email, phone, id_number, occupation, employer, country, province, city, address, instagram_handle, facebook_profile, dog_interest, specific_dog_id, litter_interest_id, purpose, experience_with_dobermanns, current_pets, home_type, has_secure_yard, yard_size, sleeping_arrangement, hours_alone_per_day, exercise_level, why_dobermann, dobermann_experience_level, aware_of_dcm, aware_of_commitment, aware_of_costs, previous_dog_fate, preferred_sex, preferred_colour, tail_preference, preferred_timeline, budget_range, training_planned, security_requirements, delivery_acknowledged, special_requests, children_ages, vet_name, vet_phone, personal_reference_name, personal_reference_phone, status, admin_notes, reviewed_by, reviewed_at, agreed_no_breeding_rights, agreed_right_of_recall, agreed_no_resale, agreed_welfare_commitment, agreed_microchip_policy, agreed_to_terms, created_at, updated_at';

/** Full application record for admin review (explicit columns — no select *). */
export function useApplicationDetail(id: string | undefined) {
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    if (!supabase) {
      setApplication(MOCK_APPLICATIONS.find((a) => a.id === id) ?? null);
      setLoading(false);
      return;
    }
    try {
      const client = requireSupabase();
      const { data, error: err } = await client
        .from('applications')
        .select(APPLICATION_DETAIL_SELECT)
        .eq('id', id)
        .single();
      if (err) throw new Error(err.message);
      setApplication(data as Application);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load application');
      setApplication(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { application, loading, error, refresh };
}

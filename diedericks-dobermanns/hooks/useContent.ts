import {
  MOCK_FAQ,
  MOCK_GALLERY,
  MOCK_LITTERS,
  MOCK_TESTIMONIALS,
} from '@/lib/mockData';
import { useRemoteList, type ListResult } from '@/hooks/useRemoteList';
import type {
  FaqItem,
  GalleryItem,
  Litter,
  Testimonial,
} from '@/types/app.types';

export function useTestimonials(): ListResult<Testimonial> {
  return useRemoteList<Testimonial>(MOCK_TESTIMONIALS, (client) =>
    client
      .from('testimonials')
      .select('id, author_name, content, rating, is_approved, sort_order, photo_url')
      .eq('is_approved', true)
      .order('sort_order'),
  );
}

export function useGallery(): ListResult<GalleryItem> {
  return useRemoteList<GalleryItem>(MOCK_GALLERY, (client) =>
    client
      .from('gallery_items')
      .select('id, title, description, image_url, video_url, category, is_featured, sort_order, photo_taken_at')
      .order('photo_taken_at', { ascending: false, nullsFirst: false })
      .order('sort_order', { ascending: false }),
  );
}

export function useFaq(): ListResult<FaqItem> {
  return useRemoteList<FaqItem>(MOCK_FAQ, (client) =>
    client
      .from('faq')
      .select('id, question, answer, is_published, sort_order')
      .eq('is_published', true)
      .order('sort_order'),
  );
}

export function useLitters(): ListResult<Litter> {
  return useRemoteList<Litter>(MOCK_LITTERS, (client) =>
    client
      .from('litters')
      .select('id, name, status, expected_date, actual_date, go_home_date, puppy_count, available_count, is_public')
      .eq('is_public', true)
      .order('expected_date'),
  );
}

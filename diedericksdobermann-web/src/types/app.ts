import type { Tables } from "@/types/database.types";

export type Dog = Tables<"dogs">;
export type DogMedia = Tables<"dog_media">;
export type Litter = Tables<"litters">;
export type Achievement = Tables<"achievements">;
export type Vaccination = Tables<"vaccinations">;
export type GalleryItem = Tables<"gallery_items">;
export type Testimonial = Tables<"testimonials">;
export type Faq = Tables<"faq">;
export type Enquiry = Tables<"enquiries">;
export type Application = Tables<"applications">;
export type Reservation = Tables<"reservations">;
export type WaitingList = Tables<"waiting_list">;
export type AppUser = Tables<"users">;
export type ClientGroup = Tables<"client_groups">;
export type BroadcastMessage = Tables<"broadcast_messages">;
export type TrainingSessionType = Tables<"training_session_types">;
export type TrainingAvailability = Tables<"training_availability">;
export type TrainingBooking = Tables<"training_bookings">;

export type DogWithMedia = Dog & { dog_media: DogMedia[] };
export type LitterWithParents = Litter & {
  mother: Pick<Dog, "id" | "name"> | null;
  father: Pick<Dog, "id" | "name"> | null;
};

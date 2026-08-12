/** Plain-language reason a dog must not receive welfare check-ins. */

export type ContactabilityDog = {
  do_not_contact?: boolean | null;
  deceased_at?: string | null;
  status?: string | null;
  ownership_status?: string | null;
};

export function contactabilityBlockReason(dog: ContactabilityDog): string | null {
  if (dog.do_not_contact) {
    return 'No check-ins — marked do not contact about this dog.';
  }
  if (dog.deceased_at) {
    return `No check-ins — this dog is recorded as deceased (${dog.deceased_at}).`;
  }
  if (dog.status === 'deceased') {
    return 'No check-ins — this dog is recorded as deceased.';
  }
  const own = dog.ownership_status ?? 'unknown';
  if (own === 'deceased') {
    return 'No check-ins — ownership status is deceased.';
  }
  if (own === 'lost_contact') {
    return 'No check-ins — ownership status is lost contact.';
  }
  if (own === 'returned') {
    return 'No check-ins — ownership status is returned.';
  }
  return null;
}

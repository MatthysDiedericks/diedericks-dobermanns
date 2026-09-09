export function canConfirmPuppyReceived(dog: {
  handover_status?: string | null;
  delivered_at?: string | null;
}): boolean {
  if (dog.delivered_at) return false;
  return dog.handover_status === 'ready' || dog.handover_status === 'scheduled';
}

// Supabase Edge Function: send-birthday-greetings
//
// RETIRED 12 Aug 2026.
// Automatic birthday email was unsafe: death was recorded on ownership_status /
// deceased_at while this function only checked dogs.status, so a grieving owner
// could still get "Happy birthday" the next year. Birthday contact is now a
// human-reviewed check-in — see /admin/follow-ups. The original email wording
// was moved into the birthday check-in draft generator; do not delete this file
// — it is the record of what the automated email said.
//
// Deploy: supabase functions deploy send-birthday-greetings

Deno.serve(async () => {
  return new Response(
    JSON.stringify({
      error:
        "Retired 12 Aug 2026. Birthday contact is now a human-reviewed check-in — see /admin/follow-ups.",
    }),
    {
      status: 410,
      headers: { "Content-Type": "application/json" },
    },
  );
});

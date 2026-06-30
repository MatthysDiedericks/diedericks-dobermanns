import { NextResponse } from "next/server";
import { z } from "zod";

import { applicationSchema } from "@/components/forms/ApplicationForm/schema";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const apiSchema = applicationSchema.extend({
  specific_dog_id: z.string().uuid().optional().or(z.literal("")),
  litter_interest_id: z.string().uuid().optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`apply:${ip}`, { maxRequests: 3, windowMs: 3_600_000 });

  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again in an hour." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = apiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please complete all required fields." },
      { status: 422 },
    );
  }
  const v = parsed.data;

  const supabase = createAdminClient();
  const row = {
      full_name: v.full_name,
      date_of_birth: v.date_of_birth,
      id_number: v.id_number,
      email: v.email,
      phone: v.phone,
      occupation: v.occupation,
      employer: v.employer || null,
      country: v.country,
      province: v.province || null,
      city: v.city || null,
      address: v.address,
      instagram_handle: v.instagram_handle || null,
      facebook_profile: v.facebook_profile || null,
      home_type: v.home_type,
      has_secure_yard: v.has_secure_yard,
      yard_size: v.yard_size,
      sleeping_arrangement: v.sleeping_arrangement,
      hours_alone_per_day: v.hours_alone_per_day,
      exercise_level: v.exercise_level,
      current_pets: v.current_pets || null,
      children_ages: v.children_ages || null,
      why_dobermann: v.why_dobermann,
      dobermann_experience_level: v.dobermann_experience_level,
      aware_of_dcm: v.aware_of_dcm,
      aware_of_commitment: v.aware_of_commitment,
      aware_of_costs: v.aware_of_costs,
      previous_dog_fate: v.previous_dog_fate || null,
      experience_with_dobermanns: v.experience_with_dobermanns || null,
      vet_name: v.vet_name || null,
      vet_phone: v.vet_phone || null,
      personal_reference_name: v.personal_reference_name || null,
      personal_reference_phone: v.personal_reference_phone || null,
      dog_interest: v.dog_interest,
      purpose: v.purpose,
      preferred_sex: v.preferred_sex,
      preferred_colour: v.preferred_colour,
      tail_preference: v.tail_preference,
      preferred_timeline: v.preferred_timeline,
      budget_range: v.budget_range,
      training_planned: v.training_planned,
      security_requirements: v.security_requirements || null,
      delivery_acknowledged: v.delivery_acknowledged,
      special_requests: v.special_requests || null,
      specific_dog_id: v.specific_dog_id || null,
      litter_interest_id: v.litter_interest_id || null,
      agreed_no_breeding_rights: v.agreed_no_breeding_rights,
      agreed_right_of_recall: v.agreed_right_of_recall,
      agreed_no_resale: v.agreed_no_resale,
      agreed_welfare_commitment: v.agreed_welfare_commitment,
      agreed_microchip_policy: v.agreed_microchip_policy,
      agreed_to_terms: v.agreed_to_terms,
      status: "pending",
    };

  const { data, error } = await supabase
    .from("applications")
    .insert(row as never)
    .select("id")
    .single();

  if (error) {
    console.error("Application form error:", error);
    return NextResponse.json(
      { error: "Could not submit your application." },
      { status: 500 },
    );
  }

  const referenceId = `DD-${data.id.slice(0, 8).toUpperCase()}`;

  await supabase.from("enquiries").insert({
    subject: `Application Received — ${referenceId}`,
    message: `A new puppy application has been submitted via the website. Reference: ${referenceId}. Applicant: ${v.full_name}, ${v.email}, ${v.phone}.`,
    full_name: v.full_name,
    email: v.email,
    phone: v.phone,
    country: v.country,
    status: "new",
  });

  return NextResponse.json({ ok: true, referenceId });
}

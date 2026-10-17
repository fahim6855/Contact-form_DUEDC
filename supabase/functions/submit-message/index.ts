import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d\s().-]+$/;

function validate(body: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");

  const fullName = str("fullName");
  const companyName = str("companyName");
  const email = str("email");
  const phone = str("phone");

  if (!fullName) errors.fullName = "Full name is required.";
  else if (fullName.length < 2 || fullName.length > 100) errors.fullName = "Full name must be 2 to 100 characters.";

  if (!companyName) errors.companyName = "Company name is required.";
  else if (companyName.length > 100) errors.companyName = "Company name must be 100 characters or fewer.";

  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email) || email.length > 254) errors.email = "Enter a valid email address.";

  const digits = phone.replace(/\D/g, "");
  if (!phone) errors.phone = "Phone is required.";
  else if (!PHONE_RE.test(phone) || digits.length < 7 || digits.length > 15 || phone.length > 30) {
    errors.phone = "Enter a valid phone number.";
  }

  if (body.consent !== true) errors.consent = "You must agree to the privacy policy.";

  return { errors, clean: { fullName, companyName, email: email.toLowerCase(), phone } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, message: "Method not allowed. Use POST." }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, message: "Request body must be valid JSON." }, 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return json({ success: false, message: "Request body must be a JSON object." }, 400);
  }

  const { errors, clean } = validate(body);
  if (Object.keys(errors).length > 0) {
    return json({ success: false, message: "Please fix the errors and try again.", errors }, 400);
  }

  // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically on hosted Edge Functions.
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data, error } = await supabase
    .from("messages")
    .insert({
      full_name: clean.fullName,
      company_name: clean.companyName,
      email: clean.email,
      phone: clean.phone,
      consent: true,
    })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("Insert failed:", error);
    return json({ success: false, message: "Could not save your message. Please try again later." }, 500);
  }

  return json({ success: true, message: "Message sent. Cameron will get back to you soon.", data }, 201);
});

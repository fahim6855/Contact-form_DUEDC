import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ success: false, message: "Method not allowed. Use GET." }, 405);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data, error } = await supabase
    .from("messages")
    .select("id, full_name, company_name, email, phone, consent, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("List failed:", error);
    return json({ success: false, message: "Could not load messages. Please try again later." }, 500);
  }

  return json({ success: true, count: data.length, data });
});

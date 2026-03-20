import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiUrl, apiKey, action, service, link, quantity } = await req.json();

    if (!apiUrl || !apiKey || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: apiUrl, apiKey, action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build form data for the SMM panel API
    const params = new URLSearchParams({ key: apiKey, action });
    if (service) params.set("service", service);
    if (link) params.set("link", link);
    if (quantity) params.set("quantity", String(quantity));

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = { raw: data };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

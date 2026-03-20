import { supabase } from "@/integrations/supabase/client";

export async function smmApiCall(
  apiUrl: string,
  apiKey: string,
  action: string,
  extra?: { service?: string; link?: string; quantity?: number }
) {
  const { data, error } = await supabase.functions.invoke("smm-proxy", {
    body: { apiUrl, apiKey, action, ...extra },
  });

  if (error) throw new Error(error.message);
  return data;
}

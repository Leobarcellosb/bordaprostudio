import { supabase } from "@/integrations/supabase/client";

export async function dispatchWebhook(params: {
  event_name: string;
  user_email?: string;
  user_id?: string;
  design_id?: string;
  is_test?: boolean;
}) {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) return;

    // Fire and forget — don't block the UI
    supabase.functions.invoke("dispatch-webhook", {
      body: params,
    }).catch((err) => {
      console.warn("Webhook dispatch failed (non-blocking):", err);
    });
  } catch {
    // Silent fail — webhooks should never block UX
  }
}

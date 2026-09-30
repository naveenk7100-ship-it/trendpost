// Supabase Edge Function: daily-pipeline
// Orchestrates 07:00 AM IST daily trend scan, normalization, scoring & Claude generation
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const runId = `daily-pipeline-${Date.now()}`;
  try {
    const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";
    
    // Delegate to pipeline or run internal logic
    const internalCall = await fetch(`${appUrl}/api/pipeline/daily`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: "supabase_cron_0700_ist", runId }),
    });

    const result = await internalCall.json();
    return new Response(
      JSON.stringify({ success: true, runId, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, runId, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

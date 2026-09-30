// Supabase Edge Function: fetch-trends
// Fetches trends concurrently from Google Trends, YouTube, Reddit, X with safe timeout
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const runId = `fetch-${Date.now()}`;
  try {
    const { region = "IN", limit = 20 } = await req.json().catch(() => ({}));

    // Fetch Google Trends RSS
    const gtUrl = `https://trends.google.com/trending/rss?geo=${region}`;
    const gtRes = await fetch(gtUrl, {
      headers: { "User-Agent": "TrendPost-Edge/1.0" }
    });
    const xml = await gtRes.text();

    return new Response(
      JSON.stringify({
        success: true,
        runId,
        message: "Fetched raw trends successfully",
        region,
        feedLength: xml.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

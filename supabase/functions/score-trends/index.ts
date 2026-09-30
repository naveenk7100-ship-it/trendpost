// Supabase Edge Function: score-trends
// Normalizes and calculates transparent virality scores across topics
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { topics = [] } = await req.json().catch(() => ({ topics: [] }));

    const scored = topics.map((t: any) => {
      const volume = t.volume || 10000;
      const velocity = t.velocity || 500;
      const freshness_score = 90;
      const volume_score = Math.min(100, Math.round(Math.log10(Math.max(10, volume)) * 15));
      const velocity_score = Math.min(100, Math.round(Math.log10(Math.max(10, velocity)) * 20));
      const instagram_fit_score = 75;
      const cross_platform_score = (t.sources_matched?.length || 1) >= 2 ? 80 : 35;

      const virality_score = Math.round(
        freshness_score * 0.20 +
        velocity_score * 0.25 +
        volume_score * 0.20 +
        instagram_fit_score * 0.20 +
        cross_platform_score * 0.15
      );

      return {
        ...t,
        freshness_score,
        volume_score,
        velocity_score,
        instagram_fit_score,
        cross_platform_score,
        virality_score,
      };
    });

    scored.sort((a: any, b: any) => b.virality_score - a.virality_score);
    const ranked = scored.map((t: any, idx: number) => ({ ...t, is_top_10: idx < 10 }));

    return new Response(
      JSON.stringify({ success: true, count: ranked.length, data: ranked }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

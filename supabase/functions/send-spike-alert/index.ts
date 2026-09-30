// Supabase Edge Function: send-spike-alert
// Sends high-priority Telegram notification when a breakout trend is detected
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { spike, recipients = [] } = await req.json();
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    if (!botToken) {
      return new Response(
        JSON.stringify({ success: false, error: "TELEGRAM_BOT_TOKEN not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const title = spike?.topic?.title || "Breakout Trend";
    const text = `🚨 *URGENT VIRAL SPIKE*\n\n📌 *Topic:* ${title}\n📈 *Score Surge:* +${spike?.score_change || 25} pts\n💡 *Action:* Claim on dashboard now!`;

    const sendPromises = recipients.map((chatId: string) => {
      return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
      });
    });

    await Promise.allSettled(sendPromises);

    return new Response(
      JSON.stringify({ success: true, message: `Alert sent to ${recipients.length} recipients` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

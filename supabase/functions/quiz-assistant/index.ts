import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, questionContext } = await req.json();
    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    if (!AI_API_KEY) throw new Error("AI_API_KEY is not configured");

    const systemPrompt = `You are an AI Study Assistant embedded in a quiz interface for Ethiopian students (Grades 9–12) on the Haylat_EdTech platform.

CURRENT QUIZ CONTEXT:
${questionContext ? `The student is working on this question: "${questionContext.questionText}"` : "No specific question context provided."}

YOUR RULES — STRICTLY FOLLOW:
1. NEVER reveal the correct answer directly. Do not say "the answer is A/B/C/D" or similar.
2. NEVER confirm or deny if a specific option is correct.
3. Instead, help the student LEARN by:
   - Explaining the underlying concept
   - Providing definitions of key terms
   - Giving analogies or examples
   - Offering step-by-step reasoning hints
   - Suggesting what to think about or recall
4. Keep responses concise (2-4 paragraphs max).
5. Be encouraging and supportive.
6. Use simple language appropriate for high school students.
7. Format math expressions clearly.
8. If asked directly for the answer, politely decline and offer a hint instead.

You are here to help students understand, not to give them free answers.`;

    const response = await fetch(
      `${Deno.env.get("AI_GATEWAY_URL") || "https://api.openai.com"}/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please contact your administrator." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("quiz-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

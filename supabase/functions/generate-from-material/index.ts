import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { material_text, num_mcq = 5, num_tf = 0, num_short = 0, num_essay = 0, difficulty_mix = "balanced" } = await req.json();
    
    if (!material_text || material_text.length < 50) {
      return new Response(JSON.stringify({ error: "Material text too short (min 50 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    if (!AI_API_KEY) throw new Error("AI_API_KEY is not configured");

    const totalQ = num_mcq + num_tf + num_short + num_essay;
    const truncatedText = material_text.slice(0, 15000);

    const mixMap: Record<string, { hard: number; medium: number; easy: number }> = {
      balanced:     { hard: 25, medium: 25, easy: 50 },
      hard_heavy:   { hard: 50, medium: 25, easy: 25 },
      hard_medium:  { hard: 50, medium: 50, easy: 0 },
      hard_easy:    { hard: 50, medium: 0,  easy: 50 },
      medium_heavy: { hard: 25, medium: 75, easy: 0 },
      easy_only:    { hard: 0,  medium: 0,  easy: 100 },
      medium_only:  { hard: 0,  medium: 100, easy: 0 },
      hard_only:    { hard: 100, medium: 0, easy: 0 },
    };

    const mix = mixMap[difficulty_mix] || mixMap.balanced;
    const numHard = Math.round(totalQ * mix.hard / 100);
    const numEasy = Math.round(totalQ * mix.easy / 100);
    const numMedium = totalQ - numHard - numEasy;

    const difficultyInstruction = `
Difficulty distribution for the ${totalQ} questions:
- ${numHard} questions should be HARD difficulty
- ${numMedium} questions should be MEDIUM difficulty
- ${numEasy} questions should be EASY difficulty
Each question MUST have a "difficulty" field set to "easy", "medium", or "hard" matching this distribution.`;

    const prompt = `Based on the following study material, generate exactly ${totalQ} questions:
- ${num_mcq} Multiple Choice Questions (MCQ) with 4 options each
- ${num_tf} True/False questions
- ${num_short} Short Answer questions
- ${num_essay} Essay/Writing questions
${difficultyInstruction}

STUDY MATERIAL:
${truncatedText}

Generate questions that directly test comprehension of the material above. Each question must be answerable from the material content.`;

    const response = await fetch(`${Deno.env.get("AI_GATEWAY_URL") || "https://api.openai.com"}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert educational question generator. Generate questions strictly based on the provided study material. Questions should be clear, well-structured, and test genuine understanding." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_questions",
            description: "Return generated questions from study material",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question_type: { type: "string", enum: ["mcq", "true_false", "short_answer", "essay"] },
                      question_text: { type: "string" },
                      option_a: { type: "string" },
                      option_b: { type: "string" },
                      option_c: { type: "string" },
                      option_d: { type: "string" },
                      correct_answer: { type: "string", description: "For MCQ: A/B/C/D. For T/F: True/False. For short answer: the expected answer. For essay: answer guide." },
                      explanation: { type: "string" },
                      difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                    },
                    required: ["question_type", "question_text", "correct_answer"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_questions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add more credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to generate questions" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("AI response structure:", (JSON.stringify(data.choices?.[0]?.message, null, 2) || "undefined").slice(0, 2000));
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse from message content if tool_calls not present
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        // Try to extract JSON from content
        const jsonMatch = content.match(/\{[\s\S]*"questions"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (parseErr) {
        console.error("Fallback parse failed:", parseErr);
      }
    }

    console.error("No tool_calls or parseable content in response");
    return new Response(JSON.stringify({ error: "Failed to parse questions. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-from-material error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

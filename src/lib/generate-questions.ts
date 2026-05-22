import { auth } from "@/integrations/firebase/client";

export type AIQuestion = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  alternative_method?: string;
};

const FUNCTIONS_BASE =
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  "https://us-central1-smartlearn-8067e.cloudfunctions.net";

const URL = `${FUNCTIONS_BASE}/generate-questions`;

export async function generateQuestions({
  topic,
  grade,
  count = 5,
  difficulty = "medium",
}: {
  topic: string;
  grade: number;
  count?: number;
  difficulty?: string;
}): Promise<AIQuestion[]> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : "";

  const resp = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ topic, grade, count, difficulty }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Request failed (${resp.status})`);
  }

  const data = await resp.json();
  return data.questions;
}

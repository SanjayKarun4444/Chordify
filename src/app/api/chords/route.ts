import { NextResponse } from "next/server";
import { detectGenre } from "@/lib/ai/genre-detection";
import { BASE_SYSTEM, GENRE_CONTEXTS } from "@/lib/ai/genre-contexts";
import { humanizeVelocities } from "@/lib/ai/velocity-profiles";
import { validateCoherence } from "@/lib/ai/coherence-validator";
import { parseAIResponse } from "@/lib/ai/response-parser";

function buildSystemPrompt(userMessage: string): string {
  const genre = detectGenre(userMessage);
  const genreCtx = genre ? GENRE_CONTEXTS[genre] : null;
  return genreCtx ? `${BASE_SYSTEM}\n\n${genreCtx}` : BASE_SYSTEM;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY in environment" },
      { status: 500 },
    );
  }

  const { conversationHistory = [], userMessage, currentProgression } = await request.json();

  if (!userMessage || typeof userMessage !== "string") {
    return NextResponse.json(
      { error: "userMessage is required and must be a string" },
      { status: 400 },
    );
  }

  const detectedGenre = detectGenre(userMessage);
  const systemPrompt = buildSystemPrompt(userMessage);
  const trimmedHistory = conversationHistory.slice(-10);

  // Inject current progression context so the AI knows what's playing
  let augmentedMessage = userMessage;
  if (currentProgression) {
    const p = currentProgression;
    augmentedMessage =
      `CURRENT_PROGRESSION: ${JSON.stringify({ chords: p.chords, key: p.key, tempo: p.tempo, genre: p.genre, mood: p.mood, bars: p.bars || p.chords?.length, swing: p.swing })}\n\n` +
      `USER REQUEST: ${userMessage}`;
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...trimmedHistory,
    { role: "user", content: augmentedMessage },
  ];

  try {
    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages,
          temperature: 0.72,
          max_tokens: 750,
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, errText);
      return NextResponse.json(
        { error: "OpenAI API error", details: errText },
        { status: 502 },
      );
    }

    const data = await openaiRes.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    const usage = data.usage || {};

    console.log(
      `[${new Date().toISOString()}] genre=${detectedGenre || "auto"} | ` +
        `tokens: ${usage.prompt_tokens}p + ${usage.completion_tokens}c = ${usage.total_tokens}`,
    );

    let parsed;
    try {
      parsed = parseAIResponse(rawContent);
    } catch (parseErr) {
      console.error("Parse failed:", (parseErr as Error).message, "\nRaw:", rawContent);
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: rawContent },
        { status: 500 },
      );
    }

    let coherenceWarnings: string[] = [];
    if (parsed.progression) {
      coherenceWarnings = validateCoherence(parsed.progression as Parameters<typeof validateCoherence>[0]);
      if (coherenceWarnings.length > 0) {
        console.warn("Coherence corrections:", coherenceWarnings);
      }
    }

    if (parsed.progression?.drums) {
      const genre = (
        parsed.progression.genre ||
        detectedGenre ||
        "default"
      ).toLowerCase();
      parsed.progression.drums = humanizeVelocities(
        parsed.progression.drums,
        genre,
      );
    }

    return NextResponse.json({
      message: parsed.message || "",
      progression: parsed.progression || null,
      suggestedInstrument: parsed.suggestedInstrument || null,
      raw: rawContent,
      _meta: {
        genre: detectedGenre || parsed.progression?.genre || null,
        tokens: usage.total_tokens || null,
        model: data.model || "gpt-4o",
        coherenceWarnings,
      },
    });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: (err as Error).message },
      { status: 500 },
    );
  }
}

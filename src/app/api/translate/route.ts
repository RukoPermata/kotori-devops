import { NextResponse } from "next/server";

/**
 * Full Sentence AI Translation API (Disabled by default)
 * To enable in the future:
 * 1. Add your active GEMINI_API_KEY in `.env.local`
 * 2. Uncomment the fetch call and UI card in `src/components/reader/SelectionPopup.tsx`
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// In-memory rate limiting: IP -> [count, resetAt]
const translateRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isTranslateRateLimited(ip: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const record = translateRateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    translateRateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count++;
  return false;
}

export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown-client";

  if (isTranslateRateLimited(ip, 20, 60_000)) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan terjemahan. Silakan coba lagi nanti." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawText = searchParams.get("q")?.trim() || "";
  const text = rawText.slice(0, 300);

  if (!text) {
    return NextResponse.json({ translation: "" });
  }

  if (GEMINI_API_KEY) {
    try {
      const result = await translateWithGemini(text);
      if (result) {
        return NextResponse.json({ translation: result });
      }
    } catch (err) {
      console.error("[translate] Gemini error:", err);
    }
  }

  return NextResponse.json({ translation: "" });
}

async function translateWithGemini(text: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `Terjemahkan kalimat bahasa Jepang berikut ke dalam Bahasa Indonesia yang alami dan akurat. Perhatikan idiom dan nuansa makna, jangan terjemahkan secara harfiah. Hanya berikan hasil terjemahan saja tanpa penjelasan.

Kalimat Jepang:
${text}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256,
      },
    }),
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  const translation = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (translation) {
    return translation;
  }

  return null;
}

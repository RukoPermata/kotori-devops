import { NextResponse } from "next/server";

// In-memory rate limiting with TTL auto-cleanup
const ttsRateLimitMap = new Map<string, { count: number; resetAt: number }>();
let lastTtsCleanup = Date.now();

function isTtsRateLimited(ip: string, limit = 40, windowMs = 60_000): boolean {
  const now = Date.now();
  if (now - lastTtsCleanup > 60_000 || ttsRateLimitMap.size > 5_000) {
    for (const [key, val] of ttsRateLimitMap.entries()) {
      if (now > val.resetAt) ttsRateLimitMap.delete(key);
    }
    lastTtsCleanup = now;
  }

  const record = ttsRateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    ttsRateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
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

  if (isTtsRateLimited(ip, 40, 60_000)) {
    return new NextResponse("Too many TTS requests. Please wait a moment.", { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (!q) {
    return new NextResponse("Missing query", { status: 400 });
  }
  const cleanText = q.substring(0, 150);
  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encodeURIComponent(cleanText)}`;

  try {
    const res = await fetch(ttsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://translate.google.com/",
      },
    });

    if (!res.ok) {
      return new NextResponse("TTS upstream error", { status: res.status });
    }

    const audioBuffer = await res.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("TTS fetch error:", err);
    return new NextResponse("TTS server error", { status: 500 });
  }
}

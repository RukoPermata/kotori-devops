import { NextResponse } from "next/server";
import { dictionaryDb } from "@/services/dictionary-db";

let cachedPack: {
  version: number;
  totalTerms: number;
  totalKanji: number;
  terms: [string, unknown][];
  kanji: [string, unknown][];
} | null = null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Status check for pack availability
  if (searchParams.has("status")) {
    const isReady = dictionaryDb.isReady();
    return NextResponse.json({
      available: isReady,
      estimatedTerms: 15000,
      estimatedKanji: 10384,
    });
  }

  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 15000, 1000), 50000) : 15000;

  if (cachedPack && cachedPack.totalTerms === limit) {
    return NextResponse.json(cachedPack, {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  }

  const packData = dictionaryDb.getOfflinePack(limit);
  if (!packData) {
    return NextResponse.json({ error: "Kamus belum siap atau database tidak ditemukan" }, { status: 503 });
  }

  cachedPack = {
    version: 1,
    totalTerms: packData.terms.length,
    totalKanji: packData.kanji.length,
    terms: packData.terms,
    kanji: packData.kanji,
  };

  return NextResponse.json(cachedPack, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

import { NextResponse } from "next/server";

// In-memory rate limiting: IP -> [timestamp, count]
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count++;
  return false;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(request: Request) {
  try {
    // Get client IP for rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown-client";

    if (isRateLimited(ip, 5, 60_000)) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan feedback. Silakan coba lagi nanti." },
        { status: 429 }
      );
    }

    const { category, message, contact, language } = await request.json();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Pesan tidak boleh kosong" }, { status: 400 });
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { error: "Pesan terlalu panjang (maksimal 1000 karakter)" },
        { status: 400 }
      );
    }

    const cleanMessage = message.trim().slice(0, 1000);
    const cleanContact = typeof contact === "string" ? contact.trim().slice(0, 100) : "";
    const cleanLanguage = typeof language === "string" ? language.trim().slice(0, 10) : "ID";

    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    const categoryLabel =
      category === "bug"
        ? "🐞 Lapor Bug / Error"
        : category === "idea"
        ? "💡 Ide Fitur Baru"
        : "❤️ Apresiasi / Lainnya";

    const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    let sentCount = 0;
    // 1. Send to Discord Webhook if configured
    if (discordWebhookUrl) {
      try {
        const discordPayload = {
          embeds: [
            {
              title: `Kotori Feedback: ${categoryLabel}`,
              color: category === "bug" ? 14423100 : category === "idea" ? 65280 : 16738740,
              fields: [
                {
                  name: "📝 Pesan",
                  value: cleanMessage,
                  inline: false,
                },
                {
                  name: "👤 Kontak User",
                  value: cleanContact || "*Anonim*",
                  inline: true,
                },
                {
                  name: "🌐 Bahasa",
                  value: cleanLanguage,
                  inline: true,
                },
              ],
              footer: {
                text: `Kotori Web App • ${timestamp}`,
              },
            },
          ],
        };

        const res = await fetch(discordWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discordPayload),
        });

        if (res.ok) sentCount++;
      } catch (err) {
        console.error("Failed to send Discord feedback:", err);
      }
    }

    // 2. Send to Telegram Bot if configured
    if (telegramBotToken && telegramChatId) {
      try {
        const teleHtml =
          `🌟 <b>Kotori Feedback Baru!</b>\n\n` +
          `📌 <b>Kategori:</b> ${escapeHtml(categoryLabel)}\n` +
          `📝 <b>Pesan:</b>\n${escapeHtml(cleanMessage)}\n\n` +
          `👤 <b>Kontak:</b> ${escapeHtml(cleanContact || "Anonim")}\n` +
          `🌐 <b>Bahasa:</b> ${escapeHtml(cleanLanguage)}\n` +
          `🕒 <b>Waktu:</b> ${escapeHtml(timestamp)}`;

        const res = await fetch(
          `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: teleHtml,
              parse_mode: "HTML",
            }),
          }
        );

        if (res.ok) sentCount++;
      } catch (err) {
        console.error("Failed to send Telegram feedback:", err);
      }
    }

    // If neither Discord nor Telegram are configured (or both failed),
    // log locally and return success so user UX is preserved in local dev before setup
    if (sentCount === 0) {
      console.log("=== KOTORI FEEDBACK RECEIVED (Local Log) ===");
      console.log(`Category: ${categoryLabel}`);
      console.log(`Message: ${cleanMessage}`);
      console.log(`Contact: ${cleanContact || "Anonymous"}`);
      console.log(`Language: ${cleanLanguage}`);
      console.log("============================================");
    }

    return NextResponse.json({ success: true, sentCount });
  } catch (error) {
    console.error("Feedback API Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem saat mengirim feedback" },
      { status: 500 }
    );
  }
}
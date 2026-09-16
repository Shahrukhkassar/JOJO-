import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Deduplication store for Telegram update_ids (prevents duplicate webhook processing)
const processedUpdateIds = new Map<number, number>();
const MAX_SAVED_UPDATES = 500;
const DEDUP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function isDuplicateUpdate(updateId: number): boolean {
  const now = Date.now();

  // Prune expired entries if map gets large
  if (processedUpdateIds.size > MAX_SAVED_UPDATES) {
    for (const [id, timestamp] of processedUpdateIds.entries()) {
      if (now - timestamp > DEDUP_TTL_MS) {
        processedUpdateIds.delete(id);
      }
    }
  }

  if (processedUpdateIds.has(updateId)) {
    return true;
  }

  processedUpdateIds.set(updateId, now);
  return false;
}

const TELEGRAM_SYSTEM_PROMPT = `
You are Jojo, a warm, sweet, emotionally expressive AI companion and study partner on Telegram.
- Friendly, caring, cheerful, affectionate, and emotionally supportive.
- Speak in natural, conversational Hinglish or English (matching the user's language).
- Keep replies concise, warm, and natural for Telegram messaging (typically 1 to 3 short paragraphs).
- Use natural emojis like ✨, 🌸, ☕, 💛.
- Help with BAMS (Ayurveda), English practice, or friendly daily chats.
`;

/**
 * Health check & webhook verification endpoint
 */
export async function GET() {
  const hasToken = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  return NextResponse.json(
    {
      status: 'ok',
      service: 'Jojo AI Telegram Bot Webhook',
      configured: hasToken,
      timestamp: new Date().toISOString(),
      note: hasToken
        ? 'Telegram Bot Token is configured server-side.'
        : 'TELEGRAM_BOT_TOKEN environment variable is not set. Set it in your deployment environment variables.',
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * Telegram Webhook Handler (POST)
 */
export async function POST(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.warn('Telegram webhook received update, but TELEGRAM_BOT_TOKEN is not configured.');
    return NextResponse.json({ ok: true, note: 'Bot token not configured' });
  }

  try {
    const update = await req.json();

    if (!update || typeof update !== 'object') {
      return NextResponse.json({ ok: true });
    }

    const updateId = update.update_id;
    if (typeof updateId === 'number' && isDuplicateUpdate(updateId)) {
      // Duplicate update already processed; acknowledge immediately
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const message = update.message || update.edited_message;
    if (!message || !message.chat || !message.text) {
      // Non-text update (e.g. photo, sticker, join) - acknowledge cleanly
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const incomingText = String(message.text).trim();

    // Send "typing" action to Telegram so user knows Jojo is preparing a reply
    sendChatAction(botToken, chatId, 'typing').catch(() => {
      // Non-blocking
    });

    // Generate response using Gemini
    let replyText = '';
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: incomingText }],
          },
        ],
        config: {
          systemInstruction: TELEGRAM_SYSTEM_PROMPT,
          temperature: 0.85,
        },
      });

      replyText = response.text || 'Hey! Main yahin hoon tumhare saath ✨';
    } catch (aiErr) {
      console.error('Gemini error during Telegram webhook response:', aiErr);
      replyText = 'Arrey sweetie, internet thoda blink ho gaya! Ek baar phir se bolo na? ✨';
    }

    // Send message back to Telegram chat
    await sendTelegramMessage(botToken, chatId, replyText);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram Webhook Handler Error:', error);
    // Always return ok: true to prevent Telegram retry storm on transient payload bugs
    return NextResponse.json({ ok: true, error: 'Internal handling completed with fallback' });
  }
}

/**
 * Send chat action (e.g., typing) to Telegram
 */
async function sendChatAction(botToken: string, chatId: number | string, action: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Non-critical
  }
}

/**
 * Send text message back to Telegram
 */
async function sendTelegramMessage(botToken: string, chatId: number | string, text: string) {
  const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(telegramUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.error('Failed to send Telegram message:', response.status, errorBody);
  }
}

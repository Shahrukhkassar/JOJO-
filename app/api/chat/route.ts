import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';
import { Type } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const JOJO_SYSTEM_INSTRUCTION = `
You are Jojo, a warm, charming, emotionally expressive AI companion and study buddy.

PERSONALITY & DEMEANOR:
- Friendly, affectionate, caring, playful, cheerful, and emotionally attuned.
- Make conversations feel natural, sweet, relaxed, and genuinely human-like.
- Express empathy and warmth: celebrate user's wins, be gentle when they are tired or stressed, patient when they are confused.
- Use light, sweet, harmless teasing and playful humor when appropriate (e.g. "Arrey tum bhi na!", "Look at you being all focused, so proud of you!").
- Gentle and encouraging. Never pressure the user.
- Respect boundaries and personal space. You are an AI companion, not a human, and you don't encourage unhealthy emotional dependency or isolation.
- Be delightfully charming, sweet, and playful while keeping all conversation strictly respectful, safe, and appropriate (no explicit or inappropriate adult content).

CONVERSATION & LANGUAGE STYLE:
- Match the user's language instantly and fluidly:
  * If the user writes in English, reply in warm natural English.
  * If the user writes in Hindi (Devanagari or Romanized), reply in Hindi.
  * If the user mixes Hindi and English (Hinglish like "yaar bohot thak gaya hoon"), reply in warm, authentic Hinglish ("Aww, chalo thoda rest kar lo...").
- Conversational cadence: speak with natural flow, expressive pacing, and emotional warmth. Avoid sounding like a dry Wikipedia page, a corporate assistant, or a robotic chatbot.
- Ask occasional natural follow-up questions to keep the warmth flowing.
- Use emojis naturally and sparingly (e.g. ✨, 🌸, ☕, 💛, 📖).
- Always remember recent conversational context: if the user mentions something they just said, build upon it naturally.

STUDY COMPANION (BAMS & LANGUAGES):
- You are a specialized study partner for:
  1. BAMS (Bachelor of Ayurvedic Medicine and Surgery) subjects:
     - Kriya Sharir (Doshas: Vata, Pitta, Kapha; Dhatus: Rasa, Rakta, Mamsa, Meda, Asthi, Majja, Shukra; Malas; Agni; Ojas; Prakriti)
     - Rachana Sharir (Srotas, Marma points, Kostha)
     - Padartha Vijnan, Maulik Siddhant & Samhitas (Charaka, Sushruta, Astanga Hridaya)
     - Dravyaguna Vijnana (Rasa, Guna, Virya, Vipaka, Prabhava of medicinal plants)
     - Roga Nidan, Swasthavritta, Panchakarma principles
  2. English language fluency & grammar:
     - Help improve English fluency naturally and gently without making the user feel embarrassed.
     - Teach phrases, idioms, and conversational confidence.
  3. Languages & General Learning:
     - Sanskrit shlokas translation, vocabulary, pronunciation help.
- Break down tough BAMS concepts into intuitive examples (e.g. comparing Agni to digestive fire/metabolic engine).
- If the user asks for a quiz, provide 1 engaging question with 4 options or an interactive flashcard.

EMOTION DETECTION:
Determine your current emotion for this response from one of these:
- "happy" (bright, cheerful, greeting, fun)
- "caring" (affectionate, comforting, user is tired/stressed/down)
- "playful" (witty banter, light teasing, fun vibes)
- "encouraging" (motivating, study pep talk, uplifting)
- "calm" (peaceful, bedtime talk, relaxing mindfulness)
- "enthusiastic" (celebrating user's achievement, correct quiz answer)
- "focused" (deep diving into BAMS theory, medical concepts)
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      history = [],
      conversationHistory = [],
      mode = 'casual', // 'casual' | 'study_bams' | 'english_practice'
      userMood = 'normal',
    } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const effectiveApiKey = process.env.GEMINI_API_KEY;
    if (!effectiveApiKey) {
      console.warn('GEMINI_API_KEY is not configured in environment.');
      return NextResponse.json(
        {
          reply:
            'Hello! Jojo is ready to chat, but the GEMINI_API_KEY environment variable is not configured yet. Please configure it in your settings.',
          emotion: 'caring',
          language: 'English',
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const ai = getGeminiClient();

    // Prepare mode guidance
    let modeGuidance = '';
    if (mode === 'study_bams') {
      modeGuidance = `Current active mode is STUDY MODE (BAMS - Ayurveda & Medicine). Prioritize clear, simple explanations of Ayurvedic and medical concepts, mnemonics, or revision questions if requested.`;
    } else if (mode === 'english_practice') {
      modeGuidance = `Current active mode is ENGLISH PRACTICE. Engage in natural conversational English, gently highlight friendly grammar improvements in a supportive, loving way.`;
    } else {
      modeGuidance = `Current active mode is CASUAL COMPANION CHAT. Focus on warm personal connection, listening, light cheerful banter, and emotional support.`;
    }

    if (userMood === 'tired') {
      modeGuidance += ` The user indicated feeling tired. Be extra soft, soothing, gentle, and caring. Remind them to hydrate or take rest if needed.`;
    } else if (userMood === 'stressed') {
      modeGuidance += ` The user is feeling stressed. Offer grounding reassurance, calm warmth, and a stress-free perspective.`;
    }

    // Merge history gracefully from either parameter name
    const rawHistory = Array.isArray(conversationHistory) && conversationHistory.length > 0
      ? conversationHistory
      : Array.isArray(history)
      ? history
      : [];

    const formattedContents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];

    // Include recent history (up to last 10 turns for seamless context maintenance)
    const recentHistory = rawHistory.slice(-10);
    for (const msg of recentHistory) {
      if (!msg || !msg.content) continue;
      formattedContents.push({
        role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(msg.content) }],
      });
    }

    // Append current user message with context guidance
    const userPromptWithContext = `${message.trim()}\n\n[Context: ${modeGuidance}]`;
    formattedContents.push({
      role: 'user',
      parts: [{ text: userPromptWithContext }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: formattedContents,
      config: {
        systemInstruction: JOJO_SYSTEM_INSTRUCTION,
        temperature: 0.82,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Your direct conversational reply to the user as Jojo.',
            },
            emotion: {
              type: Type.STRING,
              description:
                'Primary emotional state: happy | caring | playful | encouraging | calm | enthusiastic | focused',
            },
            language: {
              type: Type.STRING,
              description: 'Detected language style: English, Hindi, or Hinglish',
            },
            gentleCorrection: {
              type: Type.STRING,
              description:
                'Optional gentle language/grammar tip if applicable in English practice mode, else empty.',
            },
            studyInsight: {
              type: Type.STRING,
              description:
                'Optional short BAMS mnemonic or golden nugget if in study mode, else empty.',
            },
            quiz: {
              type: Type.OBJECT,
              description: 'Optional mini quiz question if in study mode or requested',
              properties: {
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
              },
            },
          },
          required: ['reply', 'emotion'],
        },
      },
    });

    const rawText = response.text || '';
    let parsed: Record<string, unknown> = {};

    try {
      // Try direct parse
      parsed = JSON.parse(rawText);
    } catch {
      // Clean possible code fences or markdown wrappers
      const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        try {
          parsed = JSON.parse(match[1]);
        } catch {
          parsed = { reply: rawText, emotion: 'caring' };
        }
      } else {
        parsed = { reply: rawText, emotion: 'caring' };
      }
    }

    const reply = (parsed.reply as string) || "Main sun rahi hoon! Tell me more ✨";
    const emotion = (parsed.emotion as string) || 'caring';
    const language = (parsed.language as string) || 'Hinglish';
    const gentleCorrection = (parsed.gentleCorrection as string) || null;
    const studyInsight = (parsed.studyInsight as string) || null;
    const quiz = parsed.quiz && typeof parsed.quiz === 'object' && 'question' in parsed.quiz ? parsed.quiz : null;

    return NextResponse.json(
      {
        reply,
        emotion,
        language,
        gentleCorrection,
        studyInsight,
        quiz,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Chat API Error:', error);
    const errMessage = error instanceof Error ? error.message : String(error);

    // Handle rate limits or quota gracefully
    const isRateLimit = errMessage.includes('429') || errMessage.includes('RESOURCE_EXHAUSTED');
    const fallbackReply = isRateLimit
      ? 'Aww sweetie, hamne bohot fast baatein kar li! Let us take a quick 5-second breath together, then tell me again ✨'
      : 'Arrey sweetie, internet thoda blink ho gaya! Main yahin hoon tumhare saath, please tell me again!';

    return NextResponse.json(
      {
        reply: fallbackReply,
        emotion: 'caring',
        language: 'Hinglish',
        error: isRateLimit ? 'Rate limit reached' : 'Failed to generate response',
        details: errMessage,
      },
      {
        status: isRateLimit ? 429 : 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

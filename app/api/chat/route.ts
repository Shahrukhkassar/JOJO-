import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';
import { Type } from '@google/genai';

export const runtime = 'nodejs';

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
- Medium-paced, expressive conversational tone. Avoid sounding like a dry Wikipedia page or a formal robot.
- Ask occasional natural follow-up questions to keep the warmth flowing.
- Use emojis naturally and sparingly (e.g. ✨, 🌸, ☕, 💛, 📖).

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
      mode = 'casual', // 'casual' | 'study_bams' | 'english_practice'
      userMood = 'normal',
    } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();

    // Prepare context based on mode
    let modeGuidance = '';
    if (mode === 'study_bams') {
      modeGuidance = `Current active mode is STUDY MODE (BAMS - Ayurveda & Medicine). Prioritize clear, simple explanations of Ayurvedic and medical concepts, mnemonics, or revision questions if the user requests.`;
    } else if (mode === 'english_practice') {
      modeGuidance = `Current active mode is ENGLISH PRACTICE. Engage in conversational English, gently highlight any friendly grammar improvements in a loving, encouraging way.`;
    } else {
      modeGuidance = `Current active mode is CASUAL COMPANION CHAT. Focus on warm connection, sharing your day, listening, light banter, and emotional support.`;
    }

    if (userMood === 'tired') {
      modeGuidance += ` The user indicated feeling tired. Be extra soft, soothing, gentle, and caring. Remind them to hydrate or take rest if needed.`;
    } else if (userMood === 'stressed') {
      modeGuidance += ` The user is feeling stressed. Offer grounding reassurance, calm warmth, and a stress-free perspective.`;
    }

    // Format chat history
    const formattedContents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];

    // Include recent history (last 8 turns)
    const recentHistory = history.slice(-8);
    for (const msg of recentHistory) {
      formattedContents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // Append latest message with context note
    const userPromptWithContext = `${message}\n\n[Context: ${modeGuidance}]`;
    formattedContents.push({
      role: 'user',
      parts: [{ text: userPromptWithContext }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: formattedContents,
      config: {
        systemInstruction: JOJO_SYSTEM_INSTRUCTION,
        temperature: 0.85,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Your direct reply to the user as Jojo in natural conversational tone.',
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
              description: 'Optional mini quiz question if study mode or requested',
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

    const text = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        reply: text,
        emotion: 'caring',
      };
    }

    return NextResponse.json({
      reply: parsed.reply || "Hey there! Main sun rahi hoon... tell me more!",
      emotion: parsed.emotion || 'caring',
      language: parsed.language || 'English',
      gentleCorrection: parsed.gentleCorrection || null,
      studyInsight: parsed.studyInsight || null,
      quiz: parsed.quiz?.question ? parsed.quiz : null,
    });
  } catch (error: unknown) {
    console.error('Chat API Error:', error);
    const errMessage = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json(
      {
        error: 'Failed to generate response',
        details: errMessage,
        fallbackReply:
          'Arrey, lagta hai network thoda slow ho gaya... Can you say that again, sweetie? Main yahin hoon!',
        emotion: 'caring',
      },
      { status: 500 }
    );
  }
}

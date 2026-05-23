/**
 * POST /api/draft
 * Принимает JSON: { review_text: string, tone: 'friendly' | 'formal' }
 * Генерирует дипломатичный ответ на немецком языке через Gemini Flash API.
 * Ответ: { draft: string }
 */

const GEMINI_MODEL = 'gemini-3-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const TONE_INSTRUCTIONS = {
  friendly: 'Du antwortest freundlich, herzlich und empathisch. Nutze einen warmen, einladenden Ton.',
  formal: 'Du antwortest professionell und förmlich. Nutze die Anrede "Sehr geehrter Gast" und formelle Sprache.',
};

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const { review_text, tone } = body;

  if (!review_text || typeof review_text !== 'string') {
    return jsonError('review_text is required', 400);
  }

  const resolvedTone = tone === 'formal' ? 'formal' : 'friendly';
  const toneInstruction = TONE_INSTRUCTIONS[resolvedTone];

  const apiKey = import.meta.env.GEMINI_API_KEY;

  // Showcase Mode: Если ключ не задан или заглушка
  if (!apiKey || apiKey.includes('your_gemini_api_key')) {
    const responses = {
      friendly: "Hallo! Vielen Dank für Ihr Feedback. Es freut uns, dass Ihnen das Essen geschmeckt hat. Bezüglich der Sprache arbeiten wir bereits an einer Lösung. Kommen Sie bald wieder!",
      formal: "Sehr geehrter Gast, wir danken Ihnen vielmals für Ihren Besuch und Ihre ehrliche Bewertung. Wir bedauern die Unannehmlichkeiten bezüglich der Verständigung und werden dies intern besprechen."
    };
    return new Response(JSON.stringify({ draft: responses[resolvedTone] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const prompt = `Du bist ein professioneller Reputationsmanager für ein Restaurant in Deutschland.
${toneInstruction}
Deine Aufgabe: Verfasse eine kurze, höfliche Antwort auf die folgende Gästebewertung auf Deutsch.
Die Antwort soll max. 3-4 Sätze lang sein, konkret auf den Inhalt der Bewertung eingehen und zur Wiederkehr einladen.

Gästebewertung: "${review_text}"

Schreibe NUR die fertige Antwort, ohne Einleitung oder Erklärung.`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 300,
    },
  };

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return jsonError(`Gemini API error: ${response.status}`, 502);
    }

    const data = await response.json();
    const draft = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!draft) {
      return jsonError('Gemini returned empty response', 502);
    }

    return new Response(JSON.stringify({ draft: draft.trim() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return jsonError('Failed to reach Gemini API', 502);
  }
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

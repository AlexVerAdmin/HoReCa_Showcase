/**
 * GET /api/autocomplete
 * Проксирует запрос к Google Places Autocomplete API.
 * Параметр: query (строка поиска)
 * Ответ: [{ place_id, description }]
 */
export async function GET({ request }) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  if (!query || query.trim().length < 2) {
    return new Response(JSON.stringify({ error: 'query param is required (min 2 chars)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = import.meta.env.GOOGLE_MAPS_API_KEY;

  // Showcase Mode: Если ключ не задан или является заглушкой
  if (!apiKey || apiKey.includes('your_google_maps_api_key')) {
    return new Response(JSON.stringify([
      { place_id: "mock_1", description: "VestaMate Demo Restaurant, Berlin" },
      { place_id: "mock_2", description: "Pizzeria Fantasia, Munich" }
    ]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const params = new URLSearchParams({
    input: query,
    types: 'restaurant|food|cafe|bar',
    language: 'de',
    key: apiKey,
  });

  const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;

  try {
    const response = await fetch(googleUrl);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return new Response(JSON.stringify({ error: `Google API error: ${data.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const predictions = (data.predictions || []).map((p) => ({
      place_id: p.place_id,
      description: p.description,
    }));

    return new Response(JSON.stringify(predictions), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to reach Google API' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

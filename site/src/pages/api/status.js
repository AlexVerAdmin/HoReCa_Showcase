/**
 * GET /api/status
 * Возвращает данные дашборда для Hero-блока Фазы 3 (Активный клиент).
 *
 * Параметры: access_token (query param)
 * Ответ: { new_reviews_7d, last_ai_reply_status }
 *
 * TODO: В production заменить mock на реальный запрос к Portal API:
 *   GET https://portal.vestamate.de/api/v1/status
 *   Authorization: Bearer <access_token>
 */
export async function GET({ request }) {
  const url = new URL(request.url);
  const accessToken = url.searchParams.get('access_token');

  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'access_token is required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // TODO: Раскомментировать при подключении Portal API
  // const portalRes = await fetch('https://portal.vestamate.de/api/v1/status', {
  //   headers: { Authorization: `Bearer ${accessToken}` },
  // });
  // if (!portalRes.ok) {
  //   return new Response(JSON.stringify({ error: 'Portal API error' }), {
  //     status: portalRes.status,
  //     headers: { 'Content-Type': 'application/json' },
  //   });
  // }
  // return new Response(await portalRes.text(), {
  //   status: 200,
  //   headers: { 'Content-Type': 'application/json' },
  // });

  // Mock-данные для локальной разработки
  return new Response(
    JSON.stringify({
      new_reviews_7d: 4,
      last_ai_reply_status: 'Gesendet vor 2 Std.',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

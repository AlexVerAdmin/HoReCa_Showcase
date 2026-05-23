/**
 * POST /api/audit
 * Принимает JSON: { place_id: string }
 * Запрашивает Google Places Details, извлекает рейтинг/отзывы/последний отзыв.
 * Рассчитывает ROI (упущенную выгоду) по формуле из landing-config.json.
 * Ответ: { name, rating, user_ratings_total, latest_review, roi }
 */
import config from '../../config/landing-config.json';

const FIELDS = 'name,rating,user_ratings_total,reviews';

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const { place_id } = body;
  if (!place_id || typeof place_id !== 'string') {
    return jsonError('place_id is required', 400);
  }

  const apiKey = import.meta.env.GOOGLE_MAPS_API_KEY;

  // Showcase Mode: Если это mock-ID или ключ — заглушка
  if (place_id.startsWith('mock_') || !apiKey || apiKey.includes('your_google_maps_api_key')) {
    const demo = config.scenarios[0];
    return new Response(JSON.stringify({
      name: "VestaMate Showcase Restaurant",
      rating: 3.8,
      user_ratings_total: 450,
      latest_review: {
        text: demo.review,
        author: "Max Mustermann",
        rating: 3
      },
      roi: {
        lostGuestsPercent: 35,
        lostRevenueEur: 1450,
        currency: "€"
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const params = new URLSearchParams({
    place_id,
    fields: FIELDS,
    language: 'de',
    key: apiKey,
  });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`
    );
    const data = await response.json();

    if (data.status !== 'OK') {
      return jsonError(`Google API error: ${data.status}`, 502);
    }

    const place = data.result;
    const { guest_loss_per_star, avg_check_eur, loss_multiplier } = config.roi_formula;

    // Вычисляем ROI только если рейтинг ниже целевого порога 4.5
    const TARGET_RATING = 4.5;
    const rating = place.rating ?? 0;
    const totalReviews = place.user_ratings_total ?? 0;

    let roi = null;
    if (rating > 0 && rating < TARGET_RATING) {
      const ratingGap = TARGET_RATING - rating;
      const lostGuestsPercent = ratingGap * guest_loss_per_star;
      // Оцениваем кол-во уникальных гостей в месяц как totalReviews / 12
      const monthlyGuests = totalReviews / 12;
      const lostRevenue = monthlyGuests * avg_check_eur * (lostGuestsPercent / 100) * loss_multiplier;
      roi = {
        lostGuestsPercent: Math.round(lostGuestsPercent),
        lostRevenueEur: Math.round(lostRevenue),
        currency: config.roi_formula.currency,
      };
    }

    // Берём первый (самый новый) отзыв из ответа Google
    const reviews = place.reviews ?? [];
    const latestReview = reviews.length > 0
      ? {
          text: reviews[0].text,
          language: reviews[0].language,
          author: reviews[0].author_name,
          rating: reviews[0].rating,
        }
      : null;

    return new Response(
      JSON.stringify({
        name: place.name,
        rating,
        user_ratings_total: totalReviews,
        latest_review: latestReview,
        roi,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return jsonError('Failed to reach Google API', 502);
  }
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

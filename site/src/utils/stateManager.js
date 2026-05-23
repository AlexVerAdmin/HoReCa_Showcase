/**
 * stateManager.js — Клиентская стейт-машина воронки VestaMate.
 * Работает только в браузере (localStorage + Cookies).
 *
 * Фазы воронки:
 *   0 — Анонимный (нет place_id, нет токена)
 *   1 — Cookie-Saved (place_id сохранён, токена нет)
 *   2 — Зарегистрирован, без интеграции Google Business
 *   3 — Активный клиент (токен + интеграция активна)
 */

/** Читает cookie по имени. */
function getCookie(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Определяет текущую фазу пользователя.
 * @returns {0|1|2|3}
 */
export function getState() {
  const accessToken = getCookie('access_token');
  if (accessToken) {
    return getCookie('user_state') === 'active' ? 3 : 2;
  }
  return localStorage.getItem('place_id') ? 1 : 0;
}

/**
 * Сохраняет результаты аудита в localStorage после выбора заведения.
 * @param {string} place_id
 * @param {string} restaurant_name
 * @param {object} audit_data
 */
export function setState(place_id, restaurant_name, audit_data) {
  localStorage.setItem('place_id', place_id);
  localStorage.setItem('restaurant_name', restaurant_name);
  localStorage.setItem('audit_data', JSON.stringify(audit_data));
}

/**
 * Возвращает сохранённые данные из localStorage.
 * @returns {{ place_id: string|null, restaurant_name: string|null, audit_data: object|null }}
 */
export function getStoredData() {
  return {
    place_id: localStorage.getItem('place_id'),
    restaurant_name: localStorage.getItem('restaurant_name'),
    audit_data: JSON.parse(localStorage.getItem('audit_data') || 'null'),
  };
}

/** Сбрасывает состояние (используется при logout или для тестирования). */
export function clearState() {
  localStorage.removeItem('place_id');
  localStorage.removeItem('restaurant_name');
  localStorage.removeItem('audit_data');
}

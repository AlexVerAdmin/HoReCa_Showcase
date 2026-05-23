<!--
  AuditResult.svelte
  Hero 1 — ROI-калькулятор + ИИ-симулятор ответов.
  Загружает данные из localStorage (из /api/audit), при их отсутствии — demo из landing-config.json.
  Вызывает /api/draft для генерации ответа, поддерживает typing effect и переключение тональности.
-->
<script>
  import { onMount } from 'svelte';
  import config from '../config/landing-config.json';

  const TARGET_RATING = 4.5;

  let auditData = null;
  let reviewText  = '';
  let restaurantName = '';
  let placeId = '';
  let tone = 'friendly';
  let typedText = '';
  let isLoadingDraft = true;
  let isFading = false;
  let typingTimer = null;
  let registerUrl = 'https://portal.vestamate.de/register';

  // TASK-LND-007: Google Maps avatar
  let avatarColor = '#4285F4';
  let avatarInitial = 'G';
  let reviewRating = 3;

  onMount(async () => {
    const raw = localStorage.getItem('audit_data');
    auditData = raw ? JSON.parse(raw) : null;
    restaurantName = localStorage.getItem('restaurant_name') || '';
    placeId = localStorage.getItem('place_id') || '';
    registerUrl = `https://portal.vestamate.de/register?place_id=${encodeURIComponent(placeId)}&restaurant_name=${encodeURIComponent(restaurantName)}`;

    // Реальный отзыв из аудита или fallback на демо-сценарий
    reviewText = auditData?.latest_review?.text || config.scenarios[0].review;
    reviewRating = auditData?.latest_review?.rating || 3;
    const reviewAuthor = auditData?.latest_review?.author || 'Gast';
    avatarInitial = reviewAuthor.charAt(0).toUpperCase();
    avatarColor = getAvatarColor(reviewAuthor);

    await fetchDraft();
  });

  async function fetchDraft() {
    isLoadingDraft = true;
    stopTyping();
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_text: reviewText, tone }),
      });
      const data = await res.json();
      startTyping(data.draft || config.scenarios[0].responses[tone]);
    } catch {
      // Fallback на локальный демо-ответ если API недоступен
      startTyping(config.scenarios[0].responses[tone]);
    }
    isLoadingDraft = false;
  }

  async function switchTone(newTone) {
    if (tone === newTone || isLoadingDraft) return;
    tone = newTone;
    isFading = true;
    stopTyping();
    await new Promise(r => setTimeout(r, 250));
    await fetchDraft();
    isFading = false;
  }

  function startTyping(text) {
    typedText = '';
    let i = 0;
    function tick() {
      if (i < text.length) {
        typedText = text.slice(0, ++i);
        typingTimer = setTimeout(tick, 45);
      }
    }
    tick();
  }

  function stopTyping() {
    if (typingTimer) clearTimeout(typingTimer);
    typedText = '';
  }

  // Отображение звёзд (до 5)
  function starsHtml(rating) {
    const full = Math.round(rating);
    return '⭐'.repeat(full);
  }

  // TASK-LND-007: цвет аватара по первой букве имени (детерминировано)
  function getAvatarColor(name) {
    const colors = ['#DB4437', '#4285F4', '#0F9D58', '#F4B400', '#FF6D00', '#7B1FA2', '#00796B'];
    return colors[(name.charCodeAt(0) || 0) % colors.length];
  }
</script>

<div class="w-full max-w-3xl mx-auto">

  <!-- ── ROI-блок ── -->
  {#if auditData}
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div class="flex items-center gap-3">
        <span class="text-3xl font-bold text-slate-100">{auditData.rating?.toFixed(1)}</span>
        <span class="text-xl">{starsHtml(auditData.rating)}</span>
        <span class="text-sm text-slate-400">({auditData.user_ratings_total?.toLocaleString('de')} Bewertungen)</span>
      </div>

      {#if auditData.roi}
        <div class="sm:ml-auto bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-left">
          <p class="text-red-400 font-semibold text-sm">
            Sie verlieren ca. <span class="text-red-300 font-bold">{auditData.roi.lostGuestsPercent}%</span> der Gäste
          </p>
          <p class="text-slate-400 text-xs mt-0.5">
            ≈ <span class="text-slate-200 font-medium">{auditData.roi.currency}{auditData.roi.lostRevenueEur.toLocaleString('de')}/Monat</span> entgangener Umsatz
          </p>
        </div>
      {:else}
        <div class="sm:ml-auto bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
          <p class="text-emerald-400 font-semibold text-sm">Ausgezeichnetes Rating!</p>
          <p class="text-slate-400 text-xs mt-0.5">Halten Sie dieses Niveau mit KI-Antworten.</p>
        </div>
      {/if}
    </div>
  {/if}

  <!-- ── ИИ-симулятор: отзыв слева, ответ справа ── -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 cards-perspective">

    <!-- Левая колонка: оригинальный отзыв (стиль Google Maps) -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 card-3d-left">

      <!-- Шапка: аватар + автор + звёзды + Google-бейдж -->
      <div class="flex items-start gap-3 mb-4">
        <div class="gmap-avatar" style="background-color: {avatarColor}">
          {avatarInitial}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-slate-200 text-sm font-semibold truncate">
            {auditData?.latest_review?.author || 'Gast'}
          </p>
          <div class="flex gap-0.5 mt-1">
            {#each Array(reviewRating) as _}
              <span class="text-amber-400 text-sm leading-none">★</span>
            {/each}
            {#each Array(5 - reviewRating) as _}
              <span class="text-slate-600 text-sm leading-none">★</span>
            {/each}
          </div>
        </div>
        <!-- Google Maps badge -->
        <div class="gmap-badge flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#4285F4"/>
          </svg>
          <span>Google</span>
        </div>
      </div>

      <p class="text-slate-300 text-sm leading-relaxed">"{reviewText}"</p>
    </div>

    <!-- Правая колонка: AI-ответ -->
    <div class="bg-slate-900 border border-amber-400/20 rounded-2xl p-5 relative card-3d-right">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
            <svg class="w-3 h-3 text-slate-950" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <p class="text-[11px] text-amber-400 uppercase tracking-wider font-bold">Antwort vom Inhaber (VestaMate)</p>
        </div>
        <!-- Переключатель тональности -->
        <div class="flex gap-1 bg-slate-800 rounded-lg p-0.5">
          <button
            on:click={() => switchTone('friendly')}
            class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-150 {tone === 'friendly' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-slate-200'}"
          >Freundlich</button>
          <button
            on:click={() => switchTone('formal')}
            class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-150 {tone === 'formal' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-slate-200'}"
          >Förmlich</button>
        </div>
      </div>

      <!-- Текст ответа с эффектом печати -->
      <div class="min-h-[120px] transition-opacity duration-250 {isFading ? 'opacity-0' : 'opacity-100'}">
        {#if isLoadingDraft && !typedText}
          <div class="space-y-2.5 pt-1">
            <div class="h-2 bg-slate-700 rounded animate-pulse"></div>
            <div class="h-2 bg-slate-700 rounded animate-pulse w-5/6"></div>
            <div class="h-2 bg-slate-700 rounded animate-pulse w-4/6"></div>
          </div>
        {:else}
          <p class="text-slate-300 text-sm leading-relaxed">{typedText}<span class="animate-pulse text-amber-400">{isLoadingDraft ? '' : (typedText.length > 0 ? '' : '')}</span></p>
        {/if}
      </div>
    </div>
  </div>

  <!-- ── CTA Кнопка ── -->
  <a
    href={registerUrl}
    class="block w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-4 px-8 rounded-xl text-lg text-center transition-colors duration-200"
  >
    Diese Antwort nehmen &amp; auf Google veröffentlichen →
  </a>

</div>

<style>
  /* TASK-LND-007: 3D-perspective контейнер для карточек симулятора */
  .cards-perspective {
    perspective: 2000px;
    perspective-origin: 50% 50%;
  }

  /* Левая карточка: наклон вправо-вниз */
  .card-3d-left {
    transform: perspective(2000px) rotateY(15deg) rotateX(5deg);
    transform-style: preserve-3d;
    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.5s ease;
    box-shadow: 
      -20px 25px 50px rgba(0, 0, 0, 0.7), 
      10px 0 20px rgba(0, 0, 0, 0.4);
    will-change: transform;
    backface-visibility: hidden;
  }

  /* Правая карточка: наклон влево-вниз (зеркальный) */
  .card-3d-right {
    transform: perspective(2000px) rotateY(-15deg) rotateX(5deg);
    transform-style: preserve-3d;
    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.5s ease;
    box-shadow: 
      20px 25px 50px rgba(0, 0, 0, 0.7), 
      -10px 0 20px rgba(0, 0, 0, 0.4);
    will-change: transform;
    backface-visibility: hidden;
  }

  /* Hover: карточка выравнивается и "выпрыгивает" */
  .card-3d-left:hover,
  .card-3d-right:hover {
    transform: perspective(2000px) rotateY(0deg) rotateX(0deg) scale(1.05) translateZ(50px);
    box-shadow: 0 40px 80px rgba(0, 0, 0, 0.82);
    z-index: 50;
  }

  /* Mobile: отключаем 3D для читаемости */
  @media (max-width: 768px) {
    .cards-perspective {
      perspective: none;
    }
    .card-3d-left,
    .card-3d-right {
      transform: none !important;
      box-shadow: none !important;
    }
  }

  /* Google Maps card elements */
  .gmap-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 15px;
    color: #ffffff;
    flex-shrink: 0;
    text-transform: uppercase;
    user-select: none;
  }

  .gmap-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    color: #6b7280;
    flex-shrink: 0;
  }
</style>

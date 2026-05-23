<!--
  SearchWidget.svelte
  Hero 0 — Виджет поиска ресторана.
  Поток: ввод → /api/autocomplete → выбор → /api/audit → setState → переход к Hero 1
-->
<script>
  import { setState } from '../utils/stateManager.js';

  let query = '';
  let suggestions = [];
  let showDropdown = false;
  let phase = 'idle'; // 'idle' | 'loading'
  let errorMsg = '';
  let debounceTimer;

  async function onInput() {
    clearTimeout(debounceTimer);
    showDropdown = false;
    errorMsg = '';
    if (query.trim().length < 2) { suggestions = []; return; }

    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?query=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        suggestions = Array.isArray(data) ? data : [];
        showDropdown = suggestions.length > 0;
      } catch {
        suggestions = [];
      }
    }, 350);
  }

  async function selectPlace(place) {
    query = place.description;
    showDropdown = false;
    suggestions = [];
    phase = 'loading';
    errorMsg = '';

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: place.place_id }),
      });
      const audit = await res.json();
      if (audit.error) throw new Error(audit.error);

      // Сохраняем данные и переключаем стейт-машину
      setState(place.place_id, audit.name, audit);

      document.getElementById('hero-0')?.classList.add('hidden');
      const hero1 = document.getElementById('hero-1');
      if (hero1) {
        hero1.classList.remove('hidden');
        document.querySelectorAll('[data-restaurant-name]').forEach(el => {
          el.textContent = audit.name;
        });
      }
    } catch {
      phase = 'idle';
      errorMsg = 'Fehler beim Laden. Bitte versuchen Sie es erneut.';
    }
  }

  function closeDropdown(e) {
    if (!e.target.closest('[data-search-widget]')) showDropdown = false;
  }
</script>

<svelte:window on:click={closeDropdown} />

<div class="max-w-lg mx-auto" data-search-widget>

  {#if phase === 'idle'}
    <!-- ── Поле ввода ── -->
    <div class="relative">
      <div class="flex items-center gap-3 bg-slate-800 border border-slate-700 focus-within:border-amber-400 rounded-xl px-5 py-4 transition-colors duration-200">
        <svg class="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          type="text"
          bind:value={query}
          on:input={onInput}
          placeholder="Name Ihres Restaurants eingeben…"
          class="bg-transparent outline-none flex-1 text-slate-100 placeholder-slate-500 text-base"
          autocomplete="off"
        />
      </div>

      <!-- Dropdown с подсказками -->
      {#if showDropdown}
        <div class="absolute top-full mt-2 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {#each suggestions as s}
            <button
              on:click={() => selectPlace(s)}
              class="w-full text-left px-5 py-3.5 text-sm text-slate-200 hover:bg-slate-700 transition-colors duration-150 flex items-center gap-3"
            >
              <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              {s.description}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <button
      on:click={() => suggestions[0] && selectPlace(suggestions[0])}
      disabled={query.trim().length < 2}
      class="mt-4 w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold py-4 px-8 rounded-xl text-lg transition-colors duration-200"
    >
      Kostenlosen Audit starten →
    </button>

    {#if errorMsg}
      <p class="mt-3 text-sm text-red-400 text-center">{errorMsg}</p>
    {/if}

  {:else}
    <!-- ── Skeleton-лоадер: имитация сканирования ── -->
    <div class="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center">
      <div class="flex items-center justify-center gap-2 mb-5">
        <div class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.3s]"></div>
        <div class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.15s]"></div>
        <div class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce"></div>
      </div>
      <p class="text-slate-200 font-semibold mb-1">Google-Profil wird analysiert…</p>
      <p class="text-slate-500 text-sm mb-6">Bewertungen · Ratingverlauf · KI-Potenzial</p>
      <div class="space-y-3">
        <div class="h-2.5 bg-slate-700 rounded-full animate-pulse"></div>
        <div class="h-2.5 bg-slate-700 rounded-full animate-pulse w-5/6"></div>
        <div class="h-2.5 bg-slate-700 rounded-full animate-pulse w-4/6"></div>
        <div class="h-2.5 bg-slate-700 rounded-full animate-pulse w-3/6"></div>
      </div>
    </div>
  {/if}

</div>

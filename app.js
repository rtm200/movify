  // Using TMDB API
  const API_KEY = 'a17272baea2dd98df6b4879f308103f5';
  const BASE    = 'https://api.themoviedb.org/3';
  const IMG     = 'https://image.tmdb.org/t/p/';

  let heroMovies = [];
  let heroIndex  = 0;
  let heroTimer  = null;
  let genres     = {};
  let currentMediaType = 'movie';

  async function api(path) {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${BASE}${path}${sep}api_key=${API_KEY}&language=en-US`);
    return res.json();
  }

 
  async function init() {
    await fetchGenres();
    loadHero();
    loadTrending('day');
    loadMovies('popular');
    loadTV('popular');
    renderMovieGenreChips();
  }

  async function fetchGenres() {
    const [m, t] = await Promise.all([
      api('/genre/movie/list'),
      api('/genre/tv/list')
    ]);
    [...(m.genres || []), ...(t.genres || [])].forEach(g => genres[g.id] = g.name);
  }


  async function loadHero() {
    const data = await api('/movie/popular?page=1');
    heroMovies = (data.results || []).filter(m => m.backdrop_path).slice(0, 5);
    renderHero();
    renderHeroDots();
    startHeroTimer();
  }

  function renderHero() {
    const m = heroMovies[heroIndex];
    if (!m) return;
    document.getElementById('heroBg').style.backgroundImage =
      `url(${IMG}w1280${m.backdrop_path})`;
    document.getElementById('heroTitle').textContent = m.title || m.name;
    document.getElementById('heroRating').textContent = m.vote_average?.toFixed(1) || '—';
    document.getElementById('heroYear').textContent =
      (m.release_date || m.first_air_date || '').slice(0,4) || '—';
    document.getElementById('heroGenre').textContent =
      (m.genre_ids || []).slice(0,2).map(id => genres[id]).filter(Boolean).join(' · ');
    document.getElementById('heroOverview').textContent = m.overview || '';
    document.getElementById('heroDetailsBtn').onclick = () => openModal(m.id, 'movie');
    renderHeroDots();
  }

  function renderHeroDots() {
    const c = document.getElementById('heroDots');
    c.innerHTML = heroMovies.map((_, i) =>
      `<div class="hero-dot ${i===heroIndex?'active':''}" onclick="setHero(${i})"></div>`
    ).join('');
  }

  function setHero(i) { heroIndex = i; renderHero(); resetHeroTimer(); }
  function nextHero() { heroIndex = (heroIndex+1) % heroMovies.length; renderHero(); resetHeroTimer(); }
  function startHeroTimer() { heroTimer = setInterval(nextHero, 6000); }
  function resetHeroTimer() { clearInterval(heroTimer); startHeroTimer(); }

  async function loadTrending(window, tabEl) {
    activateTab(tabEl, 'trendingGrid');
    showLoader('trendingGrid');
    const data = await api(`/trending/all/${window}`);
    renderGrid('trendingGrid', data.results || []);
  }

  let currentMovieGenre = null;

  async function loadMovies(type, tabEl) {
    activateTab(tabEl, 'moviesGrid');
    showLoader('moviesGrid');
    let path = `/movie/${type}`;
    if (currentMovieGenre) path += `?with_genres=${currentMovieGenre}`;
    const data = await api(path);
    renderGrid('moviesGrid', data.results || [], 'movie');
  }

  async function renderMovieGenreChips() {
    const container = document.getElementById('movieGenreChips');
    for (let i=0; i<10; i++) {
      if (Object.keys(genres).length > 0) break;
      await new Promise(r => setTimeout(r, 300));
    }
    const movieGenres = [
      {id:28,'name':'Action'},{id:12,'name':'Adventure'},{id:16,'name':'Animation'},
      {id:35,'name':'Comedy'},{id:80,'name':'Crime'},{id:99,'name':'Documentary'},
      {id:18,'name':'Drama'},{id:14,'name':'Fantasy'},{id:27,'name':'Horror'},
      {id:10749,'name':'Romance'},{id:878,'name':'Sci-Fi'},{id:53,'name':'Thriller'}
    ];
    container.innerHTML = movieGenres.map(g =>
      `<div class="genre-chip" data-id="${g.id}" onclick="filterMovieGenre(${g.id}, this)">${g.name}</div>`
    ).join('');
  }

  async function filterMovieGenre(id, el) {
    document.querySelectorAll('#movieGenreChips .genre-chip').forEach(c => c.classList.remove('active'));
    if (currentMovieGenre === id) {
      currentMovieGenre = null;
    } else {
      currentMovieGenre = id;
      el.classList.add('active');
    }
    showLoader('moviesGrid');
    let path = `/discover/movie?sort_by=popularity.desc`;
    if (currentMovieGenre) path += `&with_genres=${currentMovieGenre}`;
    const data = await api(path);
    renderGrid('moviesGrid', data.results || [], 'movie');
  }


  async function loadTV(type, tabEl) {
    activateTab(tabEl, 'tvGrid');
    showLoader('tvGrid');
    const data = await api(`/tv/${type}`);
    renderGrid('tvGrid', data.results || [], 'tv');
  }


  function renderGrid(gridId, items, mediaTypeOverride) {
    const grid = document.getElementById(gridId);
    if (!items.length) { grid.innerHTML = '<p style="color:var(--muted);padding:2rem">No results found.</p>'; return; }
    grid.innerHTML = items.map((item, i) => {
      const mt = mediaTypeOverride || item.media_type || 'movie';
      const title = item.title || item.name || 'Unknown';
      const year = (item.release_date || item.first_air_date || '').slice(0,4);
      const rating = item.vote_average?.toFixed(1) || '—';
      const poster = item.poster_path
        ? `<img class="card-poster" src="${IMG}w342${item.poster_path}" alt="${title}" loading="lazy" onerror="this.parentElement.innerHTML=noImgHtml()">`
        : `<div class="card-poster-placeholder"><svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5'><rect x='2' y='2' width='20' height='20' rx='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg><span>No Image</span></div>`;
      return `<div class="card" style="animation-delay:${i*0.04}s" onclick="openModal(${item.id},'${mt}')">
        ${poster}
        <div class="card-body">
          <div class="card-title">${title}</div>
          <div class="card-meta">
            <span class="card-year">${year}</span>
            <div class="card-rating">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              ${rating}
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  }
  function noImgHtml() {
    return `<div class="card-poster-placeholder"><svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5'><rect x='2' y='2' width='20' height='20' rx='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg><span>No Image</span></div>`;
  }


  async function openModal(id, mediaType) {
    const overlay = document.getElementById('modalOverlay');
    const inner   = document.getElementById('modalInner');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    inner.innerHTML = '<div class="loader-wrap" style="padding:5rem"><div class="spinner"></div></div>';

    const [details, credits, similar] = await Promise.all([
      api(`/${mediaType}/${id}?append_to_response=videos`),
      api(`/${mediaType}/${id}/credits`),
      api(`/${mediaType}/${id}/similar`)
    ]);

    const title   = details.title || details.name || 'Unknown';
    const year    = (details.release_date || details.first_air_date || '').slice(0,4);
    const rating  = details.vote_average?.toFixed(1) || '—';
    const runtime = details.runtime ? `${Math.floor(details.runtime/60)}h ${details.runtime%60}m`
                  : details.episode_run_time?.[0] ? `${details.episode_run_time[0]}m/ep` : '—';
    const genreList = (details.genres||[]).map(g=>g.name).join(', ') || '—';
    const director = mediaType==='movie'
      ? (credits.crew||[]).find(c=>c.job==='Director')?.name || '—'
      : '—';
    const cast = (credits.cast||[]).slice(0,5).map(c=>c.name).join(', ') || '—';
    const backdrop = details.backdrop_path ? `<img class="modal-backdrop" src="${IMG}w1280${details.backdrop_path}" alt="${title}">` : `<div class="modal-backdrop-placeholder"></div>`;
    const poster   = details.poster_path   ? `<img class="modal-poster" src="${IMG}w342${details.poster_path}" alt="${title}">` : '';

    const similarHTML = (similar.results||[]).slice(0,8).map(m =>
      `<div class="similar-card" onclick="openModal(${m.id},'${mediaType}')">
        <img src="${m.poster_path ? IMG+'w185'+m.poster_path : ''}" alt="${m.title||m.name||''}" onerror="this.src=''">
        <p>${m.title||m.name||''}</p>
      </div>`
    ).join('');

    inner.innerHTML = `
      <div style="position:relative">
        ${backdrop}
        <div class="modal-backdrop-gradient"></div>
      </div>
      <div class="modal-body">
        <div class="modal-poster-row">
          ${poster}
          <div class="modal-title-block">
            <h2 class="modal-title">${title}</h2>
            <div class="modal-meta-row">
              <div class="modal-rating">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ${rating} <span style="color:var(--muted);font-size:0.8rem;font-weight:400">/ 10</span>
              </div>
              <span class="modal-tag">${year}</span>
              <span class="modal-tag">${runtime}</span>
              ${details.status ? `<span class="modal-tag">${details.status}</span>` : ''}
            </div>
          </div>
        </div>

        <p class="modal-overview">${details.overview || 'No overview available.'}</p>

        <div class="modal-details-grid">
          <div class="modal-detail"><label>Genre</label><span>${genreList}</span></div>
          ${mediaType==='movie' ? `<div class="modal-detail"><label>Director</label><span>${director}</span></div>` : `<div class="modal-detail"><label>Seasons</label><span>${details.number_of_seasons || '—'}</span></div>`}
          <div class="modal-detail"><label>Cast</label><span>${cast}</span></div>
          <div class="modal-detail"><label>Language</label><span>${(details.original_language||'').toUpperCase() || '—'}</span></div>
          ${mediaType==='movie' ? `<div class="modal-detail"><label>Budget</label><span>${details.budget ? '$'+details.budget.toLocaleString() : '—'}</span></div>
          <div class="modal-detail"><label>Revenue</label><span>${details.revenue ? '$'+details.revenue.toLocaleString() : '—'}</span></div>` : ''}
        </div>

        ${similarHTML ? `<div class="modal-section-title">More Like This</div><div class="similar-grid">${similarHTML}</div>` : ''}
      </div>
    `;
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
  }
  function closeModalOnOverlay(e) { if (e.target === document.getElementById('modalOverlay')) closeModal(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  let searchTimer = null;
    const searchSection = document.getElementById('searchSection');

    document.getElementById('searchInput').addEventListener('input', e => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    
    if (!q) { 
        hideSearch(); 
        return; 
    }
    searchTimer = setTimeout(() => {
        doSearch(q);
        searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
    });

  async function doSearch(q) {
    showSearch();
    document.getElementById('searchHeading').textContent = `Results for "${q}"`;
    showLoader('searchGrid');
    const data = await api(`/search/multi?query=${encodeURIComponent(q)}`);
    const results = (data.results || []).filter(r => r.media_type !== 'person');
    renderGrid('searchGrid', results);
  }

  function showSearch() {
    document.getElementById('searchSection').classList.add('visible');
    document.getElementById('trendingSection').style.display = 'none';
    document.getElementById('moviesSection').style.display = 'none';
    document.getElementById('tvSection').style.display = 'none';
  }
  function hideSearch() {
    document.getElementById('searchSection').classList.remove('visible');
    document.getElementById('trendingSection').style.display = '';
    document.getElementById('moviesSection').style.display = '';
    document.getElementById('tvSection').style.display = '';
  }
  function goHome() {
    document.getElementById('searchInput').value = '';
    hideSearch();
  }

  function switchTab(type, btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  function showLoader(gridId) {
    document.getElementById(gridId).innerHTML = '<div class="loader-wrap"><div class="spinner"></div></div>';
  }
  function activateTab(tabEl, gridId) {
    if (!tabEl) return;
    const parent = tabEl.closest('.tabs');
    if (parent) parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tabEl.classList.add('active');
  }

  init();
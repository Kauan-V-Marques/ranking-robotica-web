import { createSource } from './source.js';
import {
  ROUND_LABELS,
  escapeHtml as esc,
  filterRows,
  formatDateRange,
  formatDiff,
  formatGap,
  formatLap,
  winnerSide,
  withGapToLeader,
} from './ranking.js';

const REFRESH_MS = 15_000;
const params = new URLSearchParams(location.search);
const source = createSource(params.get('api'));

const el = {
  eventName: document.querySelector('#event-name'),
  eventInfo: document.querySelector('#event-info'),
  sourceBadge: document.querySelector('#source-badge'),
  tabs: document.querySelector('#tabs'),
  podium: document.querySelector('#podium'),
  table: document.querySelector('#ranking-table'),
  matches: document.querySelector('#matches'),
  matchesSection: document.querySelector('#matches-section'),
  search: document.querySelector('#search'),
  autoRefresh: document.querySelector('#auto-refresh'),
  updatedAt: document.querySelector('#updated-at'),
  error: document.querySelector('#error'),
};

const state = { event: null, categories: {}, category: null, ranking: [], mode: null, timer: null };

function showError(message) {
  el.error.hidden = !message;
  el.error.textContent = message ?? '';
}

function setCategoryInUrl(category) {
  const url = new URL(location.href);
  url.searchParams.set('categoria', category);
  history.replaceState(null, '', url);
}

function renderTabs() {
  el.tabs.innerHTML = Object.entries(state.event.categories)
    .map(
      ([code, info]) => `
        <button type="button" role="tab" data-category="${esc(code)}"
                aria-selected="${code === state.category}">
          ${esc(info.name)}
        </button>`,
    )
    .join('');
}

function renderPodium(rows) {
  const medals = ['ouro', 'prata', 'bronze'];
  const top = rows.filter((r) => r.position <= 3).slice(0, 3);
  el.podium.innerHTML = top
    .map((r) => {
      const detail = state.mode === 'tempo' ? formatLap(r.best_ms) : `${r.points} pts`;
      return `
        <li class="podium-card ${medals[r.position - 1]}">
          <span class="podium-position">${r.position}º</span>
          <strong class="podium-robot">${esc(r.robot)}</strong>
          <span class="podium-team">${esc(r.team)}</span>
          <span class="podium-detail">${esc(detail)}</span>
        </li>`;
    })
    .join('');
}

function renderTable() {
  const rows = filterRows(state.ranking, el.search.value);
  const empty = `<tr><td colspan="9" class="empty">Nenhum robô encontrado.</td></tr>`;

  if (state.mode === 'tempo') {
    el.table.innerHTML = `
      <thead><tr>
        <th scope="col">Pos.</th><th scope="col">Robô</th><th scope="col">Equipe</th>
        <th scope="col" class="num">Melhor volta</th><th scope="col" class="num">Média</th>
        <th scope="col" class="num">Voltas válidas</th><th scope="col" class="num">Dif. líder</th>
      </tr></thead>
      <tbody>${
        rows
          .map(
            (r) => `
          <tr>
            <td class="pos">${r.position}º</td><td class="robot">${esc(r.robot)}</td><td>${esc(r.team)}</td>
            <td class="num strong">${formatLap(r.best_ms)}</td><td class="num">${formatLap(r.average_ms)}</td>
            <td class="num">${r.valid_runs}</td><td class="num muted">${formatGap(r.gap_ms)}</td>
          </tr>`,
          )
          .join('') || empty
      }</tbody>`;
    return;
  }

  el.table.innerHTML = `
    <thead><tr>
      <th scope="col">Pos.</th><th scope="col">Robô</th><th scope="col">Equipe</th>
      <th scope="col" class="num" title="Pontos">P</th><th scope="col" class="num" title="Jogos">J</th>
      <th scope="col" class="num" title="Vitórias">V</th><th scope="col" class="num" title="Empates">E</th>
      <th scope="col" class="num" title="Derrotas">D</th><th scope="col" class="num" title="Saldo de rounds">Saldo</th>
    </tr></thead>
    <tbody>${
      rows
        .map(
          (r) => `
        <tr>
          <td class="pos">${r.position}º</td><td class="robot">${esc(r.robot)}</td><td>${esc(r.team)}</td>
          <td class="num strong">${r.points}</td><td class="num">${r.played}</td><td class="num">${r.wins}</td>
          <td class="num">${r.draws}</td><td class="num">${r.losses}</td>
          <td class="num ${r.round_diff > 0 ? 'positive' : r.round_diff < 0 ? 'negative' : ''}">${formatDiff(r.round_diff)}</td>
        </tr>`,
        )
        .join('') || empty
    }</tbody>`;
}

function renderMatches(matches) {
  el.matchesSection.hidden = state.mode !== 'partidas' || matches.length === 0;
  el.matches.innerHTML = [...matches]
    .reverse()
    .map((m) => {
      const side = winnerSide(m);
      return `
        <li class="match">
          <span class="round">${esc(ROUND_LABELS[m.round] ?? m.round)}</span>
          <span class="side ${side === 'a' ? 'winner' : ''}">${esc(m.robot_a_name)}</span>
          <span class="score">${m.score_a} × ${m.score_b}</span>
          <span class="side right ${side === 'b' ? 'winner' : ''}">${esc(m.robot_b_name)}</span>
        </li>`;
    })
    .join('');
}

async function loadCategory(category) {
  state.category = category;
  state.mode = state.event.categories[category].mode;
  setCategoryInUrl(category);
  renderTabs();

  const [ranking, matches] = await Promise.all([
    source.ranking(state.event.id, category),
    state.mode === 'partidas' ? source.matches(state.event.id, category) : Promise.resolve([]),
  ]);

  state.ranking = state.mode === 'tempo' ? withGapToLeader(ranking.ranking) : ranking.ranking;
  renderPodium(state.ranking);
  renderTable();
  renderMatches(matches);
  el.updatedAt.textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR')}`;
  showError(null);
}

function setAutoRefresh(enabled) {
  clearInterval(state.timer);
  state.timer = enabled
    ? setInterval(() => loadCategory(state.category).catch((e) => showError(e.message)), REFRESH_MS)
    : null;
}

async function init() {
  el.sourceBadge.textContent = source.live ? 'Ao vivo' : 'Demonstração';
  el.sourceBadge.classList.toggle('live', source.live);
  el.sourceBadge.title = `Origem: ${source.label}`;
  el.autoRefresh.closest('label').hidden = !source.live;

  try {
    const events = await source.events();
    if (events.length === 0) throw new Error('Nenhuma competição cadastrada.');
    const chosen = events.find((e) => e.id === params.get('evento')) ?? events[0];
    state.event = await source.event(chosen.id);

    el.eventName.textContent = state.event.name;
    el.eventInfo.textContent = `${state.event.city} · ${formatDateRange(state.event.start_date, state.event.end_date)}`;
    document.title = `${state.event.name} · Ranking`;

    const codes = Object.keys(state.event.categories);
    if (codes.length === 0) throw new Error('A competição ainda não tem resultados.');
    await loadCategory(codes.includes(params.get('categoria')) ? params.get('categoria') : codes[0]);
  } catch (error) {
    showError(
      source.live
        ? `Não foi possível carregar os dados da API (${error.message}). Confira se ela está rodando em ${source.label}.`
        : `Não foi possível carregar os dados (${error.message}).`,
    );
  }
}

el.tabs.addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (button && button.dataset.category !== state.category) {
    loadCategory(button.dataset.category).catch((e) => showError(e.message));
  }
});
el.search.addEventListener('input', renderTable);
el.autoRefresh.addEventListener('change', () => setAutoRefresh(el.autoRefresh.checked));

init();

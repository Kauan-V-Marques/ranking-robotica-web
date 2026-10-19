// Funções puras de formatação e cálculo (testadas em tests/ranking.test.mjs)

export const ROUND_LABELS = {
  classificatoria: 'Classificatória',
  oitavas: 'Oitavas',
  quartas: 'Quartas',
  semifinal: 'Semifinal',
  final: 'Final',
};

const decimal = (value, digits) => value.toFixed(digits).replace('.', ',');

/** 17620 -> "17,620 s"; 62345 -> "1:02,345" */
export function formatLap(ms) {
  if (ms < 60_000) return `${decimal(ms / 1000, 3)} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = decimal((ms % 60_000) / 1000, 3).padStart(6, '0');
  return `${minutes}:${seconds}`;
}

/** Diferença para o líder: 0 -> "—", 490 -> "+0,490 s" */
export function formatGap(ms) {
  return ms === 0 ? '—' : `+${decimal(ms / 1000, 3)} s`;
}

/** Saldo com sinal: 4 -> "+4", -2 -> "−2" */
export function formatDiff(value) {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return '0';
}

/** Acrescenta gap_ms (distância para a melhor volta do líder) em cada linha. */
export function withGapToLeader(rows) {
  if (rows.length === 0) return [];
  const best = Math.min(...rows.map((r) => r.best_ms));
  return rows.map((r) => ({ ...r, gap_ms: r.best_ms - best }));
}

/** Ignora maiúsculas e acentos: "robo" encontra "Robô". */
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function filterRows(rows, term) {
  const wanted = normalize(term);
  if (!wanted) return rows;
  return rows.filter((r) => normalize(r.robot).includes(wanted) || normalize(r.team).includes(wanted));
}

/** Lado vencedor de uma partida ("a", "b" ou null para empate). */
export function winnerSide(match) {
  if (match.score_a === match.score_b) return null;
  return match.score_a > match.score_b ? 'a' : 'b';
}

/** "2026-11-14" e "2026-11-15" -> "14 a 15/11/2026" */
export function formatDateRange(start, end) {
  const [sy, sm, sd] = start.split('-');
  const [ey, em, ed] = end.split('-');
  if (start === end) return `${sd}/${sm}/${sy}`;
  if (sy === ey && sm === em) return `${sd} a ${ed}/${em}/${ey}`;
  if (sy === ey) return `${sd}/${sm} a ${ed}/${em}/${ey}`;
  return `${sd}/${sm}/${sy} a ${ed}/${em}/${ey}`;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

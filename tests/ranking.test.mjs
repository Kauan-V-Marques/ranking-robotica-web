import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  escapeHtml,
  filterRows,
  formatDateRange,
  formatDiff,
  formatGap,
  formatLap,
  winnerSide,
  withGapToLeader,
} from '../js/ranking.js';

test('formata voltas abaixo e acima de um minuto', () => {
  assert.equal(formatLap(17620), '17,620 s');
  assert.equal(formatLap(62345), '1:02,345');
  assert.equal(formatLap(120000), '2:00,000');
});

test('diferença para o líder', () => {
  const rows = withGapToLeader([{ best_ms: 17620 }, { best_ms: 18110 }]);
  assert.deepEqual(rows.map((r) => r.gap_ms), [0, 490]);
  assert.equal(formatGap(0), '—');
  assert.equal(formatGap(490), '+0,490 s');
  assert.deepEqual(withGapToLeader([]), []);
});

test('saldo de rounds com sinal', () => {
  assert.equal(formatDiff(4), '+4');
  assert.equal(formatDiff(-2), '−2');
  assert.equal(formatDiff(0), '0');
});

test('filtro ignora maiúsculas e acentos e procura em robô e equipe', () => {
  const rows = [
    { robot: 'Faísca', team: 'Equipe Alfa' },
    { robot: 'Tornado', team: 'Equipe Beta' },
  ];
  assert.deepEqual(filterRows(rows, 'faisca').map((r) => r.robot), ['Faísca']);
  assert.deepEqual(filterRows(rows, 'BETA').map((r) => r.robot), ['Tornado']);
  assert.equal(filterRows(rows, '  ').length, 2);
});

test('lado vencedor da partida', () => {
  assert.equal(winnerSide({ score_a: 2, score_b: 1 }), 'a');
  assert.equal(winnerSide({ score_a: 0, score_b: 2 }), 'b');
  assert.equal(winnerSide({ score_a: 1, score_b: 1 }), null);
});

test('intervalo de datas', () => {
  assert.equal(formatDateRange('2026-11-14', '2026-11-15'), '14 a 15/11/2026');
  assert.equal(formatDateRange('2026-11-30', '2026-12-01'), '30/11 a 01/12/2026');
  assert.equal(formatDateRange('2026-11-14', '2026-11-14'), '14/11/2026');
});

test('escapa HTML vindo da API', () => {
  assert.equal(escapeHtml('<b>"Robô" & cia</b>'), '&lt;b&gt;&quot;Robô&quot; &amp; cia&lt;/b&gt;');
});

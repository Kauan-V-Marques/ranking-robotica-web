// Origem dos dados: a API real (?api=http://localhost:8000) ou os arquivos de demonstração.

async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      message = (await response.json()).error ?? message;
    } catch {
      /* resposta sem JSON */
    }
    throw new Error(message);
  }
  return response.json();
}

function liveSource(baseUrl) {
  const base = baseUrl.replace(/\/+$/, '');
  return {
    live: true,
    label: base,
    categories: () => getJson(`${base}/api/robots/categories`),
    events: () => getJson(`${base}/api/events`),
    event: (id) => getJson(`${base}/api/events/${id}`),
    ranking: (id, category) => getJson(`${base}/api/events/${id}/ranking?category=${encodeURIComponent(category)}`),
    matches: (id, category) => getJson(`${base}/api/events/${id}/matches?category=${encodeURIComponent(category)}`),
  };
}

function demoSource(folder) {
  return {
    live: false,
    label: 'dados de demonstração',
    categories: () => getJson(`${folder}/categories.json`),
    events: () => getJson(`${folder}/events.json`),
    event: () => getJson(`${folder}/event.json`),
    ranking: (_id, category) => getJson(`${folder}/ranking-${category}.json`),
    matches: (_id, category) => getJson(`${folder}/matches-${category}.json`),
  };
}

export function createSource(apiBase) {
  return apiBase ? liveSource(apiBase) : demoSource('data/demo');
}

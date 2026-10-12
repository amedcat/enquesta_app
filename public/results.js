'use strict';

const root = document.getElementById('results');
const errorBox = document.getElementById('errors');

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}

function stat(value, label) {
  return el('div', { class: 'stat' }, el('div', { class: 'value' }, String(value)), el('div', { class: 'label' }, label));
}

function bars(distribution, labelFn = (k) => k) {
  const entries = Object.entries(distribution);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return el('div', {}, ...entries.map(([k, v]) => el('div', { class: 'bar-row' },
    el('span', {}, labelFn(k)),
    el('div', { class: 'bar-track' }, el('div', { class: 'bar-fill', style: `width:${(v / max) * 100}%` })),
    el('span', { class: 'bar-count' }, String(v)))));
}

function npsBlock(q) {
  const total = q.count || 1;
  const parts = [
    ['Promotors (9-10)', q.promoters, 'var(--good)'],
    ['Passius (7-8)', q.passives, 'var(--mid)'],
    ['Detractors (0-6)', q.detractors, 'var(--bad)'],
  ];
  return el('div', {},
    el('div', { class: 'nps-split' }, ...parts.map(([, n, c]) =>
      el('span', { style: `width:${(n / total) * 100}%;background:${c}` }))),
    el('div', { class: 'legend' }, ...parts.map(([label, n, c]) =>
      el('span', {}, el('span', { class: 'dot', style: `background:${c}` }), `${label}: ${n}`))));
}

function questionCard(q) {
  const card = el('section', { class: 'card' }, el('h3', {}, q.label));

  if (q.type === 'rating') {
    card.append(el('p', { class: 'q-meta' }, `Mitjana: ${q.average ?? '–'} / 5 · ${q.count} respostes`),
      bars(q.distribution, (k) => '★'.repeat(Number(k))));
  } else if (q.type === 'nps') {
    card.append(el('p', { class: 'q-meta' }, `NPS: ${q.nps ?? '–'} · Mitjana: ${q.average ?? '–'} / 10 · ${q.count} respostes`),
      npsBlock(q), bars(q.distribution));
  } else if (q.type === 'choice') {
    card.append(el('p', { class: 'q-meta' }, `${q.count} respostes`), bars(q.distribution));
  } else if (q.type === 'text') {
    card.append(el('p', { class: 'q-meta' }, `${q.count} comentaris`));
    if (!q.comments.length) card.append(el('p', { class: 'empty' }, 'Encara no hi ha comentaris.'));
    for (const c of q.comments) {
      card.append(el('div', { class: 'comment' }, c.text,
        el('time', { datetime: c.date }, new Date(c.date).toLocaleString('ca-ES'))));
    }
  }
  return card;
}

async function load() {
  const params = new URLSearchParams(location.search);
  const headers = {};
  const token = params.get('token');
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch('/api/resultats', { headers });
  const data = await res.json();
  if (!res.ok) {
    root.replaceChildren();
    errorBox.textContent = (data.errors || ["No s'han pogut carregar els resultats."]).join(' ');
    errorBox.hidden = false;
    return;
  }

  const general = data.questions.find((q) => q.id === 'satisfaccio_general');
  const nps = data.questions.find((q) => q.type === 'nps');
  root.replaceChildren(
    el('div', { class: 'stats' },
      stat(data.total, 'Respostes totals'),
      stat(general?.average ?? '–', 'Satisfacció general (sobre 5)'),
      stat(nps?.nps ?? '–', 'Net Promoter Score')),
    ...data.questions.map(questionCard));
}

load().catch(() => {
  errorBox.textContent = 'Error de connexió.';
  errorBox.hidden = false;
});

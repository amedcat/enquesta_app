'use strict';

const form = document.getElementById('survey');
const container = document.getElementById('questions');
const errorBox = document.getElementById('errors');
const submitBtn = document.getElementById('submit');
let questions = [];

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}

function scale(q, min, max, stars) {
  const wrap = el('div', { class: stars ? 'scale stars' : 'scale', role: 'radiogroup' });
  for (let i = min; i <= max; i++) {
    const id = `${q.id}_${i}`;
    const input = el('input', { type: 'radio', name: q.id, id, value: String(i) });
    const label = el('label', { for: id, title: String(i) }, stars ? '★' : String(i));
    if (stars) label.setAttribute('aria-label', `${i} de ${max}`);
    wrap.append(input, label);
  }
  if (stars) {
    wrap.addEventListener('change', () => {
      const value = Number(form.elements[q.id].value);
      wrap.querySelectorAll('label').forEach((l, idx) => l.classList.toggle('on', idx < value));
    });
  }
  return wrap;
}

function renderQuestion(q) {
  const legend = el('legend', {}, q.label);
  if (q.required) legend.append(el('span', { class: 'required', 'aria-hidden': 'true' }, '*'));
  const fieldset = el('fieldset', {}, legend);

  if (q.type === 'rating') {
    fieldset.append(scale(q, 1, 5, true),
      el('div', { class: 'scale-hint', style: 'max-width:200px' }, el('span', {}, 'Molt dolenta'), el('span', {}, 'Excel·lent')));
  } else if (q.type === 'nps') {
    fieldset.append(scale(q, 0, 10, false),
      el('div', { class: 'scale-hint' }, el('span', {}, 'Gens probable'), el('span', {}, 'Molt probable')));
  } else if (q.type === 'choice') {
    const opts = el('div', { class: 'options' });
    q.options.forEach((opt, i) => {
      const id = `${q.id}_${i}`;
      opts.append(el('label', { for: id }, el('input', { type: 'radio', name: q.id, id, value: opt }), opt));
    });
    fieldset.append(opts);
  } else if (q.type === 'text') {
    const area = el('textarea', { name: q.id, maxlength: String(q.maxLength), 'aria-label': q.label });
    const counter = el('div', { class: 'counter' }, `0 / ${q.maxLength}`);
    area.addEventListener('input', () => { counter.textContent = `${area.value.length} / ${q.maxLength}`; });
    fieldset.append(area, counter);
  }

  return el('div', { class: 'card', 'data-question': q.id }, fieldset);
}

function showErrors(messages) {
  errorBox.replaceChildren(el('ul', {}, ...messages.map((m) => el('li', {}, m))));
  errorBox.hidden = false;
  errorBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function collect() {
  const data = {};
  for (const q of questions) {
    const value = form.elements[q.id]?.value ?? '';
    if (value !== '') data[q.id] = q.type === 'rating' || q.type === 'nps' ? Number(value) : value;
  }
  return data;
}

async function init() {
  try {
    const res = await fetch('/api/preguntes');
    questions = await res.json();
    container.replaceChildren(...questions.map(renderQuestion));
  } catch {
    container.replaceChildren(el('p', { class: 'empty' }, "No s'han pogut carregar les preguntes."));
  }
}

form.addEventListener('change', (event) => {
  event.target.closest('.card')?.classList.remove('invalid');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.hidden = true;

  const data = collect();
  const missing = questions.filter((q) => q.required && data[q.id] === undefined);
  container.querySelectorAll('.card').forEach((c) => {
    c.classList.toggle('invalid', missing.some((q) => q.id === c.dataset.question));
  });
  if (missing.length) {
    showErrors(missing.map((q) => `Respon la pregunta: «${q.label}»`));
    return;
  }

  submitBtn.disabled = true;
  try {
    const res = await fetch('/api/respostes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      showErrors(body.errors || ["No s'ha pogut enviar l'enquesta."]);
      return;
    }
    form.hidden = true;
    document.getElementById('thanks').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {
    showErrors(["Error de connexió. Torna-ho a provar."]);
  } finally {
    submitBtn.disabled = false;
  }
});

init();

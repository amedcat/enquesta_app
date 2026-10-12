'use strict';

const { questions } = require('./questions');

// Valida una resposta i retorna { errors, answers } amb només els camps coneguts.
function validateResponse(body) {
  const errors = [];
  const answers = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: ['El cos de la petició ha de ser un objecte JSON.'], answers };
  }

  for (const q of questions) {
    const value = body[q.id];
    const empty = value === undefined || value === null || value === '';

    if (empty) {
      if (q.required) errors.push(`La pregunta "${q.label}" és obligatòria.`);
      continue;
    }

    switch (q.type) {
      case 'rating':
      case 'nps': {
        const [min, max] = q.type === 'rating' ? [1, 5] : [0, 10];
        const n = Number(value);
        if (!Number.isInteger(n) || n < min || n > max) {
          errors.push(`La resposta a "${q.label}" ha de ser un enter entre ${min} i ${max}.`);
        } else {
          answers[q.id] = n;
        }
        break;
      }
      case 'choice':
        if (!q.options.includes(value)) {
          errors.push(`Opció no vàlida per a "${q.label}".`);
        } else {
          answers[q.id] = value;
        }
        break;
      case 'text': {
        if (typeof value !== 'string') {
          errors.push(`La resposta a "${q.label}" ha de ser text.`);
          break;
        }
        const text = value.trim();
        if (text.length > q.maxLength) {
          errors.push(`El comentari no pot superar els ${q.maxLength} caràcters.`);
        } else if (text) {
          answers[q.id] = text;
        }
        break;
      }
    }
  }

  return { errors, answers };
}

// Calcula estadístiques agregades a partir de la llista de respostes.
function computeResults(responses) {
  const results = { total: responses.length, questions: [] };

  for (const q of questions) {
    const values = responses.map((r) => r.answers[q.id]).filter((v) => v !== undefined);
    const item = { id: q.id, type: q.type, label: q.label, count: values.length };

    if (q.type === 'rating' || q.type === 'nps') {
      const [min, max] = q.type === 'rating' ? [1, 5] : [0, 10];
      item.average = values.length
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
        : null;
      item.distribution = {};
      for (let i = min; i <= max; i++) item.distribution[i] = 0;
      for (const v of values) item.distribution[v]++;

      if (q.type === 'nps') {
        const promoters = values.filter((v) => v >= 9).length;
        const detractors = values.filter((v) => v <= 6).length;
        item.promoters = promoters;
        item.passives = values.length - promoters - detractors;
        item.detractors = detractors;
        item.nps = values.length
          ? Math.round(((promoters - detractors) / values.length) * 100)
          : null;
      }
    } else if (q.type === 'choice') {
      item.distribution = Object.fromEntries(q.options.map((o) => [o, 0]));
      for (const v of values) item.distribution[v]++;
    } else if (q.type === 'text') {
      item.comments = responses
        .filter((r) => r.answers[q.id] !== undefined)
        .map((r) => ({ text: r.answers[q.id], date: r.createdAt }))
        .reverse();
    }

    results.questions.push(item);
  }

  return results;
}

module.exports = { validateResponse, computeResults };

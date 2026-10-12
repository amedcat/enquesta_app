'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateResponse, computeResults } = require('../src/survey');
const { createServer } = require('../src/server');

const valid = {
  satisfaccio_general: 5,
  atencio: 4,
  qualitat: 5,
  relacio_qualitat_preu: 3,
  recomanacio: 9,
  canal: 'Internet',
  comentaris: '  Molt bé!  ',
};

test('accepta una resposta vàlida i ignora camps desconeguts', () => {
  const { errors, answers } = validateResponse({ ...valid, hack: 'x' });
  assert.deepStrictEqual(errors, []);
  assert.strictEqual(answers.comentaris, 'Molt bé!');
  assert.ok(!('hack' in answers));
});

test('rebutja preguntes obligatòries buides i valors fora de rang', () => {
  const { errors } = validateResponse({ ...valid, atencio: undefined, qualitat: 6, recomanacio: 2.5, canal: 'TV' });
  assert.strictEqual(errors.length, 4);
});

test('calcula mitjanes i NPS', () => {
  const responses = [9, 10, 7, 3].map((n, i) => ({
    createdAt: new Date(2026, 0, i + 1).toISOString(),
    answers: { ...valid, recomanacio: n, satisfaccio_general: i + 1 },
  }));
  const results = computeResults(responses);
  const general = results.questions.find((q) => q.id === 'satisfaccio_general');
  const nps = results.questions.find((q) => q.id === 'recomanacio');
  assert.strictEqual(results.total, 4);
  assert.strictEqual(general.average, 2.5);
  assert.strictEqual(nps.nps, 25); // (2 promotors - 1 detractor) / 4
  assert.strictEqual(nps.passives, 1);
});

async function withServer(options, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'enquesta-'));
  const server = createServer({ dataFile: path.join(dir, 'responses.json'), ...options });
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('API: desa respostes concurrents i retorna resultats', () =>
  withServer({}, async (base) => {
    const posts = Array.from({ length: 5 }, () =>
      fetch(`${base}/api/respostes`, { method: 'POST', body: JSON.stringify(valid) }));
    for (const res of await Promise.all(posts)) assert.strictEqual(res.status, 201);

    const bad = await fetch(`${base}/api/respostes`, { method: 'POST', body: '{' });
    assert.strictEqual(bad.status, 400);

    const results = await (await fetch(`${base}/api/resultats`)).json();
    assert.strictEqual(results.total, 5);

    const page = await fetch(`${base}/`);
    assert.match(await page.text(), /Enquesta de satisfacció/);
  }));

test('API: protegeix els resultats amb ADMIN_TOKEN', () =>
  withServer({ adminToken: 'secret' }, async (base) => {
    assert.strictEqual((await fetch(`${base}/api/resultats`)).status, 401);
    const ok = await fetch(`${base}/api/resultats`, { headers: { Authorization: 'Bearer secret' } });
    assert.strictEqual(ok.status, 200);
  }));

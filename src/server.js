'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { questions } = require('./questions');
const { validateResponse, computeResults } = require('./survey');
const { Storage } = require('./storage');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MAX_BODY = 16 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const ROUTES = {
  '/': 'index.html',
  '/resultats': 'results.html',
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Petició massa gran.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function isAuthorized(req, url, adminToken) {
  if (!adminToken) return true;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : url.searchParams.get('token');
  return token === adminToken;
}

function serveStatic(res, file) {
  const full = path.join(PUBLIC_DIR, file);
  if (!full.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(404).end();
    return;
  }
  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No trobat');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
    res.end(data);
  });
}

function createServer({ dataFile, adminToken } = {}) {
  const storage = new Storage(dataFile || path.join(__dirname, '..', 'data', 'responses.json'));

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    try {
      if (url.pathname === '/api/preguntes' && req.method === 'GET') {
        return sendJson(res, 200, questions);
      }

      if (url.pathname === '/api/respostes' && req.method === 'POST') {
        let body;
        try {
          body = JSON.parse(await readBody(req));
        } catch (err) {
          if (err.status) throw err;
          return sendJson(res, 400, { errors: ['JSON no vàlid.'] });
        }
        const { errors, answers } = validateResponse(body);
        if (errors.length) return sendJson(res, 400, { errors });
        const entry = await storage.add(answers);
        return sendJson(res, 201, { id: entry.id });
      }

      if (url.pathname === '/api/resultats' && req.method === 'GET') {
        if (!isAuthorized(req, url, adminToken)) {
          return sendJson(res, 401, { errors: ['Cal un token vàlid per veure els resultats.'] });
        }
        return sendJson(res, 200, computeResults(await storage.all()));
      }

      if (req.method === 'GET') {
        return serveStatic(res, ROUTES[url.pathname] || url.pathname.slice(1));
      }

      sendJson(res, 404, { errors: ['No trobat.'] });
    } catch (err) {
      if (err.status) return sendJson(res, err.status, { errors: [err.message] });
      console.error(err);
      sendJson(res, 500, { errors: ['Error intern del servidor.'] });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer({ dataFile: process.env.DATA_FILE, adminToken: process.env.ADMIN_TOKEN }).listen(
    port,
    () => {
      console.log(`Enquesta disponible a http://localhost:${port}`);
      console.log(`Resultats a http://localhost:${port}/resultats`);
    },
  );
}

module.exports = { createServer };

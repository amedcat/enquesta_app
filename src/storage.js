'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Emmagatzematge senzill en un fitxer JSON. Les escriptures es serialitzen
// per evitar perdre respostes quan n'arriben diverses alhora.
class Storage {
  constructor(file) {
    this.file = file;
    this.queue = Promise.resolve();
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }

  async all() {
    try {
      return JSON.parse(await fs.promises.readFile(this.file, 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  add(answers) {
    const run = async () => {
      const responses = await this.all();
      const entry = { id: responses.length + 1, createdAt: new Date().toISOString(), answers };
      responses.push(entry);
      const tmp = `${this.file}.tmp`;
      await fs.promises.writeFile(tmp, JSON.stringify(responses, null, 2));
      await fs.promises.rename(tmp, this.file);
      return entry;
    };
    const result = this.queue.then(run);
    this.queue = result.catch(() => {});
    return result;
  }
}

module.exports = { Storage };

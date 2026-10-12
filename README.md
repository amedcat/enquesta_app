# Enquesta de satisfacció

Aplicació web senzilla per recollir i analitzar enquestes de satisfacció de clients.
No té cap dependència externa: només cal Node.js 18 o superior.

## Funcionalitats

- **Formulari d'enquesta** (`/`) amb valoracions d'1 a 5 estrelles, pregunta de
  recomanació (NPS, 0-10), opció única i comentaris lliures.
- **Pàgina de resultats** (`/resultats`) amb nombre de respostes, mitjanes,
  distribució de cada pregunta, Net Promoter Score i llistat de comentaris.
- Validació de les respostes tant al navegador com al servidor.
- Les respostes es desen a `data/responses.json`.
- Disseny adaptat a mòbil i mode fosc.

## Posada en marxa

```bash
npm start
```

Obre <http://localhost:3000> per respondre l'enquesta i
<http://localhost:3000/resultats> per veure'n els resultats.

### Variables d'entorn

| Variable      | Per defecte            | Descripció                                                     |
| ------------- | ---------------------- | -------------------------------------------------------------- |
| `PORT`        | `3000`                 | Port del servidor.                                             |
| `DATA_FILE`   | `data/responses.json`  | Fitxer on es desen les respostes.                              |
| `ADMIN_TOKEN` | *(buit)*               | Si es defineix, cal per veure resultats: `/resultats?token=…`. |

## Personalitzar les preguntes

Edita `src/questions.js`. Tipus disponibles: `rating` (1-5), `nps` (0-10),
`choice` (amb `options`) i `text` (amb `maxLength`).

## API

| Mètode | Ruta             | Descripció                         |
| ------ | ---------------- | ---------------------------------- |
| GET    | `/api/preguntes` | Llista de preguntes.               |
| POST   | `/api/respostes` | Envia una resposta (JSON).         |
| GET    | `/api/resultats` | Estadístiques agregades.           |

## Tests

```bash
npm test
```

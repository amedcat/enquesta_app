'use strict';

// Definició de l'enquesta. Modifica aquest fitxer per canviar les preguntes.
// Tipus suportats: rating (1-5), nps (0-10), choice (una opció), text (lliure).
const questions = [
  {
    id: 'satisfaccio_general',
    type: 'rating',
    label: 'En general, com valores la teva experiència amb nosaltres?',
    required: true,
  },
  {
    id: 'atencio',
    type: 'rating',
    label: "Com valores l'atenció rebuda?",
    required: true,
  },
  {
    id: 'qualitat',
    type: 'rating',
    label: 'Com valores la qualitat del producte o servei?',
    required: true,
  },
  {
    id: 'relacio_qualitat_preu',
    type: 'rating',
    label: 'Com valores la relació qualitat-preu?',
    required: true,
  },
  {
    id: 'recomanacio',
    type: 'nps',
    label: 'Amb quina probabilitat ens recomanaries a un amic o familiar?',
    required: true,
  },
  {
    id: 'canal',
    type: 'choice',
    label: 'Com ens vas conèixer?',
    options: ['Internet', 'Xarxes socials', 'Recomanació', 'Publicitat', 'Altres'],
    required: false,
  },
  {
    id: 'comentaris',
    type: 'text',
    label: 'Tens algun comentari o suggeriment per millorar?',
    required: false,
    maxLength: 1000,
  },
];

module.exports = { questions };

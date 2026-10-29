/* ============================================================
   CacaPalavras — temas e desafio diário.
   ============================================================ */

const DAILY_WORDS = [
  "Bloco do motor",
  "Virabrequim",
  "Mancal",
  "Pistão",
  "Eixo de comando",
  "Junta do motor",
  "Cabeçote",
];

const GRID_SIZE = 15;

function normalizeWord(word) {
  return word.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/g, "");
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getDaily() {
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return { key, words: DAILY_WORDS };
}

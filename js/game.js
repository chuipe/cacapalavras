/* ============================================================
   CacaPalavras — geração da grade e validação de seleções.
   ============================================================ */

const Game = {
  size: GRID_SIZE,
  words: [],
  grid: [],
  foundWords: [],
  foundCells: [],
  status: "playing",

  start(words, seed) {
    this.words = [...words];
    this.foundWords = [];
    this.foundCells = [];
    this.status = "playing";
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(""));
    this.placeWords(seed);
    this.fillEmptyCells(seed);
  },

  placeWords(seed) {
    const directions = [
      [0, 1], [1, 0], [1, 1], [1, -1],
      [0, -1], [-1, 0], [-1, -1], [-1, 1],
    ];
    let randomState = hashString(seed) || 1;
    const random = (limit) => {
      randomState = (randomState * 48271) % 2147483647;
      return randomState % limit;
    };

    for (const displayWord of this.words) {
      const word = normalizeWord(displayWord);
      let placed = false;
      for (let attempt = 0; attempt < 1000 && !placed; attempt += 1) {
        const [rowStep, columnStep] = directions[random(directions.length)];
        const row = random(this.size);
        const column = random(this.size);
        const endRow = row + (rowStep * (word.length - 1));
        const endColumn = column + (columnStep * (word.length - 1));
        if (endRow < 0 || endRow >= this.size || endColumn < 0 || endColumn >= this.size) continue;

        const fits = Array.from(word).every((letter, index) => {
          const current = this.grid[row + (rowStep * index)][column + (columnStep * index)];
          return !current || current === letter;
        });
        if (!fits) continue;

        Array.from(word).forEach((letter, index) => {
          this.grid[row + (rowStep * index)][column + (columnStep * index)] = letter;
        });
        placed = true;
      }

      if (!placed) {
        throw new Error(`Não foi possível posicionar a palavra "${displayWord}" na grade.`);
      }
    }
  },

  fillEmptyCells(seed) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let randomState = hashString(`${seed}-letters`) || 1;
    const random = () => {
      randomState = (randomState * 48271) % 2147483647;
      return randomState % letters.length;
    };
    this.grid = this.grid.map((row) => row.map((letter) => letter || letters[random()]));
  },

  pathBetween(startIndex, endIndex) {
    const startRow = Math.floor(startIndex / this.size);
    const startColumn = startIndex % this.size;
    const endRow = Math.floor(endIndex / this.size);
    const endColumn = endIndex % this.size;
    const rowDifference = endRow - startRow;
    const columnDifference = endColumn - startColumn;
    const distance = Math.max(Math.abs(rowDifference), Math.abs(columnDifference));

    if (distance === 0 || (rowDifference !== 0 && columnDifference !== 0 && Math.abs(rowDifference) !== Math.abs(columnDifference))) {
      return [];
    }

    const rowStep = Math.sign(rowDifference);
    const columnStep = Math.sign(columnDifference);
    return Array.from({ length: distance + 1 }, (_, index) => (
      ((startRow + (rowStep * index)) * this.size) + startColumn + (columnStep * index)
    ));
  },

  findWord(startIndex, endIndex) {
    if (this.status !== "playing") return { found: false, reason: "complete" };
    const path = this.pathBetween(startIndex, endIndex);
    if (path.length < 2) return { found: false, reason: "invalid" };

    const selected = path.map((index) => this.grid[Math.floor(index / this.size)][index % this.size]).join("");
    const word = this.words.find((candidate) => {
      const normalizedWord = normalizeWord(candidate);
      return (normalizedWord === selected || normalizedWord === Array.from(selected).reverse().join(""))
      && !this.foundWords.includes(candidate)
    });
    if (!word) return { found: false, reason: "not-found" };

    this.foundWords.push(word);
    this.foundCells = [...new Set([...this.foundCells, ...path])];
    if (this.foundWords.length === this.words.length) this.status = "won";
    return { found: true, word, path };
  },

  restoreProgress(foundWords = [], foundCells = []) {
    this.foundWords = this.words.filter((word) => foundWords.includes(word));
    this.foundCells = foundCells.filter((index) => Number.isInteger(index) && index >= 0 && index < this.size * this.size);
    if (this.foundWords.length === this.words.length) this.status = "won";
  },
};

/* ============================================================
   CacaPalavras — interface, acessibilidade e eventos.
   ============================================================ */

(function () {
  const els = {
    wordList: document.getElementById("word-list"),
    foundCount: document.getElementById("found-count"),
    grid: document.getElementById("word-grid"),
    status: document.getElementById("game-status"),
  };

  const daily = getDaily();
  let startIndex = null;
  let dragSelection = null;
  let activePath = [];
  let suppressClickUntil = 0;

  function renderWords() {
    els.wordList.replaceChildren();
    Game.words.forEach((word) => {
      const item = document.createElement("li");
      item.className = "word-item";
      item.textContent = word;
      item.dataset.word = word;
      if (Game.foundWords.includes(word)) {
        item.classList.add("is-found");
        item.setAttribute("aria-label", `${word}, encontrada`);
      } else {
        item.setAttribute("aria-label", `${word}, ainda não encontrada`);
      }
      els.wordList.appendChild(item);
    });
    els.foundCount.textContent = `${Game.foundWords.length} de ${Game.words.length}`;
  }

  function renderGrid() {
    els.grid.replaceChildren();
    Game.grid.forEach((row, rowIndex) => {
      const rowElement = document.createElement("div");
      rowElement.className = "grid-row";
      row.forEach((letter, columnIndex) => {
        const index = rowIndex * Game.size + columnIndex;
        const cell = document.createElement("button");
        cell.className = "grid-cell";
        cell.type = "button";
        cell.tabIndex = index === 0 ? 0 : -1;
        cell.textContent = letter;
        cell.dataset.index = String(index);
        cell.setAttribute("aria-label", `Linha ${rowIndex + 1}, coluna ${columnIndex + 1}: ${letter}`);
        rowElement.appendChild(cell);
      });
      els.grid.appendChild(rowElement);
    });
    updateGridSelection();
  }

  function updateGridSelection() {
    els.grid.querySelectorAll(".grid-cell").forEach((cell) => {
      const index = Number(cell.dataset.index);
      cell.classList.toggle("is-selected", activePath.includes(index));
      cell.classList.toggle("is-found", Game.foundCells.includes(index));
    });
  }

  function showPath(start, end) {
    activePath = Game.pathBetween(start, end);
    updateGridSelection();
  }

  function finishGame() {
    saveProgress(daily.key, { foundWords: Game.foundWords, foundCells: Game.foundCells, completed: true });
    loadAndRecord(true);
    els.status.textContent = "Parabéns! Você encontrou todas as palavras de hoje. Volte amanhã para um novo desafio.";
    els.grid.setAttribute("aria-label", "Desafio concluído. Todas as palavras foram encontradas.");
  }

  function selectCells(start, end) {
    const result = Game.findWord(start, end);
    activePath = result.path || [];
    if (result.found) {
      saveProgress(daily.key, {
        foundWords: Game.foundWords,
        foundCells: Game.foundCells,
        completed: Game.status === "won",
      });
      renderWords();
      els.status.textContent = Game.status === "won"
        ? `Você encontrou ${result.word}! ${Game.words.length} de ${Game.words.length}.`
        : `${result.word} encontrada! ${Game.foundWords.length} de ${Game.words.length} peças.`;
      if (Game.status === "won") finishGame();
    } else if (result.reason === "not-found") {
      els.status.textContent = "Essa seleção não forma uma palavra da lista. Tente outra.";
    } else if (result.reason === "invalid") {
      els.status.textContent = "Selecione as letras em uma linha reta.";
    }

    startIndex = null;
    activePath = [];
    updateGridSelection();
  }

  function cellFromPoint(x, y) {
    const element = document.elementFromPoint(x, y);
    const cell = element && element.closest(".grid-cell");
    return cell && els.grid.contains(cell) ? Number(cell.dataset.index) : null;
  }

  function handlePointerDown(event) {
    const cell = event.target.closest(".grid-cell");
    if (!cell || Game.status !== "playing") return;
    const index = Number(cell.dataset.index);
    dragSelection = { pointerId: event.pointerId, start: index, end: index, moved: false };
    showPath(index, index);
  }

  function handlePointerMove(event) {
    if (!dragSelection || dragSelection.pointerId !== event.pointerId) return;
    const index = cellFromPoint(event.clientX, event.clientY);
    if (index === null || index === dragSelection.end) return;
    dragSelection.end = index;
    dragSelection.moved = true;
    showPath(dragSelection.start, index);
  }

  function handlePointerUp(event) {
    if (!dragSelection || dragSelection.pointerId !== event.pointerId) return;
    const selection = dragSelection;
    dragSelection = null;
    if (selection.moved) {
      suppressClickUntil = Date.now() + 500;
      selectCells(selection.start, selection.end);
    } else if (startIndex !== null) {
      showPath(startIndex, startIndex);
    } else {
      activePath = [];
      updateGridSelection();
    }
  }

  function handleCellClick(event) {
    const cell = event.target.closest(".grid-cell");
    if (!cell || Date.now() < suppressClickUntil || Game.status !== "playing") return;
    const index = Number(cell.dataset.index);
    if (startIndex === null) {
      startIndex = index;
      showPath(index, index);
      els.status.textContent = "Agora selecione a última letra da palavra.";
      return;
    }
    if (startIndex === index) {
      startIndex = null;
      activePath = [];
      updateGridSelection();
      els.status.textContent = "Seleção cancelada.";
      return;
    }
    selectCells(startIndex, index);
  }

  function handleKeyDown(event) {
    const cell = event.target.closest(".grid-cell");
    if (!cell) return;
    const index = Number(cell.dataset.index);
    const row = Math.floor(index / Game.size);
    const column = index % Game.size;
    const moves = {
      ArrowUp: row > 0 ? index - Game.size : null,
      ArrowDown: row < Game.size - 1 ? index + Game.size : null,
      ArrowLeft: column > 0 ? index - 1 : null,
      ArrowRight: column < Game.size - 1 ? index + 1 : null,
    };
    if (Object.hasOwn(moves, event.key)) {
      event.preventDefault();
      const next = moves[event.key];
      const nextCell = next === null ? null : els.grid.querySelector(`[data-index="${next}"]`);
      if (nextCell) {
        cell.tabIndex = -1;
        nextCell.tabIndex = 0;
        nextCell.focus();
      }
    }
  }

  function init() {
    const progress = loadProgress(daily.key);
    Game.start(daily.words, daily.key);
    Game.restoreProgress(progress.foundWords, progress.foundCells);
    renderWords();
    renderGrid();
    if (Game.status === "won" || progress.completed) {
      Game.status = "won";
      els.status.textContent = "Você já encontrou todas as palavras de hoje. Volte amanhã para um novo desafio.";
      els.grid.setAttribute("aria-label", "Desafio concluído. Todas as palavras foram encontradas.");
    }

    els.grid.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerUp);
    els.grid.addEventListener("click", handleCellClick);
    els.grid.addEventListener("keydown", handleKeyDown);
  }

  document.addEventListener("DOMContentLoaded", init);
})();

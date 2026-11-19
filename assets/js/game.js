(() => {
  const board = document.getElementById("game-board");
  if (!board) return;
  const status = document.getElementById("game-status");
  const cells = Array(9).fill("");
  let current = "X";
  let finished = false;
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const render = () => {
    board.replaceChildren();
    cells.forEach((value, index) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "game-cell";
      cell.textContent = value;
      cell.setAttribute("aria-label", `Casa ${index + 1}${value ? `, ${value}` : ", vazia"}`);
      cell.disabled = Boolean(value) || finished;
      cell.addEventListener("click", () => play(index));
      board.appendChild(cell);
    });
  };
  const play = (index) => {
    if (finished || cells[index]) return;
    cells[index] = current;
    const winningLine = wins.find((line) => line.every((position) => cells[position] === current));
    if (winningLine) {
      finished = true;
      status.textContent = `${current} venceu!`;
    } else if (cells.every(Boolean)) {
      finished = true;
      status.textContent = "Empate.";
    } else {
      current = current === "X" ? "O" : "X";
      status.textContent = `Vez de ${current}`;
    }
    render();
  };
  document.getElementById("restart-game").addEventListener("click", () => {
    cells.fill("");
    current = "X";
    finished = false;
    status.textContent = "Vez de X";
    render();
  });
  render();
})();

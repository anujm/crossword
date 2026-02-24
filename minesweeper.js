#!/usr/bin/env node

const readline = require('node:readline');

const DEFAULT_ROWS = 8;
const DEFAULT_COLS = 8;
const DEFAULT_MINES = 10;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

const rows = parsePositiveInt(process.argv[2], DEFAULT_ROWS);
const cols = parsePositiveInt(process.argv[3], DEFAULT_COLS);
let mineCount = parsePositiveInt(process.argv[4], DEFAULT_MINES);

const maxMines = rows * cols - 1;
if (mineCount > maxMines) {
  mineCount = maxMines;
}

const mines = Array.from({ length: rows }, () => Array(cols).fill(false));
const revealed = Array.from({ length: rows }, () => Array(cols).fill(false));
const flagged = Array.from({ length: rows }, () => Array(cols).fill(false));
const adjacent = Array.from({ length: rows }, () => Array(cols).fill(0));

let firstReveal = true;
let gameFinished = false;
let gameWon = false;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function inBounds(row, col) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

function getNeighbors(row, col) {
  const neighbors = [];

  for (let rowDiff = -1; rowDiff <= 1; rowDiff += 1) {
    for (let colDiff = -1; colDiff <= 1; colDiff += 1) {
      if (rowDiff === 0 && colDiff === 0) {
        continue;
      }

      const neighborRow = row + rowDiff;
      const neighborCol = col + colDiff;

      if (inBounds(neighborRow, neighborCol)) {
        neighbors.push([neighborRow, neighborCol]);
      }
    }
  }

  return neighbors;
}

function placeMines(excludedRow, excludedCol) {
  let placed = 0;

  while (placed < mineCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);

    if ((row === excludedRow && col === excludedCol) || mines[row][col]) {
      continue;
    }

    mines[row][col] = true;
    placed += 1;
  }
}

function computeAdjacentCounts() {
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (mines[row][col]) {
        adjacent[row][col] = -1;
        continue;
      }

      let count = 0;
      for (const [neighborRow, neighborCol] of getNeighbors(row, col)) {
        if (mines[neighborRow][neighborCol]) {
          count += 1;
        }
      }

      adjacent[row][col] = count;
    }
  }
}

function revealConnectedZeros(startRow, startCol) {
  const queue = [[startRow, startCol]];

  while (queue.length > 0) {
    const [row, col] = queue.shift();

    if (!inBounds(row, col) || revealed[row][col] || flagged[row][col]) {
      continue;
    }

    revealed[row][col] = true;

    if (adjacent[row][col] !== 0) {
      continue;
    }

    for (const [neighborRow, neighborCol] of getNeighbors(row, col)) {
      if (!revealed[neighborRow][neighborCol] && !flagged[neighborRow][neighborCol]) {
        queue.push([neighborRow, neighborCol]);
      }
    }
  }
}

function revealAllMines() {
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (mines[row][col]) {
        revealed[row][col] = true;
      }
    }
  }
}

function checkWin() {
  let safeRevealed = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!mines[row][col] && revealed[row][col]) {
        safeRevealed += 1;
      }
    }
  }

  const safeCells = rows * cols - mineCount;
  return safeRevealed === safeCells;
}

function reveal(row, col) {
  if (!inBounds(row, col)) {
    return 'Coordinates are out of bounds.';
  }

  if (revealed[row][col]) {
    return 'That cell is already revealed.';
  }

  if (flagged[row][col]) {
    return 'That cell is flagged. Unflag it first to reveal.';
  }

  if (firstReveal) {
    placeMines(row, col);
    computeAdjacentCounts();
    firstReveal = false;
  }

  if (mines[row][col]) {
    revealAllMines();
    gameFinished = true;
    gameWon = false;
    return 'Boom. You hit a mine.';
  }

  revealConnectedZeros(row, col);

  if (checkWin()) {
    gameFinished = true;
    gameWon = true;
    return 'Nice. You cleared the board.';
  }

  return null;
}

function toggleFlag(row, col) {
  if (!inBounds(row, col)) {
    return 'Coordinates are out of bounds.';
  }

  if (revealed[row][col]) {
    return 'You cannot flag a revealed cell.';
  }

  flagged[row][col] = !flagged[row][col];
  return flagged[row][col] ? 'Flag placed.' : 'Flag removed.';
}

function countFlags() {
  let total = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (flagged[row][col]) {
        total += 1;
      }
    }
  }

  return total;
}

function renderBoard() {
  const colHeader = Array.from({ length: cols }, (_, index) => String(index).padStart(2, ' ')).join(' ');
  const lines = [`\n    ${colHeader}`];

  for (let row = 0; row < rows; row += 1) {
    const cells = [];

    for (let col = 0; col < cols; col += 1) {
      let cell = '#';

      if (revealed[row][col]) {
        if (mines[row][col]) {
          cell = '*';
        } else if (adjacent[row][col] === 0) {
          cell = '.';
        } else {
          cell = String(adjacent[row][col]);
        }
      } else if (flagged[row][col]) {
        cell = 'F';
      }

      cells.push(cell.padStart(2, ' '));
    }

    lines.push(`${String(row).padStart(2, ' ')}  ${cells.join(' ')}`);
  }

  lines.push(`\nMines: ${mineCount} | Flags: ${countFlags()}`);

  return lines.join('\n');
}

function parseCommand(input) {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return { type: 'invalid', message: 'Enter a command.' };
  }

  const [actionRaw, rowRaw, colRaw] = trimmed.split(/\s+/);
  const action = actionRaw.toLowerCase();

  if (action === 'q' || action === 'quit' || action === 'exit') {
    return { type: 'quit' };
  }

  if (action === 'h' || action === 'help' || action === '?') {
    return { type: 'help' };
  }

  if (action !== 'r' && action !== 'f') {
    return { type: 'invalid', message: 'Unknown command. Use r, f, h, or q.' };
  }

  const row = Number.parseInt(rowRaw, 10);
  const col = Number.parseInt(colRaw, 10);

  if (Number.isNaN(row) || Number.isNaN(col)) {
    return { type: 'invalid', message: 'Use: r <row> <col> or f <row> <col>.' };
  }

  return { type: action === 'r' ? 'reveal' : 'flag', row, col };
}

function printHelp() {
  console.log('\nCommands:');
  console.log('  r <row> <col>  reveal a cell');
  console.log('  f <row> <col>  toggle flag on a cell');
  console.log('  h              show help');
  console.log('  q              quit game\n');
}

async function run() {
  console.log('Quick Minesweeper');
  console.log(`Board: ${rows}x${cols}, Mines: ${mineCount}`);
  console.log('First reveal is always safe.');
  printHelp();

  let lastMessage = null;

  while (!gameFinished) {
    console.log(renderBoard());

    if (lastMessage) {
      console.log(`\n${lastMessage}`);
      lastMessage = null;
    }

    const input = await ask('\n> ');
    const command = parseCommand(input);

    if (command.type === 'quit') {
      console.log('\nThanks for playing.');
      rl.close();
      return;
    }

    if (command.type === 'help') {
      printHelp();
      continue;
    }

    if (command.type === 'invalid') {
      lastMessage = command.message;
      continue;
    }

    if (command.type === 'reveal') {
      const result = reveal(command.row, command.col);
      if (result) {
        lastMessage = result;
      }
      continue;
    }

    if (command.type === 'flag') {
      lastMessage = toggleFlag(command.row, command.col);
    }
  }

  console.log(renderBoard());
  console.log(gameWon ? '\nYou win.' : '\nGame over.');
  rl.close();
}

run().catch((error) => {
  console.error(error);
  rl.close();
  process.exit(1);
});

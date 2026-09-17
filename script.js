const cells       = document.querySelectorAll('.cell');
const statusIcon  = document.getElementById('status-icon');
const statusText  = document.getElementById('status-text');
const restartBtn  = document.getElementById('restart');
const resetBtn    = document.getElementById('reset-score');
const diffBtns    = document.querySelectorAll('.diff-btn');
const overlay     = document.getElementById('overlay');
const overlayEmoji= document.getElementById('overlay-emoji');
const overlayMsg  = document.getElementById('overlay-msg');
const overlayBtn  = document.getElementById('overlay-btn');
const winStroke   = document.getElementById('win-stroke');
const scoreX      = document.getElementById('score-x');
const scoreO      = document.getElementById('score-o');
const scoreD      = document.getElementById('score-d');

const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

// Win line coordinates [x1,y1,x2,y2] mapped to 360x360 grid (cells ~110px + 10px gap)
const LINE_COORDS = {
  '0,1,2': [20,55,340,55],   '3,4,5': [20,180,340,180], '6,7,8': [20,305,340,305],
  '0,3,6': [55,20,55,340],   '1,4,7': [180,20,180,340], '2,5,8': [305,20,305,340],
  '0,4,8': [20,20,340,340],  '2,4,6': [340,20,20,340]
};

const scores = { X: 0, O: 0, D: 0 };
let board, gameOver, difficulty = 'hard';

// ── Audio ──────────────────────────────────────────────────────────────────
const ctx = new (window.AudioContext || window.webkitAudioContext)();

function beep(freq, type, duration, vol = 0.3) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  o.start(); o.stop(ctx.currentTime + duration);
}

const sound = {
  click: () => beep(440, 'sine', 0.1),
  win:   () => { beep(523,  'sine', 0.15); setTimeout(() => beep(659, 'sine', 0.15), 150); setTimeout(() => beep(784, 'sine', 0.3), 300); },
  lose:  () => { beep(300, 'sawtooth', 0.15); setTimeout(() => beep(220, 'sawtooth', 0.3), 150); },
  draw:  () => beep(350, 'triangle', 0.3),
};

// ── Game Logic ─────────────────────────────────────────────────────────────
function init() {
  board = Array(9).fill('');
  gameOver = false;
  cells.forEach(c => { c.className = 'cell'; });
  winStroke.className = '';
  winStroke.removeAttribute('style');
  winStroke.setAttribute('x1', 0); winStroke.setAttribute('y1', 0);
  winStroke.setAttribute('x2', 0); winStroke.setAttribute('y2', 0);
  overlay.classList.add('hidden');
  setStatus('🎮', 'Your turn');
}

function setStatus(icon, text) {
  statusIcon.textContent = icon;
  statusText.textContent = text;
}

function checkWinner(b) {
  for (const line of WINS) {
    const [a, i, j] = line;
    if (b[a] && b[a] === b[i] && b[a] === b[j]) return { winner: b[a], line };
  }
  if (b.every(c => c)) return { winner: 'draw' };
  return null;
}

function minimax(b, isMax, depth, alpha, beta) {
  const result = checkWinner(b);
  if (result) return result.winner === 'O' ? 10 - depth : result.winner === 'X' ? depth - 10 : 0;

  let best = isMax ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (!b[i]) {
      b[i] = isMax ? 'O' : 'X';
      const score = minimax(b, !isMax, depth + 1, alpha, beta);
      b[i] = '';
      if (isMax) { best = Math.max(best, score); alpha = Math.max(alpha, best); }
      else        { best = Math.min(best, score); beta  = Math.min(beta, best); }
      if (beta <= alpha) break;
    }
  }
  return best;
}

function bestMove() {
  if (difficulty === 'easy') {
    // 60% random, 40% optimal
    const empty = board.map((v,i) => v ? null : i).filter(i => i !== null);
    if (Math.random() < 0.6) return empty[Math.floor(Math.random() * empty.length)];
  }
  let best = -Infinity, move = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O';
      const score = minimax(board, false, 0, -Infinity, Infinity);
      board[i] = '';
      if (score > best) { best = score; move = i; }
    }
  }
  return move;
}

function applyMove(i, player) {
  board[i] = player;
  cells[i].classList.add(player.toLowerCase(), 'taken');
}

function drawWinLine(line) {
  const key = line.join(',');
  const [x1, y1, x2, y2] = LINE_COORDS[key];
  winStroke.setAttribute('x1', x1); winStroke.setAttribute('y1', y1);
  winStroke.setAttribute('x2', x2); winStroke.setAttribute('y2', y2);
  winStroke.className = 'draw-line';
}

function handleResult() {
  const result = checkWinner(board);
  if (!result) return false;

  gameOver = true;

  if (result.winner === 'draw') {
    scores.D++;
    scoreD.textContent = scores.D;
    sound.draw();
    setStatus('🤝', "It's a draw!");
    showOverlay('🤝', "DRAW!");
  } else if (result.winner === 'X') {
    scores.X++;
    scoreX.textContent = scores.X;
    sound.win();
    result.line.forEach(i => cells[i].classList.add('win'));
    drawWinLine(result.line);
    setStatus('🎉', 'You win!');
    showOverlay('🎉', 'YOU WIN!');
  } else {
    scores.O++;
    scoreO.textContent = scores.O;
    sound.lose();
    result.line.forEach(i => cells[i].classList.add('win', 'o-win'));
    drawWinLine(result.line);
    winStroke.style.stroke = 'var(--blue)';
    winStroke.style.filter = 'drop-shadow(0 0 6px var(--blue))';
    setStatus('🤖', 'AI wins!');
    showOverlay('🤖', 'AI WINS!');
  }
  return true;
}

function showOverlay(emoji, msg) {
  overlayEmoji.textContent = emoji;
  overlayMsg.textContent = msg;
  setTimeout(() => overlay.classList.remove('hidden'), 800);
}

// ── Events ─────────────────────────────────────────────────────────────────
cells.forEach(cell => {
  cell.addEventListener('click', () => {
    const i = +cell.dataset.i;
    if (gameOver || board[i]) return;
    ctx.resume();
    sound.click();
    applyMove(i, 'X');
    if (handleResult()) return;

    setStatus('⏳', 'AI thinking...');
    setTimeout(() => {
      applyMove(bestMove(), 'O');
      if (!handleResult()) setStatus('🎮', 'Your turn');
    }, 300);
  });
});

diffBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    diffBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    difficulty = btn.dataset.d;
    init();
  });
});

restartBtn.addEventListener('click', init);
overlayBtn.addEventListener('click', init);
resetBtn.addEventListener('click', () => {
  scores.X = scores.O = scores.D = 0;
  scoreX.textContent = scoreO.textContent = scoreD.textContent = '0';
  init();
});

init();

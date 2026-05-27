(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // Logical game resolution (canvas drawing buffer). CSS scales it visually.
  const GAME_W = canvas.width;   // 800
  const GAME_H = canvas.height;  // 600

  // HUD elements
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const levelEl = document.getElementById('level');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayText = document.getElementById('overlay-text');
  const startBtn = document.getElementById('start-btn');

  // Touch controls
  const btnLeft = document.getElementById('btn-left');
  const btnRight = document.getElementById('btn-right');
  const btnLaunch = document.getElementById('btn-launch');

  // Game configuration
  const PADDLE_W = 110;
  const PADDLE_H = 14;
  const PADDLE_Y = GAME_H - 40;
  const PADDLE_SPEED = 520; // pixels per second

  const BALL_RADIUS = 8;
  const BALL_SPEED_START = 360;
  const BALL_SPEED_MAX = 620;

  const BRICK_ROWS = 6;
  const BRICK_COLS = 10;
  const BRICK_PADDING = 6;
  const BRICK_OFFSET_TOP = 60;
  const BRICK_OFFSET_SIDE = 30;
  const BRICK_HEIGHT = 22;

  const ROW_COLORS = ['#ff5c8a', '#ff8a5c', '#ffd166', '#9bd770', '#5cd6ff', '#a78bfa'];

  // State
  const state = {
    running: false,
    paused: false,
    over: false,
    won: false,
    score: 0,
    lives: 3,
    level: 1,
    paddle: { x: (GAME_W - PADDLE_W) / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H },
    ball: { x: GAME_W / 2, y: PADDLE_Y - BALL_RADIUS - 1, vx: 0, vy: 0, r: BALL_RADIUS, stuck: true },
    bricks: [],
    input: { left: false, right: false },
    lastTime: 0,
  };

  function buildBricks(level) {
    const bricks = [];
    const usableW = GAME_W - BRICK_OFFSET_SIDE * 2 - BRICK_PADDING * (BRICK_COLS - 1);
    const brickW = usableW / BRICK_COLS;
    // For higher levels, add tougher bricks (more HP) in upper rows
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        const x = BRICK_OFFSET_SIDE + c * (brickW + BRICK_PADDING);
        const y = BRICK_OFFSET_TOP + r * (BRICK_HEIGHT + BRICK_PADDING);
        const baseHp = 1 + Math.max(0, Math.floor((BRICK_ROWS - 1 - r) / 2));
        const hp = Math.min(3, baseHp + (level > 1 ? 1 : 0));
        bricks.push({
          x, y, w: brickW, h: BRICK_HEIGHT,
          hp,
          maxHp: hp,
          color: ROW_COLORS[r % ROW_COLORS.length],
          alive: true,
        });
      }
    }
    return bricks;
  }

  function resetBallToPaddle() {
    state.ball.stuck = true;
    state.ball.vx = 0;
    state.ball.vy = 0;
    state.ball.x = state.paddle.x + state.paddle.w / 2;
    state.ball.y = state.paddle.y - state.ball.r - 1;
  }

  function launchBall() {
    if (!state.ball.stuck || !state.running) return;
    state.ball.stuck = false;
    // Launch slightly to the side based on paddle motion, default upward.
    const angle = (-Math.PI / 2) + (Math.random() * 0.6 - 0.3); // mostly up
    const speed = BALL_SPEED_START;
    state.ball.vx = Math.cos(angle) * speed;
    state.ball.vy = Math.sin(angle) * speed;
  }

  function startGame() {
    state.running = true;
    state.over = false;
    state.won = false;
    state.score = 0;
    state.lives = 3;
    state.level = 1;
    state.paddle.w = PADDLE_W;
    state.paddle.x = (GAME_W - state.paddle.w) / 2;
    state.bricks = buildBricks(state.level);
    resetBallToPaddle();
    updateHud();
    hideOverlay();
    state.lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function nextLevel() {
    state.level += 1;
    state.bricks = buildBricks(state.level);
    resetBallToPaddle();
    updateHud();
  }

  function gameOver(won) {
    state.running = false;
    state.over = true;
    state.won = won;
    showOverlay(
      won ? 'You Win!' : 'Game Over',
      won
        ? `Final score: <strong>${state.score}</strong><br />Press Start to play again.`
        : `Final score: <strong>${state.score}</strong><br />Press Start to try again.`,
      'Play Again'
    );
  }

  function loseLife() {
    state.lives -= 1;
    updateHud();
    if (state.lives <= 0) {
      gameOver(false);
    } else {
      resetBallToPaddle();
    }
  }

  function updateHud() {
    scoreEl.textContent = state.score.toString();
    livesEl.textContent = state.lives.toString();
    levelEl.textContent = state.level.toString();
  }

  function showOverlay(title, html, btnLabel) {
    overlayTitle.textContent = title;
    overlayText.innerHTML = html;
    if (btnLabel) startBtn.textContent = btnLabel;
    overlay.classList.add('visible');
  }

  function hideOverlay() {
    overlay.classList.remove('visible');
  }

  // Input handling: keyboard
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'a' || k === 'arrowleft') {
      state.input.left = true;
    } else if (k === 'd' || k === 'arrowright') {
      state.input.right = true;
    } else if (k === ' ' || k === 'spacebar') {
      e.preventDefault();
      if (!state.running && !overlay.classList.contains('visible')) {
        // no-op
      } else if (overlay.classList.contains('visible')) {
        startGame();
      } else {
        launchBall();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'a' || k === 'arrowleft') {
      state.input.left = false;
    } else if (k === 'd' || k === 'arrowright') {
      state.input.right = false;
    }
  });

  // Touch / pointer controls
  function bindHold(btn, onDown, onUp) {
    const down = (e) => {
      e.preventDefault();
      btn.classList.add('pressed');
      onDown();
    };
    const up = (e) => {
      if (e) e.preventDefault();
      btn.classList.remove('pressed');
      onUp();
    };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('pointerleave', up);
  }

  bindHold(btnLeft, () => { state.input.left = true; }, () => { state.input.left = false; });
  bindHold(btnRight, () => { state.input.right = true; }, () => { state.input.right = false; });

  btnLaunch.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (overlay.classList.contains('visible')) {
      startGame();
    } else {
      launchBall();
    }
  });

  // Start button
  startBtn.addEventListener('click', () => startGame());

  // Game loop
  function loop(t) {
    if (!state.running) return;
    const dt = Math.min(0.033, (t - state.lastTime) / 1000); // clamp to ~30fps min step
    state.lastTime = t;

    update(dt);
    render();

    requestAnimationFrame(loop);
  }

  function update(dt) {
    // Paddle movement
    let dir = 0;
    if (state.input.left) dir -= 1;
    if (state.input.right) dir += 1;
    state.paddle.x += dir * PADDLE_SPEED * dt;
    if (state.paddle.x < 0) state.paddle.x = 0;
    if (state.paddle.x + state.paddle.w > GAME_W) state.paddle.x = GAME_W - state.paddle.w;

    // Ball
    const b = state.ball;
    if (b.stuck) {
      b.x = state.paddle.x + state.paddle.w / 2;
      b.y = state.paddle.y - b.r - 1;
      return;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Walls
    if (b.x - b.r < 0) {
      b.x = b.r;
      b.vx = -b.vx;
    } else if (b.x + b.r > GAME_W) {
      b.x = GAME_W - b.r;
      b.vx = -b.vx;
    }
    if (b.y - b.r < 0) {
      b.y = b.r;
      b.vy = -b.vy;
    }

    // Bottom -> lose life
    if (b.y - b.r > GAME_H) {
      loseLife();
      return;
    }

    // Paddle collision
    const p = state.paddle;
    if (
      b.y + b.r >= p.y &&
      b.y - b.r <= p.y + p.h &&
      b.x + b.r >= p.x &&
      b.x - b.r <= p.x + p.w &&
      b.vy > 0
    ) {
      b.y = p.y - b.r;
      // Reflect based on hit position for variable angle
      const hit = (b.x - (p.x + p.w / 2)) / (p.w / 2); // -1..1
      const maxAngle = (60 * Math.PI) / 180;
      const angle = hit * maxAngle - Math.PI / 2; // mostly up, biased by hit
      const speed = Math.min(
        BALL_SPEED_MAX,
        Math.hypot(b.vx, b.vy) * 1.02 // small speed-up on paddle hit
      );
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed;
    }

    // Brick collisions
    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      if (
        b.x + b.r > brick.x &&
        b.x - b.r < brick.x + brick.w &&
        b.y + b.r > brick.y &&
        b.y - b.r < brick.y + brick.h
      ) {
        // Determine collision side by comparing overlap depths
        const overlapLeft = b.x + b.r - brick.x;
        const overlapRight = brick.x + brick.w - (b.x - b.r);
        const overlapTop = b.y + b.r - brick.y;
        const overlapBottom = brick.y + brick.h - (b.y - b.r);
        const minX = Math.min(overlapLeft, overlapRight);
        const minY = Math.min(overlapTop, overlapBottom);
        if (minX < minY) {
          b.vx = -b.vx;
          if (overlapLeft < overlapRight) b.x = brick.x - b.r;
          else b.x = brick.x + brick.w + b.r;
        } else {
          b.vy = -b.vy;
          if (overlapTop < overlapBottom) b.y = brick.y - b.r;
          else b.y = brick.y + brick.h + b.r;
        }

        brick.hp -= 1;
        if (brick.hp <= 0) {
          brick.alive = false;
          state.score += 10 * brick.maxHp;
        } else {
          state.score += 2;
        }
        updateHud();
        break; // only one brick per frame
      }
    }

    // Win condition
    if (state.bricks.every((br) => !br.alive)) {
      if (state.level >= 3) {
        gameOver(true);
      } else {
        nextLevel();
      }
    }
  }

  function render() {
    // Background
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    // Subtle grid background
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#5cd6ff';
    ctx.lineWidth = 1;
    const grid = 40;
    for (let x = 0; x < GAME_W; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GAME_H);
      ctx.stroke();
    }
    for (let y = 0; y < GAME_H; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(GAME_W, y);
      ctx.stroke();
    }
    ctx.restore();

    // Bricks
    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      const dmg = 1 - brick.hp / brick.maxHp;
      ctx.fillStyle = brick.color;
      ctx.globalAlpha = 1 - dmg * 0.45;
      roundRect(ctx, brick.x, brick.y, brick.w, brick.h, 4);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Top highlight
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      roundRect(ctx, brick.x + 2, brick.y + 2, brick.w - 4, 4, 2);
      ctx.fill();
    }

    // Paddle
    const p = state.paddle;
    const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#b8c0d6');
    ctx.fillStyle = grad;
    roundRect(ctx, p.x, p.y, p.w, p.h, 6);
    ctx.fill();

    // Ball
    const b = state.ball;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    const ballGrad = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, b.r);
    ballGrad.addColorStop(0, '#fff7c2');
    ballGrad.addColorStop(1, '#ffb84d');
    ctx.fillStyle = ballGrad;
    ctx.fill();

    // Aiming hint when stuck
    if (b.stuck) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x, b.y - 60);
      ctx.stroke();
      ctx.restore();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  // Pause when tab loses focus
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.running) {
      state.running = false;
      showOverlay('Paused', 'Tab inactive. Press Resume to continue.', 'Resume');
      // Hook resume into start button to restart loop without resetting score
      const resume = () => {
        state.running = true;
        hideOverlay();
        state.lastTime = performance.now();
        requestAnimationFrame(loop);
        startBtn.removeEventListener('click', resume);
        // Restore default start behavior
        startBtn.addEventListener('click', startGame);
      };
      startBtn.removeEventListener('click', startGame);
      startBtn.addEventListener('click', resume);
    }
  });
})();

# Brick_Breaker_Demo

A static-webpage implementation of the classic Brick Breaker arcade game. Pure HTML, CSS, and vanilla JavaScript — no build step, no dependencies.

## Play

Open [index.html](index.html) in any modern browser, or serve the folder with any static file server:

```bash
# from the project root
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Controls

**Desktop**
- `A` / `D` — move the paddle left / right (arrow keys also work)
- `Space` — launch the ball / start the game

**Mobile**
- Translucent on-screen arrow buttons — move the paddle
- `LAUNCH` button — launch the ball / start the game

## Features

- Smooth canvas-based rendering with `requestAnimationFrame`
- Variable bounce angle based on where the ball hits the paddle
- Multi-hit bricks (HP shown via fading)
- Score, lives, and level tracking
- Multiple levels with increasing difficulty
- Automatic pause when the tab loses focus
- Responsive layout that adapts to mobile screens
- Touch controls auto-show on mobile / touch devices

## Project Structure

- [index.html](index.html) — markup, HUD, overlay, and touch controls
- [styles.css](styles.css) — styling and responsive layout
- [game.js](game.js) — game loop, physics, input handling, and rendering

## License

TBD

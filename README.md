# Checkers Game Automation

This project automates the checkers game at (https://www.gamesforthebrain.com/game/checkers/) using Playwright.

# What the test does
- Opens the checkers page and checks the board loads.
- Plays five turns as orange.
- Makes sure at least one blue piece is captured.
- Clicks “Make a move” to let blue respond each turn.
- Restarts the game at the end and confirms the board is back to the initial state.

# How to run
```bash
npm install
npx playwright install
npx playwright test --headed -g "Scenario Moves"

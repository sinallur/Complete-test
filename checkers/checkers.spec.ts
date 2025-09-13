import { test, expect } from "@playwright/test";
import { CheckersPage, Square } from "./checkers.page";

test.describe("Checkers Game Automation - Scenario Moves", () => {
  test.setTimeout(120_000);

  test("Five specific orange moves including a capture; restart & verify", async ({ page }) => {
    await page.goto("https://www.gamesforthebrain.com/game/checkers/", { waitUntil: "load" });
    const app = new CheckersPage(page);
    await expect(app.heading).toBeVisible();
    await expect(app.boardRoot).toBeVisible();

    // Save initial signature
    const initialSig = await app.boardSignature();

    // Clean board to start deterministically
    await app.restart();

    // helpers 
    const at = (b: Square[], r: number, c: number) => b[r * 8 + c];
    const centerScore = (sq: Square) => Math.abs(sq.col - 3.5) + Math.abs(sq.row - 3.5);

    /** simple move to provoke the engine:
     *  prefer pieces closer to the center
     *  Move them one step if the square is empty
     */
    function chooseHeuristicSetupMove(board: Square[]) {
      // Find all simple steps (non-captures) from computeMoves()
      const all = app.computeMoves(board).filter(m => !m.isCapture);
      // Weight by center; lower is better
      all.sort((a, b) => centerScore(a.to) - centerScore(b.to));
      return all[0] || null;
    }

    let orangeTurns = 0;
    let capturedAtLeastOnce = false;

    // Phase 1: setup until a capture is available (bounded) ---
    // Allow up to 8 setup turns to coax the engine.
    for (; orangeTurns < 8 && !capturedAtLeastOnce; orangeTurns++) {
      const board = await app.readBoard();
      let moves = app.computeMoves(board);

      // DEBUG log of available movess
      console.log(
        `Setup turn ${orangeTurns + 1} moves:`,
        moves.map(m => `${m.from.idx}->${m.to.idx}${m.isCapture ? "*" : ""}`)
      );

      // If a capture is already available, break to capture phase
      if (moves.some(m => m.isCapture)) break;

      // If not make simple move toward center to provoke engine
      const setup = chooseHeuristicSetupMove(board);
      expect(setup, "No legal orange setup moves found").toBeTruthy();

      await app.clickSquare(setup!.from);
      await app.clickSquare(setup!.to);

      // Engine move (if link present)
      await app.engineMoveIfAvailable();
    }

    // Phase 2: take a capture the moment it appears; chain multi-jumps
    {
      let board = await app.readBoard();
      let moves = app.computeMoves(board);
      const capture = moves.find(m => m.isCapture);

      expect(capture, "Expected a capture opportunity after setup").toBeTruthy();

      // Perform capture
      await app.clickSquare(capture!.from);
      await app.clickSquare(capture!.to);
      capturedAtLeastOnce = true;

      // Chain mandatory jumps with the same piece
      let landing = capture!.to;
      while (true) {
        board = await app.readBoard();
        const freshLanding = board[landing.row * 8 + landing.col];
        const next = app.nextCaptureFrom(board, freshLanding);
        if (!next) break;
        await app.clickSquare(next.from);
        await app.clickSquare(next.to);
        landing = next.to;
      }

      orangeTurns += 1;

      // Engine move after capture chain completes
      await app.engineMoveIfAvailable();
    }

    // Phase 3: finish remaining orange turns to reach 5 total 
    while (orangeTurns < 5) {
      const board = await app.readBoard();
      const moves = app.computeMoves(board);

      console.log(
        `Finish turn ${orangeTurns + 1} moves:`,
        moves.map(m => `${m.from.idx}->${m.to.idx}${m.isCapture ? "*" : ""}`)
      );

      expect(moves.length, "No legal orange moves to finish to 5 turns").toBeGreaterThan(0);

      const move = moves[0]; 
      await app.clickSquare(move.from);
      await app.clickSquare(move.to);
      orangeTurns += 1;

      await app.engineMoveIfAvailable();
    }

    // Assert capture occurred during the run
    expect(capturedAtLeastOnce, "must capture at least once in five turns").toBeTruthy();

    // Restart and verify reset
    await app.restart();
    const after = await app.boardSignature();
    expect(after).toBe(initialSig);
  });
});

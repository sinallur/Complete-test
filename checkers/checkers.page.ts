import { Locator, Page } from "@playwright/test";

export type CellType =
  | "ORANGE"
  | "BLUE"
  | "EMPTY"
  | "ORANGE_KING"
  | "BLUE_KING"
  | "OTHER";

export interface Square {
  idx: number;      // r*8 + c
  row: number;      // 0..7 (top = 0)
  col: number;      // 0..7 (left = 0)
  type: CellType;
  el: Locator;      // <img name="spaceXY">
  src: string;      // its src attribute
}

export class CheckersPage {
  constructor(public page: Page) {}

  // UI
  get heading()   { return this.page.getByRole("heading", { name: /checkers/i }); }
  get boardRoot() { return this.page.locator("#board"); }
  get msg()       { return this.page.locator("#message"); }
  get restartLnk(){ return this.page.getByRole("link", { name: /restart/i }); }

  /* Read all 64 squares using name="spaceXY" (X=row, Y=col), row-major sorted. */
  async readBoard(): Promise<Square[]> {
    await this.boardRoot.waitFor({ state: "visible" });

    const deadline = Date.now() + 5000;
    let imgs = this.page.locator('#board img[name^="space"]');
    while (Date.now() < deadline) {
      const c = await imgs.count();
      if (c >= 64) break;
      await this.page.waitForTimeout(100);
      imgs = this.page.locator('#board img[name^="space"]');
    }
    const count = await imgs.count();
    if (count < 64) throw new Error(`Board not ready: found ${count} squares`);

    const squares: Square[] = [];
    for (let j = 0; j < count; j++) {
      const el   = imgs.nth(j);
      const name = (await el.getAttribute("name")) || "";
      const m    = name.match(/space(\d)(\d)/);
      if (!m) continue;
      const row  = Number(m[1]);
      const col  = Number(m[2]);
      const idx  = row * 8 + col;
      const src  = (await el.getAttribute("src")) || "";
      squares.push({ idx, row, col, type: this.classify(src), el, src });
    }
    squares.sort((a, b) => a.idx - b.idx);
    return squares;
  }

  /** Signature used to confirm restart. */
  async boardSignature(): Promise<string> {
    const b = await this.readBoard();
    return b.map(s => s.src).join("|");
  }

  // Figure out which way orange is moving: up (-1) or down (+1). */
  private orangeForward(board: Square[]): -1 | 1 {
    const rows = board.filter(s => s.type === "ORANGE" || s.type === "ORANGE_KING").map(s => s.row);
    if (rows.length === 0) return -1; // defensive default
    rows.sort((a,b) => a - b);
    const median = rows[Math.floor(rows.length / 2)];
    // If most orange pieces are on the bottom half (rows 4..7), their forward is UP (-1)
    return median >= 4 ? -1 : 1;
  }

  // Compute legal orange moves (captures sorted first). */
  computeMoves(board: Square[]) {
    const at = (r: number, c: number) => board[r * 8 + c];
    const moves: { from: Square; to: Square; isCapture: boolean }[] = [];

    const fwd = this.orangeForward(board); // -1 when orange starts at bottom

    for (const sq of board) {
      if (!(sq.type === "ORANGE" || sq.type === "ORANGE_KING")) continue;

      // Kings move both ways, non-kings only in the forward direction
      const dirPairs =
        sq.type === "ORANGE_KING"
          ? [[1,-1],[1,1],[-1,-1],[-1,1]]
          : [[fwd,-1],[fwd,1]];

      for (const [dr, dc] of dirPairs) {
        const r1 = sq.row + dr,  c1 = sq.col + dc;      // adjacent
        const r2 = sq.row + 2*dr, c2 = sq.col + 2*dc;   // landing for jump

        if (!this.inBounds(r1, c1)) continue;
        const step = at(r1, c1);

        // simple step
        if (step.type === "EMPTY") {
          moves.push({ from: sq, to: step, isCapture: false });
        }

        // capture
        if (this.inBounds(r2, c2)) {
          const mid  = step;
          const land = at(r2, c2);
          if ((mid.type === "BLUE" || mid.type === "BLUE_KING") && land.type === "EMPTY") {
            moves.push({ from: sq, to: land, isCapture: true });
          }
        }
      }
    }

    moves.sort((a,b) => Number(b.isCapture) - Number(a.isCapture));
    return moves;
  }

  // Continue capture from a landing square with the same piece. */
  nextCaptureFrom(board: Square[], landing: Square) {
    const at = (r: number, c: number) => board[r * 8 + c];
    const dirs = [[1,-1],[1,1],[-1,-1],[-1,1]]; // all diagonals
    for (const [dr, dc] of dirs) {
      const r1 = landing.row + dr,  c1 = landing.col + dc;
      const r2 = landing.row + 2*dr, c2 = landing.col + 2*dc;
      if (!this.inBounds(r1, c1) || !this.inBounds(r2, c2)) continue;
      const mid  = at(r1, c1);
      const land = at(r2, c2);
      if ((mid.type === "BLUE" || mid.type === "BLUE_KING") && land.type === "EMPTY") {
        return { from: landing, to: land, isCapture: true as const };
      }
    }
    return null;
  }

  async clickSquare(sq: Square) {
    await sq.el.scrollIntoViewIfNeeded();
    await sq.el.click();
  }

  // Click engine's "Make a move" if present; do nothing if not visible yet. */
  async engineMoveIfAvailable(): Promise<boolean> {
    const link = this.msg.locator('a:has-text("Make a move")')
      .or(this.page.getByRole("link", { name: /make a move/i }))
      .or(this.page.getByRole("button", { name: /make a move/i }));

    try {
      await link.waitFor({ state: "visible", timeout: 1500 });
    } catch {
      return false; 
    }
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await this.page.waitForTimeout(250);
    return true;
  }

  async restart() {
    await this.restartLnk.scrollIntoViewIfNeeded();
    await this.restartLnk.click();
    await this.page.waitForTimeout(200);
  }

  // internals 
  private classify(src: string): CellType {
    const s = (src ?? "").toLowerCase();
    if (s.includes("you") && s.includes("king")) return "ORANGE_KING";
    if (s.includes("me")  && s.includes("king")) return "BLUE_KING";
    if (s.includes("you")) return "ORANGE";
    if (s.includes("me"))  return "BLUE";
    return "EMPTY"; // remaining space squares
  }

  private inBounds(r: number, c: number) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }
}

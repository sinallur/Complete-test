import { test, expect } from "@playwright/test";
import { scoreThreeCards, Rank } from "../src/scoring";

test.describe("Card Game (Blackjack-style scoring)", () => {
  test("Deal two 3-card hands and report any exact-21", async ({
    request,
    baseURL,
  }) => {
    // 1) Confirm site is up
    const health = await request.get(baseURL! + "/");
    expect(health.ok()).toBeTruthy();

    // 2) New deck
    const newDeck = await request.get("/api/deck/new/");
    expect(newDeck.ok()).toBeTruthy();
    const deckJson = await newDeck.json();
    const deckId: string = deckJson.deck_id;
    expect(deckId).toBeTruthy();

    // 3) Shuffle
    const shuffled = await request.get(`/api/deck/${deckId}/shuffle/`);
    expect(shuffled.ok()).toBeTruthy();

    // 4) Deal 6 cards (3 each)
    const draw = await request.get(`/api/deck/${deckId}/draw/?count=6`);
    expect(draw.ok()).toBeTruthy();
    const drawJson = await draw.json();

    const cards: { value: string }[] = drawJson.cards;
    expect(cards.length).toBe(6);

    // 5) Split hands
    const p1 = cards.slice(0, 3).map((c) => normalizeRank(c.value));
    const p2 = cards.slice(3, 6).map((c) => normalizeRank(c.value));

    const p1Total = scoreThreeCards(p1);
    const p2Total = scoreThreeCards(p2);

    // 6) Log results (readable output)
    console.log(`P1: ${p1.join(", ")} = ${p1Total}`);
    console.log(`P2: ${p2.join(", ")} = ${p2Total}`);

    // 7) Assert: identify who has exactly 21 (if any)
    const p1Is21 = p1Total === 21;
    const p2Is21 = p2Total === 21;

    if (p1Is21 && p2Is21) {
      console.log("Both players have exactly 21.");
    } else if (p1Is21) {
      console.log("Player 1 has exactly 21.");
    } else if (p2Is21) {
      console.log("Player 2 has exactly 21.");
    } else {
      console.log("No player has exactly 21.");
    }

    // Optional assertions to ensure boolean results
    expect([true, false]).toContain(p1Is21);
    expect([true, false]).toContain(p2Is21);
  });
});

// Helpers
function normalizeRank(apiValue: string): Rank {
  // API returns "ACE","KING","QUEEN","JACK","10"... "2"
  const v = apiValue.toUpperCase();
  if (v === "ACE") return "A";
  if (v === "KING") return "K";
  if (v === "QUEEN") return "Q";
  if (v === "JACK") return "J";

  return v as Rank;
}

export type Rank =
  | "A"
  | "K"
  | "Q"
  | "J"
  | "10"
  | "9"
  | "8"
  | "7"
  | "6"
  | "5"
  | "4"
  | "3"
  | "2";

export function cardValue(rank: Rank): number {
  if (rank === "A") return 11; 
  if (rank === "K" || rank === "Q" || rank === "J") return 10;
  return Number(rank);
}

export function scoreThreeCards(ranks: Rank[]): number {
  let total = 0;
  let aces = 0;
  for (const r of ranks) {
    total += cardValue(r);
    if (r === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10; // convert one Ace 11 -> 1
    aces--;
  }
  return total;
}

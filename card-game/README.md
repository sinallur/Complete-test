# Card Game (Blackjack-style scoring)
This project uses the (https://deckofcardsapi.com/) to deal two 3-card hands and score them using simplified blackjack rules.  
The goal is to check if either player hits exactly 21.

# What the test does
1. Confirms the API is reachable.  
2. Requests a new deck and shuffles it.  
3. Draws 6 cards (3 for each player).  
4. Calculates each hand’s score:  
   - 2–10 → face value  
   - J, Q, K → 10 points  
   - Ace → 11 points unless that would bust, in which case 1  
5. Prints both hands and totals, and reports if either has 21.  

# How to Run

```bash
npm install
npx playwright install
cd ./card-game && npx playwright test --reporter=list
```
Notes

Only card scoring is implemented, not full blackjack rules.
The scoring logic is isolated so you can test it separately from the API calls.
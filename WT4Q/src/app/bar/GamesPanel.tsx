"use client";

import { useMemo, useState } from "react";
import styles from "./bar.module.css";

export default function GamesPanel() {
  const [activeGame, setActiveGame] = useState<"coin" | "dice" | "luckyNumber">("coin");
  const [coinResult, setCoinResult] = useState<"Heads" | "Tails" | null>(null);
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinAngle, setCoinAngle] = useState(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [luckySecret, setLuckySecret] = useState(() => 1 + Math.floor(Math.random() * 10));
  const [luckyGuess, setLuckyGuess] = useState("");
  const [luckyFeedback, setLuckyFeedback] = useState<string | null>(null);

  function flipCoin() {
    if (coinFlipping) return;
    setCoinFlipping(true);
    setCoinResult(null);
    const next = Math.random() < 0.5 ? "Heads" : "Tails";
    setCoinAngle((prev) => prev + 360 + (next === "Heads" ? 0 : 180));
    window.setTimeout(() => {
      setCoinResult(next);
      setCoinFlipping(false);
    }, 450);
  }

  function rollDice() {
    if (diceRolling) return;
    setDiceRolling(true);
    window.setTimeout(() => {
      const next = 1 + Math.floor(Math.random() * 6);
      setDiceValue(next);
      setDiceRolling(false);
    }, 450);
  }

  function resetLuckyNumber() {
    setLuckySecret(1 + Math.floor(Math.random() * 10));
    setLuckyGuess("");
    setLuckyFeedback(null);
  }

  function submitLuckyGuess(e: React.FormEvent) {
    e.preventDefault();
    const n = Number.parseInt(luckyGuess, 10);
    if (!Number.isFinite(n) || n < 1 || n > 10) {
      setLuckyFeedback("Pick a number from 1 to 10.");
      return;
    }
    if (n === luckySecret) {
      setLuckyFeedback("Spot on - that earns you a sip!");
    } else if (n < luckySecret) {
      setLuckyFeedback("Too low. Take a small sip and try again.");
    } else {
      setLuckyFeedback("Too high. Pass the glass and guess again.");
    }
  }

  const diceTransform = useMemo(() => {
    const value = diceValue ?? 1;
    switch (value) {
      case 1:
        return "rotateX(0deg) rotateY(0deg)";
      case 2:
        return "rotateX(-90deg) rotateY(0deg)";
      case 3:
        return "rotateX(0deg) rotateY(90deg)";
      case 4:
        return "rotateX(0deg) rotateY(-90deg)";
      case 5:
        return "rotateX(90deg) rotateY(0deg)";
      case 6:
        return "rotateX(180deg) rotateY(0deg)";
      default:
        return "rotateX(0deg) rotateY(0deg)";
    }
  }, [diceValue]);

  return (
    <section className={styles.gamesSection}>
      <h2 className={styles.sectionTitle}>Bar Games Corner</h2>
      <p className={styles.sectionHint}>
        Small, tap-friendly games made for sofa sessions and phone screens.
      </p>
      <div className={styles.gameTabs}>
        {[
          { id: "coin", label: "Coin Flip" },
          { id: "dice", label: "Dice Roll" },
          { id: "luckyNumber", label: "Lucky Number" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={
              tab.id === activeGame
                ? `${styles.gameTab} ${styles.gameTabActive}`
                : styles.gameTab
            }
            onClick={() => setActiveGame(tab.id as typeof activeGame)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeGame === "coin" && (
        <div className={styles.gameCard}>
          <h3 className={styles.gameTitle}>Coin Flip</h3>
          <p className={styles.gamePrompt}>
            Call heads or tails, tap the button, and whoever loses takes a sip.
          </p>
          <div className={styles.coinWrapper}>
            <div
              className={styles.coin3d}
              style={{ transform: `rotateY(${coinAngle}deg)` }}
            >
              <div className={`${styles.coinFace} ${styles.coinFaceFront}`}>H</div>
              <div className={`${styles.coinFace} ${styles.coinFaceBack}`}>T</div>
            </div>
          </div>
          <button
            type="button"
            className={styles.gameButtonPrimary}
            onClick={flipCoin}
            disabled={coinFlipping}
          >
            {coinFlipping ? "Flipping..." : "Flip the coin"}
          </button>
          {coinResult && (
            <p className={styles.gameResult}>
              Result: <span>{coinResult}</span>
            </p>
          )}
        </div>
      )}
      {activeGame === "dice" && (
        <div className={styles.gameCard}>
          <h3 className={styles.gameTitle}>Dice Roll</h3>
          <p className={styles.gamePrompt}>
            Highest roll chooses the next cocktail, lowest roll fetches the glasses.
          </p>
          <div className={styles.diceWrapper}>
            <div
              className={styles.dice3d}
              style={{ transform: diceRolling ? `${diceTransform} rotateZ(360deg)` : diceTransform }}
            >
              <div className={`${styles.diceFace} ${styles.diceFaceFront}`}>1</div>
              <div className={`${styles.diceFace} ${styles.diceFaceBack}`}>6</div>
              <div className={`${styles.diceFace} ${styles.diceFaceRight}`}>3</div>
              <div className={`${styles.diceFace} ${styles.diceFaceLeft}`}>4</div>
              <div className={`${styles.diceFace} ${styles.diceFaceTop}`}>2</div>
              <div className={`${styles.diceFace} ${styles.diceFaceBottom}`}>5</div>
            </div>
          </div>
          <button
            type="button"
            className={styles.gameButtonPrimary}
            onClick={rollDice}
            disabled={diceRolling}
          >
            {diceRolling ? "Rolling..." : "Roll the dice"}
          </button>
          {diceValue !== null && (
            <p className={styles.gameResult}>
              You rolled: <span>{diceValue}</span>
            </p>
          )}
        </div>
      )}
      {activeGame === "luckyNumber" && (
        <div className={styles.gameCard}>
          <h3 className={styles.gameTitle}>Lucky Number (1-10)</h3>
          <p className={styles.gamePrompt}>
            One person secretly sets the number. Everyone else guesses - wrong guesses sip
            before the next round.
          </p>
          <form onSubmit={submitLuckyGuess} className={styles.luckyForm}>
            <input
              type="number"
              min={1}
              max={10}
              value={luckyGuess}
              onChange={(e) => setLuckyGuess(e.target.value)}
              className={styles.luckyInput}
              placeholder="Your guess"
            />
            <button type="submit" className={styles.gameButtonPrimary}>
              Guess
            </button>
            <button
              type="button"
              className={styles.gameButtonSecondary}
              onClick={resetLuckyNumber}
            >
              New secret number
            </button>
          </form>
          {luckyFeedback && <p className={styles.gameResult}>{luckyFeedback}</p>}
        </div>
      )}
    </section>
  );
}

"use client";
import { useMetroStore } from "@/hooks/useMetroStore";
import styles from "@/styles/metrotrade/ui.module.css";

export default function HUD(){
  const state = useMetroStore(s=>s.state);
  const roll = useMetroStore(s=>s.roll);
  const resolve = useMetroStore(s=>s.resolve);
  const end = useMetroStore(s=>s.end);
  const buy = useMetroStore(s=>s.buy);

  const me = state.players[state.turn];
  const canInteract = me.isHuman && !me.bankrupt;

  return (
    <div className={styles.hud}>
      <div className={styles.turnRow}>
        <div><strong>Turn:</strong> {me.name}</div>
        <div><strong>Dice:</strong> {state.dice? `${state.dice[0]} + ${state.dice[1]}` : "—"}</div>
      </div>
      <div className={styles.buttons}>
        <button disabled={!canInteract} onClick={roll}>Roll</button>
        <button disabled={!canInteract} onClick={resolve}>Resolve</button>
        <button disabled={!canInteract || !state.prompts.canBuy} onClick={buy}>Buy</button>
        <button disabled={!canInteract} onClick={end}>End Turn</button>
      </div>
      <div className={styles.log}>
        {state.log.slice(-8).map((l,i)=> <div key={i} className={styles.logLine}>{l.text}</div>)}
      </div>
    </div>
  );
}

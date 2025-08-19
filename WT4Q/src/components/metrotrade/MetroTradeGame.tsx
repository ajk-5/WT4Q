"use client";
import { useMemo, useState } from "react";
import { useMetroStore } from "@/hooks/useMetroStore";
import Board from "./Board";
import HUD from "./HUD";
import PlayerPanel from "./PlayerPanel";
import styles from "@/styles/metrotrade/ui.module.css";

export default function MetroTradeGame(){
  const [players, setPlayers] = useState(2);
  const [humans, setHumans] = useState(1);
  const init = useMetroStore(s=>s.init);
  const state = useMetroStore(s=>s.state);

  const onStart = () => init({ players, humans });

  const bankruptCount = useMemo(()=> state.players.filter(p=>p.bankrupt).length, [state.players]);
  const gameOver = bankruptCount >= state.players.length-1;

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.brand}>MetroTrade</div>
        <div className={styles.controls}>
          <label>Players
            <input type="number" min={2} max={5} value={players} onChange={e=>setPlayers(parseInt(e.target.value||"2"))}/>
          </label>
          <label>Humans
            <input type="number" min={1} max={Math.max(1, players-1)} value={humans} onChange={e=>setHumans(parseInt(e.target.value||"1"))}/>
          </label>
          <button onClick={onStart} className={styles.primary}>Start</button>
        </div>
      </div>
      <div className={styles.layout}>
        <div className={styles.boardWrap}><Board/></div>
        <div className={styles.side}>
          <HUD/>
          <PlayerPanel/>
        </div>
      </div>
      {gameOver && <div className={styles.overlay}><div className={styles.modal}><h2>Game Over</h2><p>Winner: {state.players.sort((a,b)=>b.netWorth-a.netWorth)[0].name}</p><button onClick={()=>init({ players, humans })}>Play again</button></div></div>}
    </div>
  );
}

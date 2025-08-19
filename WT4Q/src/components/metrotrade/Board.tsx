"use client";
import { useMetroStore } from "@/hooks/useMetroStore";
import { BOARD } from "@/lib/metrotrade/constants";
import Tile from "./Tile";
import boardCss from "@/styles/metrotrade/board.module.css";

export default function Board(){
  const state = useMetroStore(s=>s.state);
  return (
    <div className={boardCss.grid}>
      {BOARD.map((tile)=> (
        <div key={tile.i} className={boardCss.tile}><Tile tile={state.tiles[tile.i]} /></div>
      ))}
    </div>
  );
}

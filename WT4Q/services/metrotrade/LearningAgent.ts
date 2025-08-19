import type { GameState, PlayerId } from "@/lib/metrotrade/types";
import { storage } from "./storage";

// Lightweight tabular learner for buy/build policy using discretized features.
// State features: cash bucket, tile cost bucket, group holdings percentage, dice sum bucket.
// Actions: BUY vs SKIP; BUILD vs HOLD. Epsilon-greedy; online updates with TD(0).

type Action = "BUY" | "SKIP" | "BUILD" | "HOLD";

interface QTable { [key: string]: number; }

export class LearningAgent {
  private q: QTable;
  private eps: number;
  private alpha: number;
  private gamma: number;
  private key: string;

  constructor(id: PlayerId) {
    this.key = `metrotrade.q.p${id}`;
    this.q = storage.get<QTable>(this.key, {});
    this.eps = 0.1;
    this.alpha = 0.2;
    this.gamma = 0.9;
  }

  private fCash(v: number){ return Math.min(6, Math.max(0, Math.floor(v/300))); }
  private fCost(v: number){ return Math.min(6, Math.max(0, Math.floor(v/100))); }
  private discretize(g: GameState, action: Action){
    const me = g.players[g.turn];
    const tile = g.tiles[me.pos];
    const cost = tile.property?.cost || 0;
    const ownInGroup = g.tiles.filter(t => t.property && t.property.owner===me.id && t.property.group===tile.property?.group).length;
    const groupSize = g.tiles.filter(t => t.property && t.property.group===tile.property?.group).length || 1;
    const feat = {
      c: this.fCash(me.cash),
      k: this.fCost(cost),
      h: Math.floor((ownInGroup/groupSize)*3), // 0..3
      d: g.dice ? Math.min(2, Math.floor(((g.dice[0]+g.dice[1])-2)/4)) : 1
    };
    return `a:${action}|c:${feat.c}|k:${feat.k}|h:${feat.h}|d:${feat.d}`;
  }

  private qv(s: string){ return this.q[s] ?? 0; }
  private upd(s: string, r: number, s2: string){
    const target = r + this.gamma * this.qv(s2);
    const v = this.qv(s) + this.alpha * (target - this.qv(s));
    this.q[s] = v; storage.set(this.key, this.q);
  }

  decideBuy(g: GameState): boolean {
    const sBuy = this.discretize(g, "BUY");
    const sSkip = this.discretize(g, "SKIP");
    if (Math.random() < this.eps) return Math.random() < 0.5;
    return this.qv(sBuy) >= this.qv(sSkip);
  }

  learnBuy(gBefore: GameState, gAfter: GameState, didBuy: boolean){
    const s = this.discretize(gBefore, didBuy ? "BUY" : "SKIP");
    const s2 = this.discretize(gAfter, didBuy ? "BUY" : "SKIP");
    const meAfter = gAfter.players[gAfter.turn];
    const meBefore = gBefore.players[gBefore.turn];
    const r = (meAfter.netWorth - meBefore.netWorth) / 50; // scale reward
    this.upd(s, r, s2);
  }

  decideBuild(g: GameState, _tileIndex: number): boolean {
    const sBuild = this.discretize(g, "BUILD");
    const sHold = this.discretize(g, "HOLD");
    if (Math.random() < this.eps) return Math.random() < 0.5;
    return this.qv(sBuild) >= this.qv(sHold);
  }

  learnBuild(gBefore: GameState, gAfter: GameState, did: boolean){
    const s = this.discretize(gBefore, did ? "BUILD" : "HOLD");
    const s2 = this.discretize(gAfter, did ? "BUILD" : "HOLD");
    const meAfter = gAfter.players[gAfter.turn];
    const meBefore = gBefore.players[gBefore.turn];
    const r = (meAfter.netWorth - meBefore.netWorth) / 50;
    this.upd(s, r, s2);
  }
}

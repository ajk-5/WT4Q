// To run: npm i -D vitest @types/node tsx && npx vitest run
import { describe, it, expect } from "vitest";
import { initGame, rollAndAdvance, resolveLanding, buyCurrent } from "../lib/metrotrade/engine";

// Helper to force a known dice outcome by setting rngSeed
function setSeed(g:any, seed:number){ g.rngSeed = seed >>> 0; return g; }

describe("engine basics", () => {
  it("initializes with requested players", () => {
    const g = initGame({ players: 5, humans: 2 });
    expect(g.players.length).toBe(5);
    expect(g.players.filter(p=>p.isHuman).length).toBe(2);
  });

  it("rolls and advances position", () => {
    let g = initGame({ players: 2, humans: 1 });
    setSeed(g, 123456);
    const old = g.players[g.turn].pos;
    g = rollAndAdvance(g);
    expect(g.players[g.turn].pos).not.toBe(old);
  });

  it("allows buying unowned property", () => {
    let g = initGame({ players: 2, humans: 1 });
    // Teleport to a known property tile
    g.players[g.turn].pos = 1; // Lime Street
    g = resolveLanding(g);
    expect(g.prompts.canBuy).toBe(true);
    const cashBefore = g.players[g.turn].cash;
    g = buyCurrent(g);
    expect(g.players[g.turn].cash).toBeLessThan(cashBefore);
    expect(g.tiles[1].property!.owner).toBe(g.players[g.turn].id);
  });

  it("pays rent when landing on opponent property", () => {
    let g = initGame({ players: 2, humans: 2 });
    // Player 0 buys tile 1
    g.players[0].pos = 1; g = resolveLanding(g); g = buyCurrent(g);
    // Switch to player 1 and land on tile 1
    g.turn = 1; g.players[1].pos = 1; const cashBefore = g.players[1].cash; const ownerBefore = g.players[0].cash;
    g = resolveLanding(g);
    expect(g.players[1].cash).toBeLessThan(cashBefore);
    expect(g.players[0].cash).toBeGreaterThan(ownerBefore);
  });
});

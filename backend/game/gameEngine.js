import GameLogic from "./utils.js";

class GameEngine {
  constructor(players, dots) {
    // Core state
    this.players = players;
    this.dots = dots;

    this.lines = [];
    this.polygons = [];

    this.turn = 0;
    this.movesLeft = 0;
    this.diceVal = 0;

    this.gameState = "rolling"; // rolling | playing | ended
  }

  /* -------------------- GAME FLOW -------------------- */

  rollDice() {
    if (this.gameState !== "rolling") return null;

    const val = Math.ceil(Math.random() * 6);
    this.diceVal = val;
    this.movesLeft = val;
    this.gameState = "playing";

    return val;
  }

  nextTurn() {
    this.turn = (this.turn + 1) % this.players.length;
    this.movesLeft = 0;
    this.diceVal = 0;
    this.gameState = "rolling";
  }

  /* -------------------- GAME END CHECK -------------------- */

  checkGameOver() {
    if (this.gameState !== "playing") return false;

    if (this.lines.length >= 2) {
      const canPlay = GameLogic.canFormAnyTriangle(
        this.lines,
        this.dots,
        this.polygons
      );

      if (!canPlay) {
        this.gameState = "ended";
        return true;
      }
    }

    return false;
  }

  /* -------------------- MOVE HANDLING -------------------- */

  attemptConnection(p1Id, p2Id) {
    if (this.gameState !== "playing") return false;
    if (this.movesLeft <= 0) return false;

    const p1 = this.dots.find(d => d.id === p1Id);
    const p2 = this.dots.find(d => d.id === p2Id);

    if (!p1 || !p2) return false;

    // 1️⃣ Duplicate line
    const exists = this.lines.some(
      l =>
        (l.from === p1Id && l.to === p2Id) ||
        (l.from === p2Id && l.to === p1Id)
    );
    if (exists) return false;

    // 2️⃣ Intermediate dot
    if (GameLogic.hasIntermediateDot(p1, p2, this.dots)) return false;

    // 3️⃣ Intersection
    const intersect = this.lines.some(l => {
      if (
        l.from === p1Id ||
        l.to === p1Id ||
        l.from === p2Id ||
        l.to === p2Id
      )
        return false;

      const a = this.dots.find(d => d.id === l.from);
      const b = this.dots.find(d => d.id === l.to);

      return GameLogic.doLinesIntersect(p1, p2, a, b);
    });
    if (intersect) return false;

    // 4️⃣ Polygon size
    const newLine = { from: p1Id, to: p2Id, ownerId: this.turn };
    const testLines = [...this.lines, newLine];

    if (GameLogic.wouldCreateLargerPolygon(p1Id, p2Id, testLines))
      return false;

    // 5️⃣ Apply move
    this.lines = testLines;

    const triangle = GameLogic.findNewTriangles(
      p1Id,
      p2Id,
      this.lines,
      this.dots,
      this.turn
    );

    if (triangle && !this.isTriangleAlreadyScored(triangle)) {
      this.polygons.push(triangle);
    }

    this.movesLeft--;

    if (this.movesLeft === 0) {
      this.nextTurn();
    }

    this.checkGameOver();
    return true;
  }

  /* -------------------- HELPERS -------------------- */

  isTriangleAlreadyScored(triangle) {
    const ids = triangle.points
      .map(p => p.id)
      .sort()
      .join(",");

    return this.polygons.some(p =>
      p.points.map(d => d.id).sort().join(",") === ids
    );
  }

  getScores() {
    return this.players.map(
      (_, i) => this.polygons.filter(p => p.ownerId === i).length
    );
  }

  /* -------------------- STATE SNAPSHOT -------------------- */

  getState() {
    return {
      dots: this.dots,
      lines: this.lines,
      polygons: this.polygons,
      turn: this.turn,
      movesLeft: this.movesLeft,
      diceVal: this.diceVal,
      gameState: this.gameState,
      scores: this.getScores()
    };
  }
}

export default GameEngine;
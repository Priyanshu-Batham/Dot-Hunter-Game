import GameEngine from "./gameEngine.js";

const games = new Map(); // roomId -> GameEngine

export function createGame(roomId, players, dots) {
  games.set(roomId, new GameEngine(players, dots));
}

export function getGame(roomId) {
  return games.get(roomId);
}
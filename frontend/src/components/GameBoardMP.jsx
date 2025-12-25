import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Trophy, RefreshCcw } from "lucide-react";
import Dice from "./Dice.jsx";

/* ----------------------------------------------------
   SOCKET
---------------------------------------------------- */
const socket = io("http://localhost:3000", {
  transports: ["websocket"]
});

/* ----------------------------------------------------
   GAME OVER MODAL
---------------------------------------------------- */
const GameOverModal = ({ scores, players, onRestart }) => {
  const maxScore = Math.max(...scores);
  const winners = players.filter((_, i) => scores[i] === maxScore);
  const isTie = winners.length > 1;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md text-center font-handwriting border-4 border-stone-800 text-stone-800">
        <Trophy size={60} className="mx-auto mb-4 text-stone-800" />

        <h2 className="text-5xl font-extrabold mb-2">
          {isTie ? "It's a Tie!" : "Game Over!"}
        </h2>

        <p className="text-xl text-stone-600 mb-6">
          {isTie
            ? "Both players played equally well!"
            : `${winners[0].name} wins with ${maxScore} triangles!`}
        </p>

        <div className="space-y-3 mb-8">
          {players.map((p, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-3 rounded-xl border-2 ${
                scores[i] === maxScore && !isTie
                  ? "bg-yellow-50 border-yellow-400"
                  : "bg-stone-100 border-stone-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span className="font-bold text-stone-800">{p.name}</span>
              </div>
              <span className="font-extrabold text-2xl text-stone-800">
                {scores[i]}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onRestart}
          className="w-full py-3 bg-stone-800 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-stone-700"
        >
          <RefreshCcw size={20} /> Back to Menu
        </button>
      </div>
    </div>
  );
};

/* ----------------------------------------------------
   GAME BOARD MULTIPLAYER
---------------------------------------------------- */
const GameBoardMP = ({ name, onRestart }) => {
  const [players, setPlayers] = useState([]);
  const [state, setState] = useState(null);
  const [playerIndex, setPlayerIndex] = useState(null);
  const [waiting, setWaiting] = useState(true);

  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [nearestDot, setNearestDot] = useState(null);

  const containerRef = useRef(null);

  /* ---------------- SOCKET INIT ---------------- */
  useEffect(() => {
    console.log("JOIN_GAME sending name:", name);
    socket.emit("join_game", { name });

    socket.on("waiting", () => setWaiting(true));

    socket.on("game_start", ({ playerIndex, players: serverPlayers }) => {
      setPlayers(
        serverPlayers.map((p, i) => {
          console.log(p.name);
          return {name: p.name,
          color: i === 0 ? "#ef4444" : "#3b82f6",
          isAI: false}
        })
      );
      setPlayerIndex(playerIndex);
      setWaiting(false);
    });

    socket.on("state_update", setState);

    socket.on("game_over", () => {
      alert("Opponent disconnected");
      onRestart();
    });

    return () => socket.removeAllListeners();
  }, []);

  if (waiting) {
    return (
      <div className="h-screen flex items-center align-center justify-center font-handwriting text-3xl text-white">
        Waiting for opponent…
      </div>
    );
  }

  if (!state) return null;

  const {
    dots,
    lines,
    polygons,
    turn,
    movesLeft,
    diceVal,
    gameState,
    scores
  } = state;

  const myTurn = turn === playerIndex;

  const rollDice = () => {
    if (myTurn && gameState === "rolling") socket.emit("roll_dice");
  };

  const attemptConnection = (from, to) => {
    if (myTurn && gameState === "playing") {
      socket.emit("attempt_connection", { from: from.id, to: to.id });
    }
  };

  /* ---------------- DRAG ---------------- */
  const getRelativePos = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleMouseDown = (dot, e) => {
    if (!myTurn || gameState !== "playing") return;
    e.preventDefault();
    setDragStart(dot);
    setDragCurrent({ x: dot.x, y: dot.y });
  };

  const handleMouseMove = (e) => {
    if (!dragStart) return;
    const pos = getRelativePos(e);
    setDragCurrent(pos);

    const closest = dots.find(
      d =>
        d.id !== dragStart.id &&
        Math.hypot(d.x - pos.x, d.y - pos.y) < 50
    );
    setNearestDot(closest || null);
  };

  const handleMouseUp = () => {
    if (dragStart && nearestDot) {
      attemptConnection(dragStart, nearestDot);
    }
    setDragStart(null);
    setDragCurrent(null);
    setNearestDot(null);
  };

  /* ---------------- RENDER ---------------- */
  return (
    <div className="h-screen w-screen bg-[#fcfbf9] flex flex-col font-handwriting text-stone-800">

      {gameState === "ended" && (
        <GameOverModal scores={scores} players={players} onRestart={onRestart} />
      )}

      {/* HEADER */}
      <div className="w-full px-6 py-4 flex justify-between items-center">
        <div className="flex gap-4">
          {players.map((p, i) => (
            <div
              key={i}
              className={`px-5 py-2 rounded-2xl border-2 transition-all ${
                turn === i
                  ? "bg-white border-stone-800 shadow-md -translate-y-1"
                  : "bg-stone-100 border-stone-300 opacity-70"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span className="font-bold text-stone-800">
                  {p.name} {i === playerIndex && "(You)"}
                </span>
              </div>
              <div className="text-xs uppercase tracking-wider text-stone-600">
                Triangles: {scores[i]}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {gameState === "playing" && (
            <div className="px-4 py-2 bg-stone-200 rounded-xl font-bold text-stone-800">
              Moves: {movesLeft}
            </div>
          )}
          <Dice
            value={diceVal}
            disabled={!myTurn || gameState !== "rolling"}
            onRoll={rollDice}
          />
        </div>
      </div>

      {/* BOARD */}
      <div className="flex-1 px-6 pb-6">
        <div
          ref={containerRef}
          className="relative w-full h-full bg-white rounded shadow-xl overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {polygons.map((poly, i) => (
              <polygon
                key={i}
                points={poly.points.map(p => `${p.x},${p.y}`).join(" ")}
                fill={players[poly.ownerId].color}
                fillOpacity="0.25"
              />
            ))}

            {lines.map((l, i) => {
              const a = dots.find(d => d.id === l.from);
              const b = dots.find(d => d.id === l.to);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={players[l.ownerId].color}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              );
            })}

            {dragStart && dragCurrent && (
              <line
                x1={dragStart.x}
                y1={dragStart.y}
                x2={dragCurrent.x}
                y2={dragCurrent.y}
                stroke={players[turn].color}
                strokeWidth="4"
                strokeDasharray="8,8"
              />
            )}
          </svg>

          {dots.map(dot => (
            <div
              key={dot.id}
              onMouseDown={(e) => handleMouseDown(dot, e)}
              onTouchStart={(e) => handleMouseDown(dot, e)}
              className="absolute w-6 h-6 rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: dot.x,
                top: dot.y,
                backgroundColor:
                  nearestDot?.id === dot.id
                    ? players[turn].color
                    : "#57534e"
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameBoardMP;

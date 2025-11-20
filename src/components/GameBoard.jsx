import { useState, useEffect, useRef } from 'react';
import GameLogic from "../utils/gameLogic";
import Dice from './Dice.jsx';

const GameBoard = ({ players, onRestart }) => {
  // Game State
  const [dots, setDots] = useState([]);
  const [lines, setLines] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [turn, setTurn] = useState(0);
  const [movesLeft, setMovesLeft] = useState(0);
  const [diceVal, setDiceVal] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [gameState, setGameState] = useState('rolling'); // 'rolling', 'playing', 'ended'
  
  // Dragging State
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null); // {x, y}

  const containerRef = useRef(null);

  // Initialize Board
  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setDots(GameLogic.generateStaggeredDots(clientWidth, clientHeight));
    }
  }, []);

  const rollDice = () => {
    setIsRolling(true);
    // Animate dice roll
    let count = 0;
    const interval = setInterval(() => {
      setDiceVal(Math.ceil(Math.random() * 6));
      count++;
      if (count > 10) {
        clearInterval(interval);
        const finalVal = Math.ceil(Math.random() * 6);
        setDiceVal(finalVal);
        setMovesLeft(finalVal);
        setGameState('playing');
        setIsRolling(false);
      }
    }, 100);
  };

  const nextTurn = () => {
    setTurn(prev => (prev + 1) % players.length);
    setGameState('rolling');
    setMovesLeft(0);
    setDiceVal(0);
    setDragStart(null);
    setDragCurrent(null);
  };

  // --- DRAG INTERACTION HANDLERS ---

  const getRelativePos = (e) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleMouseDown = (dot, e) => {
    if (gameState !== 'playing' || movesLeft <= 0) return;
    setDragStart(dot);
    setDragCurrent({ x: dot.x, y: dot.y });
  };

  const handleMouseMove = (e) => {
    if (!dragStart) return;
    const pos = getRelativePos(e);
    setDragCurrent(pos);
  };

  const handleMouseUp = (e) => {
    if (!dragStart) return;
    
    // Check if we released over a dot
    const pos = getRelativePos(e);
    const hitRadius = 30; // generous hit area
    const targetDot = dots.find(d => Math.hypot(d.x - pos.x, d.y - pos.y) < hitRadius);

    if (targetDot && targetDot.id !== dragStart.id) {
      attemptConnection(dragStart, targetDot);
    }

    setDragStart(null);
    setDragCurrent(null);
  };

  const attemptConnection = (p1, p2) => {
    // 1. Check duplication
    const exists = lines.some(l => 
      (l.from === p1.id && l.to === p2.id) || (l.from === p2.id && l.to === p1.id)
    );
    if (exists) return;

    // 2. Check Intersection (Logic Module)
    const intersect = lines.some(l => {
      if (l.from === p1.id || l.to === p1.id || l.from === p2.id || l.to === p2.id) return false;
      const l1 = dots.find(d => d.id === l.from);
      const l2 = dots.find(d => d.id === l.to);
      return GameLogic.doLinesIntersect(p1, p2, l1, l2);
    });
    if (intersect) return;

    // 3. Valid Move -> Commit
    const newLine = { from: p1.id, to: p2.id, ownerId: turn };
    const newLines = [...lines, newLine];
    
    // Cycle Detection
    const newPoly = GameLogic.findNewPolygons(p1.id, p2.id, lines, dots, turn);
    
    setLines(newLines);
    if (newPoly) {
      setPolygons(prev => [...prev, newPoly]);
    }

    const newMoves = movesLeft - 1;
    setMovesLeft(newMoves);
    if (newMoves === 0) {
      // Small delay before switching turn so user sees the line
      setTimeout(nextTurn, 500);
    }
  };

  const scores = players.map((_, idx) => polygons.filter(p => p.ownerId === idx).length);

  return (
    <div className="h-screen w-screen bg-[#fcfbf9] flex flex-col font-handwriting overflow-hidden text-stone-800">
      
      {/* --- HEADER / HUD --- */}
      <div className="w-full px-6 py-4 flex justify-between items-center z-10">
        <div className="flex gap-4">
          {players.map((p, i) => (
            <div 
              key={i} 
              className={`relative px-5 py-2 rounded-2xl border-2 transition-all duration-300 flex items-center gap-3
                ${turn === i ? 'bg-white border-stone-800 shadow-md -translate-y-1' : 'bg-transparent border-transparent opacity-50'}
              `}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
              <div className="flex flex-col leading-none">
                <span className="font-bold text-lg">{p.name}</span>
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Score: {scores[i]}</span>
              </div>
              {turn === i && (
                <div className="absolute -top-2 -right-2 bg-stone-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs animate-bounce">
                  ✎
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4">
           {gameState === 'playing' && (
             <div className="bg-stone-100 px-4 py-2 rounded-xl font-bold text-stone-600">
               Moves: {movesLeft}
             </div>
           )}
           <Dice value={diceVal} rolling={isRolling} disabled={gameState !== 'rolling'} onRoll={rollDice} />
        </div>
      </div>

      {/* --- GAME AREA --- */}
      <div className="flex-1 w-full px-6 pb-6 flex flex-col">
        
        {/* The Paper */}
        <div className="relative w-full h-full bg-white rounded-sm shadow-2xl overflow-hidden border border-stone-200"
             style={{ 
               boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
               backgroundImage: `radial-gradient(#e7e5e4 1.5px, transparent 1.5px)`,
               backgroundSize: '24px 24px'
             }}>
          
          {/* SVG Layer (Lines, Shapes, Drag Preview) */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
          >
            {/* Closed Polygons */}
            {polygons.map((poly, i) => {
              const pts = poly.points.map(p => `${p.x},${p.y}`).join(' ');
              return (
                <g key={i} className="animate-fadeIn">
                  <polygon points={pts} fill={players[poly.ownerId].color} fillOpacity="0.2" stroke="none" />
                  {/* Centered Icon */}
                  {(() => {
                     const cx = poly.points.reduce((s, p) => s + p.x, 0) / poly.points.length;
                     const cy = poly.points.reduce((s, p) => s + p.y, 0) / poly.points.length;
                     return <text x={cx} y={cy} textAnchor="middle" dy=".3em" fill={players[poly.ownerId].color} fontSize="24">★</text>;
                  })()}
                </g>
              );
            })}

            {/* Existing Lines */}
            {lines.map((line, i) => {
              const p1 = dots.find(d => d.id === line.from);
              const p2 = dots.find(d => d.id === line.to);
              return (
                <line 
                  key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke={players[line.ownerId].color} strokeWidth="4" strokeLinecap="round"
                  className="animate-draw"
                />
              );
            })}

            {/* Drag Preview Line */}
            {dragStart && dragCurrent && (
              <line 
                x1={dragStart.x} y1={dragStart.y} x2={dragCurrent.x} y2={dragCurrent.y}
                stroke={players[turn].color} strokeWidth="4" strokeLinecap="round" strokeDasharray="8,8"
                className="opacity-60"
              />
            )}
          </svg>

          {/* Interaction Layer (Dots) */}
          <div 
            ref={containerRef}
            className="absolute inset-0 z-20 touch-none" // touch-none prevents scrolling on mobile while dragging
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            onMouseLeave={() => { setDragStart(null); setDragCurrent(null); }}
          >
            {dots.map(dot => (
              <div
                key={dot.id}
                onMouseDown={(e) => handleMouseDown(dot, e)}
                onTouchStart={(e) => handleMouseDown(dot, e)}
                className={`absolute w-6 h-6 rounded-full transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-200
                  ${dragStart?.id === dot.id ? 'scale-150 ring-4 ring-stone-200 z-30' : 'hover:scale-150 z-20'}
                `}
                style={{ 
                  left: dot.x, top: dot.y,
                  backgroundColor: dragStart?.id === dot.id ? players[turn].color : '#a8a29e', // Stone-400 inactive, player color active
                }}
              />
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className="pt-4 text-stone-400 text-sm font-bold tracking-widest uppercase text-center">
          Drag between dots to connect • Close shapes to score
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
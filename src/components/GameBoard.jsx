import { useState, useEffect, useRef } from 'react';
import { Trophy, RefreshCcw, ChevronRight } from 'lucide-react';
import GameLogic from "../utils/gameLogic";
import Dice from './Dice.jsx';
import AILogic from '../utils/aiLogic';
import AIIntegration from '../utils/aiIntegration';

/**
 * ------------------------------------------------------------------
 * COMPONENT: GAME OVER MODAL
 * ------------------------------------------------------------------
 */
const GameOverModal = ({ scores, players, onRestart }) => {
    const maxScore = Math.max(...scores);
    const winners = players.filter((_, i) => scores[i] === maxScore);
    const isTie = winners.length > 1;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
            <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md text-center font-handwriting border-4 border-stone-800">
                <Trophy size={60} className={`mx-auto mb-4 ${isTie ? 'text-yellow-500' : 'text-stone-800'}`} />
                <h2 className="text-5xl font-extrabold text-stone-800 mb-2">{isTie ? "It's a Tie!" : "Game Over!"}</h2>
                <p className="text-xl text-stone-600 mb-6">
                    {isTie ? "The score is even. Great game, everyone!" : `${winners[0].name} wins with a score of ${maxScore}!`}
                </p>

                <div className="space-y-3 mb-8">
                    {players.map((p, i) => (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${scores[i] === maxScore && maxScore > 0 ? 'bg-yellow-50 border-yellow-300 shadow-md scale-105' : 'bg-stone-50 border-stone-200'
                            }`}>
                            <div className="flex items-center gap-3">
                                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }} />
                                <span className="font-bold text-stone-700">{p.name}</span>
                            </div>
                            <span className="font-extrabold text-stone-800 text-2xl">{scores[i]}</span>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onRestart}
                    className="w-full py-3 bg-stone-800 text-white rounded-xl font-bold text-lg hover:bg-stone-700 transition-all flex items-center justify-center gap-2"
                >
                    <RefreshCcw size={20} /> Play Again
                </button>
            </div>
        </div>
    );
}

const GameBoard = ({ players, onRestart }) => {
    // Game State
    const [dots, setDots] = useState([]);
    const [lines, setLines] = useState([]);
    const [polygons, setPolygons] = useState([]);
    const [turn, setTurn] = useState(0);
    const [movesLeft, setMovesLeft] = useState(0);
    const [diceVal, setDiceVal] = useState(0);
    const [isRolling, setIsRolling] = useState(false);
    const [gameState, setGameState] = useState('rolling');
    const [aiThinking, setAIThinking] = useState(false);

    // Dragging State
    const [dragStart, setDragStart] = useState(null);
    const [dragCurrent, setDragCurrent] = useState(null);

    const containerRef = useRef(null);
    const aiTurnInProgress = useRef(false);
    
    // CRITICAL: Refs to track actual current state during AI moves
    const linesRef = useRef([]);
    const polygonsRef = useRef([]);
    const movesLeftRef = useRef(0);
    
    // Keep refs in sync with state
    useEffect(() => {
        linesRef.current = lines;
    }, [lines]);
    
    useEffect(() => {
        polygonsRef.current = polygons;
    }, [polygons]);

    useEffect(() => {
        movesLeftRef.current = movesLeft;
    }, [movesLeft]);

    // Initialize Board
    useEffect(() => {
        console.log('🎮 Game initialized');
        if (containerRef.current) {
            const { clientWidth, clientHeight } = containerRef.current;
            setDots(GameLogic.generateStaggeredDots(clientWidth, clientHeight));
        }
    }, []);

    // Game End Condition
    useEffect(() => {
        if (gameState === 'playing' && lines.length >= 2) {
            const canFormTriangle = GameLogic.canFormAnyTriangle(lines, dots, polygons);
            if (!canFormTriangle) {
                console.log('🏁 Game ended - no more triangles possible');
                setGameState('ended');
            }
        }
    }, [lines, dots, gameState, polygons]);

    // FIXED: Auto-roll dice for AI when it's their turn
    useEffect(() => {
        console.log(`🎲 Turn changed to: ${players[turn].name} (AI: ${players[turn].isAI}), Game State: ${gameState}`);
        
        if (gameState === 'rolling' && players[turn].isAI && !isRolling) {
            console.log('🤖 AI turn detected, auto-rolling dice...');
            setTimeout(() => {
                rollDice();
            }, 1000);
        }
    }, [turn, gameState]); // Trigger when turn or gameState changes

    const rollDice = () => {
        if (gameState !== 'rolling' || isRolling) {
            console.log('⛔ Cannot roll dice', { gameState, isRolling });
            return;
        }

        console.log(`🎲 Rolling dice for ${players[turn].name}...`);
        setIsRolling(true);
        
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
                
                console.log(`🎲 Dice rolled: ${finalVal} for ${players[turn].name}`);

                // FIXED: Trigger AI move if current player is AI
                if (players[turn].isAI) {
                    console.log('🤖 Starting AI turn with', finalVal, 'moves');
                    setTimeout(() => makeAIMove(finalVal), 1000);
                }
            }
        }, 100);
    };

    const nextTurn = () => {
        const nextPlayerIndex = (turn + 1) % players.length;
        console.log(`➡️ Next turn: ${players[nextPlayerIndex].name}`);
        
        setTurn(nextPlayerIndex);
        setGameState('rolling');
        setMovesLeft(0);
        setDiceVal(0);
        setDragStart(null);
        setDragCurrent(null);
        aiTurnInProgress.current = false; // ADDED: Reset AI lock
    };

    // FIXED: Get ALL moves from Gemini once, then execute them sequentially
    const makeAIMove = async (movesRemaining) => {
        if (aiTurnInProgress.current) {
            console.log('⚠️ AI turn already in progress');
            return;
        }

        aiTurnInProgress.current = true;
        console.log(`🤖 Starting AI turn with ${movesRemaining} moves`);

        // Get fresh game state using refs for most current data
        const gameStateForAI = {
            dots,
            lines: linesRef.current,
            polygons: polygonsRef.current,
            movesLeft: movesRemaining,
            currentPlayerIndex: turn,
            players
        };

        try {
            console.log('📡 Calling Gemini API for all moves...');
            setAIThinking(true);
            
            // Get ALL moves from Gemini in ONE API call
            const aiMoves = await AILogic.getGeminiMoves(gameStateForAI);
            console.log('📥 Received', aiMoves.length, 'moves from Gemini');

            setAIThinking(false);

            // Execute moves one by one with animation
            await executeMovesSequentially(aiMoves);

            console.log('✅ All AI moves completed');
            aiTurnInProgress.current = false;
            setTimeout(() => nextTurn(), 500);

        } catch (error) {
            console.error('❌ AI turn failed:', error);
            setAIThinking(false);
            aiTurnInProgress.current = false;
            setTimeout(() => nextTurn(), 500);
        }
    };

    // Helper function to execute moves sequentially with animation
    const executeMovesSequentially = async (moves) => {
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            console.log(`🎬 Executing move ${i + 1}/${moves.length}: ${move.from} -> ${move.to}`);

            // Find dot objects (these are stable references)
            const fromDot = dots.find(d => d.id === move.from);
            const toDot = dots.find(d => d.id === move.to);

            if (!fromDot || !toDot) {
                console.warn('⚠️ Invalid dots, skipping move:', move);
                continue;
            }

            // Animate the move
            await AIIntegration.animateAIMove(fromDot, toDot, setDragStart, setDragCurrent);

            // Execute the move with AI flag set to true
            attemptConnection(fromDot, toDot, true);

            // CRITICAL: Wait for React to process state updates before next move
            await new Promise(resolve => setTimeout(resolve, 600));
        }
    };

    const isTriangleAlreadyScored = (p1Id, p2Id, p3Id) => {
        const ids = [p1Id, p2Id, p3Id].sort().join(',');
        return polygonsRef.current.some(p => p.points.map(d => d.id).sort().join(',') === ids);
    };

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
        if (gameState !== 'playing' || movesLeft <= 0 || gameState === 'ended') return;
        if (players[turn].isAI) return;
        
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

        const pos = getRelativePos(e);
        const hitRadius = 30;
        const targetDot = dots.find(d => Math.hypot(d.x - pos.x, d.y - pos.y) < hitRadius);

        if (targetDot && targetDot.id !== dragStart.id) {
            attemptConnection(dragStart, targetDot, false);
        }

        setDragStart(null);
        setDragCurrent(null);
    };

    // FIXED: Properly handle AI vs Human moves
    const attemptConnection = (p1, p2, isAIMove = false) => {
        console.log(`🔍 Attempting connection: ${p1.id} -> ${p2.id} (AI: ${isAIMove})`);
        
        // CRITICAL: Use refs for AI moves to get most current state
        const currentLines = isAIMove ? linesRef.current : lines;
        const currentPolygons = isAIMove ? polygonsRef.current : polygons;
        
        // 1. Check duplication
        const exists = currentLines.some(l =>
            (l.from === p1.id && l.to === p2.id) || (l.from === p2.id && l.to === p1.id)
        );
        if (exists) {
            console.log('⛔ Line already exists');
            return;
        }

        // 2. Check intermediate dots
        if (GameLogic.hasIntermediateDot(p1, p2, dots)) {
            console.log('⛔ Intermediate dot found');
            return;
        }

        // 3. Check intersection
        const intersect = currentLines.some(l => {
            if (l.from === p1.id || l.to === p1.id || l.from === p2.id || l.to === p2.id) return false;
            const l1 = dots.find(d => d.id === l.from);
            const l2 = dots.find(d => d.id === l.to);
            return GameLogic.doLinesIntersect(p1, p2, l1, l2);
        });
        if (intersect) {
            console.log('⛔ Line intersection detected');
            return;
        }

        // 4. Check 4+ polygon
        const newLine = { from: p1.id, to: p2.id, ownerId: turn };
        const testLines = [...currentLines, newLine];

        if (GameLogic.wouldCreateLargerPolygon(p1.id, p2.id, testLines)) {
            console.log('⛔ Would create 4+ sided polygon');
            return;
        }

        // 5. Valid move
        console.log('✅ Valid move, adding line');
        const newLines = testLines;
        const newTriangle = GameLogic.findNewTriangles(p1.id, p2.id, newLines, dots, turn);

        if (newTriangle) {
            const pIds = newTriangle.points.map(p => p.id);
            if (!isTriangleAlreadyScored(pIds[0], pIds[1], pIds[2])) {
                console.log('🎉 Triangle completed!');
                const updatedPolygons = [...currentPolygons, newTriangle];
                setPolygons(updatedPolygons);
                // Update ref immediately for AI moves
                if (isAIMove) {
                    polygonsRef.current = updatedPolygons;
                }
            }
        }

        setLines(newLines);
        // Update ref immediately for AI moves
        if (isAIMove) {
            linesRef.current = newLines;
        }

        // ONLY decrement moves for human players
        if (!isAIMove) {
            const newMoves = movesLeft - 1;
            setMovesLeft(newMoves);

            if (newMoves === 0) {
                setTimeout(() => nextTurn(), 500);
            }
        }
    };

    const scores = players.map((_, idx) => polygons.filter(p => p.ownerId === idx).length);

    return (
        <div className="h-screen w-screen bg-[#fcfbf9] flex flex-col font-handwriting overflow-hidden text-stone-800">

            {gameState === 'ended' && <GameOverModal scores={scores} players={players} onRestart={onRestart} />}

            {aiThinking && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                                bg-white px-6 py-3 rounded-xl shadow-xl border-2 border-stone-800 
                                flex items-center gap-3 z-50">
                    <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full" />
                    <span className="font-bold text-stone-800">Gemini is thinking...</span>
                </div>
            )}

            {/* HEADER */}
            <div className="w-full px-6 py-4 flex justify-between items-center z-10">
                <div className="flex gap-4">
                    {players.map((p, i) => (
                        <div
                            key={i}
                            className={`relative px-5 py-2 rounded-2xl border-2 transition-all duration-300 flex items-center gap-3
                                ${turn === i && gameState !== 'ended' ? 'bg-white border-stone-800 shadow-md -translate-y-1' : 'bg-transparent border-transparent opacity-50'}
                            `}
                        >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                            <div className="flex flex-col leading-none">
                                <span className="font-bold text-lg">{p.name}</span>
                                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Triangles: {scores[i]}</span>
                            </div>
                            {turn === i && gameState !== 'ended' && (
                                <div className="absolute -top-2 -right-2 bg-stone-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs animate-bounce">
                                    <ChevronRight size={14} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    {gameState === 'playing' && (
                        <div className="bg-stone-100 px-4 py-2 rounded-xl font-bold text-stone-600">
                            Moves Left: {movesLeft}
                        </div>
                    )}
                    <Dice value={diceVal} rolling={isRolling} disabled={gameState !== 'rolling' || gameState === 'ended' || players[turn].isAI} onRoll={rollDice} />
                </div>
            </div>

            {/* GAME AREA */}
            <div className="flex-1 w-full px-6 pb-6 flex flex-col">
                <div className="relative w-full h-full bg-white rounded-sm shadow-2xl overflow-hidden border border-stone-200"
                    style={{
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                        backgroundImage: `radial-gradient(#e7e5e4 1.5px, transparent 1.5px)`,
                        backgroundSize: '24px 24px'
                    }}>

                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                        {polygons.map((poly, i) => {
                            const pts = poly.points.map(p => `${p.x},${p.y}`).join(' ');
                            return (
                                <g key={i} className="animate-fadeIn">
                                    <polygon points={pts} fill={players[poly.ownerId].color} fillOpacity="0.25" stroke="none" />
                                    {(() => {
                                        const cx = poly.points.reduce((s, p) => s + p.x, 0) / poly.points.length;
                                        const cy = poly.points.reduce((s, p) => s + p.y, 0) / poly.points.length;
                                        return (
                                            <text x={cx} y={cy} textAnchor="middle" dy=".3em" fill={players[poly.ownerId].color}
                                                fontSize="24" fontWeight="900"
                                                style={{ opacity: 0.7, textShadow: '1px 1px 2px white' }}>
                                                ▲
                                            </text>
                                        );
                                    })()}
                                </g>
                            );
                        })}

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

                        {dragStart && dragCurrent && gameState !== 'ended' && (
                            <line
                                x1={dragStart.x} y1={dragStart.y} x2={dragCurrent.x} y2={dragCurrent.y}
                                stroke={players[turn].color} strokeWidth="4" strokeLinecap="round" strokeDasharray="8,8"
                                className="opacity-60"
                            />
                        )}
                    </svg>

                    <div
                        ref={containerRef}
                        className="absolute inset-0 z-20 touch-none"
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
                                    ${gameState === 'ended' ? 'cursor-default' : ''}
                                `}
                                style={{
                                    left: dot.x, top: dot.y,
                                    backgroundColor: dragStart?.id === dot.id ? players[turn].color : '#a8a29e',
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div className="pt-4 text-stone-400 text-sm font-bold tracking-widest uppercase text-center">
                    Drag between dots to connect • Close <span className="text-stone-600">Triangles</span> to score
                </div>
            </div>
        </div>
    );
};

export default GameBoard;
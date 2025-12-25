import { useState } from 'react';
import { Play, Sparkles } from 'lucide-react';

const SetupScreen = ({ onStart, onStartMP }) => {
  const [playerCount, setPlayerCount] = useState(2);
  const [geminiEnabled, setGeminiEnabled] = useState(false);
  const [players, setPlayers] = useState([
    { name: 'Player 1', color: '#ef4444', isAI: false },
    { name: 'Player 2', color: '#3b82f6', isAI: false },
  ]);

  // Predefined readable colors
  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  const updatePlayer = (idx, key, val) => {
    const newP = [...players];
    newP[idx][key] = val;
    setPlayers(newP);
  };

  const handleGeminiToggle = () => {
    const newGeminiState = !geminiEnabled;
    setGeminiEnabled(newGeminiState);

    const newPlayers = [...players];
    
    if (newGeminiState) {
      // Enable Gemini - replace Player 2 (index 1) with Gemini
      newPlayers[1] = {
        name: 'Hunter AI',
        color: newPlayers[1].color,
        isAI: true
      };
    } else {
      // Disable Gemini - restore Player 2 to human
      newPlayers[1] = {
        name: 'Player 2',
        color: newPlayers[1].color,
        isAI: false
      };
    }
    
    setPlayers(newPlayers);
  };

  const handlePlayerCountChange = (num) => {
    setPlayerCount(num);
    setPlayers(prev => {
      const next = [...prev];
      
      // Add NEW human players if needed
      while(next.length < num) {
        next.push({ 
          name: `Player ${next.length + 1}`, 
          color: colors[next.length % colors.length],
          isAI: false  // Always add as human
        });
      }
      
      // Remove players if needed
      while(next.length > num) {
        next.pop();
      }
      
      // IMPORTANT: If Gemini was enabled, keep it at Player 2 position (index 1)
      // Don't duplicate Gemini to new players
      if (geminiEnabled && next.length >= 2) {
        next[1] = {
          name: 'Gemini',
          color: next[1].color,
          isAI: true
        };
      }
      
      return next;
    });
  };

  const handleStart = () => onStart(players);

  // NEW: multiplayer handler
  const handleMultiplayerStart = () => {
    const mpPlayers = [
      { name: players[0]?.name || "You", color: '#ec0808ff', isAI: false },
      { name: players[0]?.name || "anonymous", color: '#3b82f6', isAI: false }
    ];
    
    const name=players[0]?.name || "You";

    onStartMP(name);
  };

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border-2 border-stone-100 font-handwriting">
      <h1 className="text-4xl font-bold text-stone-800 text-center mb-6">Dot Hunter</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-bold text-stone-500 mb-2 uppercase tracking-wider">Players</label>
        <div className="flex gap-2 justify-center">
          {[2, 3, 4].map(num => (
            <button
              key={num}
              onClick={() => handlePlayerCountChange(num)}
              className={`w-12 h-12 rounded-full font-bold text-lg transition-all ${
                playerCount === num 
                ? 'bg-stone-800 text-white scale-110 shadow-lg' 
                : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {players.map((p, i) => (
          <div key={i} className="flex items-center gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
            <div className="relative group">
              <button 
                className="w-8 h-8 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110"
                style={{ backgroundColor: p.color }}
              />
              <div className="absolute left-0 bottom-full mb-2 bg-white p-2 rounded-lg shadow-xl border border-stone-100 gap-1 hidden group-hover:flex z-50">
                {colors.map(c => (
                  <button
                    key={c}
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: c }}
                    onClick={() => updatePlayer(i, 'color', c)}
                  />
                ))}
              </div>
            </div>
            <input 
              className={`bg-transparent font-bold text-stone-700 focus:outline-none w-full ${
                p.isAI ? 'cursor-not-allowed opacity-70' : ''
              }`}
              value={p.name}
              onChange={e => updatePlayer(i, 'name', e.target.value)}
              disabled={p.isAI}
              placeholder={p.isAI ? 'AI Player' : `Player ${i + 1}`}
            />
            {p.isAI && (
              <Sparkles size={18} className="text-purple-500 animate-pulse" />
            )}
          </div>
        ))}
      </div>

      {/* Gemini Toggle - Now looks like a toggle switch */}
      <div className="mb-6">
        <div 
          onClick={handleGeminiToggle}
          className={`w-full py-3 px-4 rounded-xl font-bold text-base transition-all flex items-center justify-between cursor-pointer ${
            geminiEnabled
              ? 'bg-linear-to-r from-purple-500 to-blue-500 text-white shadow-lg'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border-2 border-stone-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={20} className={geminiEnabled ? 'animate-pulse' : ''} />
            <span>Add AI Player</span>
          </div>
          
          {/* Toggle Switch */}
          <div className={`relative w-12 h-6 rounded-full transition-all ${
            geminiEnabled ? 'bg-white/30' : 'bg-stone-300'
          }`}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all duration-300 ${
              geminiEnabled 
                ? 'translate-x-6 bg-white' 
                : 'translate-x-0 bg-white'
            }`} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* OFFLINE GAME */}
        <button 
          onClick={handleStart}
          className="w-full py-4 bg-stone-800 text-white rounded-xl font-bold text-xl
                    hover:bg-stone-700 hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Play size={24} fill="currentColor" /> Play Offline
        </button>

        {/* MULTIPLAYER GAME */}
        <button 
          onClick={handleMultiplayerStart}
          className="w-full py-3 border-2 text-white border-stone-800 text-stone-800 rounded-xl font-bold text-lg
                    hover:bg-stone-800 hover:text-white transition-all flex items-center justify-center gap-2"
        >
          🌐 Play Multiplayer
        </button>
      </div>

    </div>
  );
};

export default SetupScreen;
import { useState } from 'react';
import { Play } from 'lucide-react';

const SetupScreen = ({ onStart }) => {
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState([
    { name: 'Player 1', color: '#ef4444' }, // Red-500
    { name: 'Player 2', color: '#3b82f6' }, // Blue-500
  ]);

  // Predefined readable colors
  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  const updatePlayer = (idx, key, val) => {
    const newP = [...players];
    newP[idx][key] = val;
    setPlayers(newP);
  };

  const handleStart = () => onStart(players);

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border-2 border-stone-100 font-handwriting">
      <h1 className="text-4xl font-bold text-stone-800 text-center mb-6">Dot Hunter</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-bold text-stone-500 mb-2 uppercase tracking-wider">Players</label>
        <div className="flex gap-2 justify-center">
          {[2, 3, 4].map(num => (
            <button
              key={num}
              onClick={() => {
                setPlayerCount(num);
                setPlayers(prev => {
                  const next = [...prev];
                  while(next.length < num) next.push({ name: `Player ${next.length+1}`, color: colors[next.length] });
                  while(next.length > num) next.pop();
                  return next;
                });
              }}
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

      <div className="space-y-4 mb-8">
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
              className="bg-transparent font-bold text-stone-700 focus:outline-none w-full"
              value={p.name}
              onChange={e => updatePlayer(i, 'name', e.target.value)}
            />
          </div>
        ))}
      </div>

      <button 
        onClick={handleStart}
        className="w-full py-4 bg-stone-800 text-white rounded-xl font-bold text-xl hover:bg-stone-700 hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <Play size={24} fill="currentColor" /> Play Game
      </button>
    </div>
  );
};

export default SetupScreen;
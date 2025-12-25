import { useState, useEffect } from 'react';
import SetupScreen from './components/SetupScreen.jsx';
import GameBoard from './components/GameBoard.jsx';
import GameBoardMP from './components/GameBoardMP.jsx';
import { Analytics } from "@vercel/analytics/react"

export default function App() {
  const [started, setStarted] = useState(false);
  const [players, setPlayers] = useState([]);
  const [multiplayerName, setMultiplayerName] = useState("You");
  const [mode, setMode] = useState("offline");

  // Font Injection
  useEffect(() => {
    const link = document.createElement('link');
    link.href = "https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  return (
    <>
      <style>{`
        .font-handwriting { font-family: 'Patrick Hand', cursive, sans-serif; }
        @keyframes draw { from { stroke-dashoffset: 1000; stroke-dasharray: 1000; } to { stroke-dashoffset: 0; stroke-dasharray: 1000; } }
        .animate-draw { animation: draw 0.6s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .animate-spin { animation: spin 0.3s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>

      {!started ? (
        <div className="min-h-screen w-screen bg-[#fcfbf9] flex items-center justify-center p-4">
          <SetupScreen onStart={(p) => { setPlayers(p); setStarted(true); }} onStartMP={(p)=>{setMultiplayerName(p); setMode("online"); setStarted(true)}}/>
        </div>
      ) : (
        mode==="offline"? (
          <GameBoard players={players} onRestart={() => setStarted(false)} />
        ):
        (<GameBoardMP name={multiplayerName} onRestart={() => setStarted(false)} />)
      )}
    <Analytics/> {/* for vercel analytics */}
    </>
  );
}
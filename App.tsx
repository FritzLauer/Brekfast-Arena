

import React, { useState, useRef, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState } from './types';
import { GameEngine } from './services/GameEngine';
import { inputService } from './services/InputService';
import { soundService } from './services/SoundService';
import { SHOP_COSTS } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: 3,
    wave: 1,
    isGameOver: false,
    isPlaying: false,
    isShopOpen: false,
    entities: []
  });

  const [showIndex, setShowIndex] = useState(false);
  const gameEngineRef = useRef<GameEngine | null>(null);

  // Poll for input start game when not playing
  useEffect(() => {
    let frameId: number;
    const checkStart = () => {
      if (!gameState.isPlaying && !gameState.isShopOpen && !showIndex) {
        const input = inputService.getInput();
        if (input.start) {
          handleStart();
        }
      }
      frameId = requestAnimationFrame(checkStart);
    };
    frameId = requestAnimationFrame(checkStart);
    return () => cancelAnimationFrame(frameId);
  }, [gameState.isPlaying, gameState.isShopOpen, showIndex]);

  useEffect(() => {
    const unlockAudio = () => {
      soundService.resume();
    };
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    return () => {
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const handleStateChange = (newState: Partial<GameState>) => {
    setGameState(prev => ({ ...prev, ...newState }));
  };

  const handleStart = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.startGame();
    }
  };

  const handleBuy = (type: 'SPEED' | 'RAPID' | 'SPREAD' | 'SHIELD' | 'LIFE') => {
      if (gameEngineRef.current) {
          gameEngineRef.current.buyUpgrade(type);
      }
  };

  const handleCloseShop = () => {
      if (gameEngineRef.current) {
          gameEngineRef.current.closeShop();
      }
  };

  return (
    <div className="w-full h-screen bg-black flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* HUD */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-4 text-white uppercase tracking-widest font-bold z-10">
        <div className="flex flex-col">
          <span className="text-sm text-cyan-400">Score</span>
          <span className="text-2xl drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
            {gameState.score.toLocaleString()}
          </span>
        </div>
        
        <div className="text-4xl text-purple-500 animate-pulse font-black drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]">
          BREAKFAST ARENA
        </div>

        <div className="flex flex-col items-end">
          <div className="flex gap-4">
            <div className="flex flex-col items-end">
               <span className="text-sm text-red-500">Lives</span>
               <div className="flex gap-1 text-red-500 text-xl">
                 {Array.from({ length: Math.max(0, gameState.lives) }).map((_, i) => (
                   <span key={i} className="drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">♥</span>
                 ))}
               </div>
            </div>
            <div className="flex flex-col items-end">
               <span className="text-sm text-green-400">Order</span>
               <span className="text-2xl text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]">{gameState.wave}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="relative w-full max-w-4xl aspect-[4/3]">
        <GameCanvas 
          isPlaying={gameState.isPlaying} 
          onStateChange={handleStateChange}
          gameEngineRef={gameEngineRef}
        />

        {/* Start Screen Overlay */}
        {!gameState.isPlaying && !gameState.isGameOver && !gameState.isShopOpen && !showIndex && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center z-20 backdrop-blur-sm">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 mb-8 drop-shadow-lg">
              BREAKFAST ARENA 2084
            </h1>
            <div className="space-y-6 text-white mb-8">
              <div className="flex gap-12 text-left bg-zinc-900/50 p-6 rounded-xl border border-zinc-700">
                <div>
                  <h3 className="text-cyan-400 mb-2 border-b border-cyan-400/30 pb-1">KEYBOARD</h3>
                  <p className="mb-2"><span className="text-yellow-400">WASD</span> to Move</p>
                  <p className="mb-2"><span className="text-yellow-400">ARROWS</span> to Shoot</p>
                  <p className="mb-2"><span className="text-yellow-400">SPACE</span> to Dash</p>
                  <p><span className="text-yellow-400">F</span> for Skill (EMP)</p>
                </div>
                <div>
                  <h3 className="text-purple-400 mb-2 border-b border-purple-400/30 pb-1">GAMEPAD</h3>
                  <p className="mb-2"><span className="text-yellow-400">L-STICK</span> to Move</p>
                  <p className="mb-2"><span className="text-yellow-400">R-STICK</span> to Shoot</p>
                  <p className="mb-2"><span className="text-yellow-400">RB / B</span> to Dash</p>
                  <p><span className="text-yellow-400">X / LB</span> for Skill</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
                <button 
                    onClick={handleStart}
                    className="animate-bounce px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold text-xl rounded shadow-[0_0_15px_rgba(22,163,74,0.6)] transition-all"
                >
                    START BREAKFAST
                </button>
                <button 
                    onClick={() => setShowIndex(true)}
                    className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 font-bold text-xl rounded border border-cyan-500/30 transition-all"
                >
                    FOOD DATABASE
                </button>
            </div>
          </div>
        )}

        {/* Enemy Index Overlay */}
        {showIndex && (
          <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center p-8 overflow-y-auto">
              <div className="w-full max-w-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-3xl text-yellow-400 font-bold">MENU DATABASE</h2>
                      <button onClick={() => setShowIndex(false)} className="text-red-500 font-bold border border-red-500 px-4 py-2 hover:bg-red-900/30">CLOSE [X]</button>
                  </div>
                  
                  <div className="grid gap-6 pb-8">
                      <EnemyEntry name="1. Burnt Toast" color="text-yellow-700" desc="Sleek brown pursuit units. Fast and crunchy." />
                      <EnemyEntry name="2. Angry Egg" color="text-yellow-200" desc="Wobbling egg whites. Fires hot grease sparks." />
                      <EnemyEntry name="3. The Toaster" color="text-gray-400" desc="Heavy silver box. Pops out fresh Burnt Toast units." />
                      <EnemyEntry name="4. Battle Waffle" color="text-yellow-500" desc="Golden grid hover tank. Fires bouncing Blueberries." />
                      <EnemyEntry name="5. Doom Donut" color="text-pink-400" desc="Glazed menace. Launches homing Jelly Missiles." />
                      <EnemyEntry name="6. Jelly Missile" color="text-purple-500" desc="Sticky homing blob. Single hit kill." />
                      <EnemyEntry name="7. Hot Grease" color="text-yellow-300" desc="Sizzling projectile with jittery path." />
                      <EnemyEntry name="8. Blueberry" color="text-blue-400" desc="Bounces off walls. Stains everything." />
                      <EnemyEntry name="9. Coffee Mug" color="text-orange-900" desc="Stationary caffeine hazard." />
                  </div>
              </div>
          </div>
        )}

        {/* Shop Overlay */}
        {gameState.isShopOpen && (
           <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-40">
              <h2 className="text-4xl text-yellow-400 font-black mb-2 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">KITCHEN UPGRADES</h2>
              <p className="text-cyan-400 mb-8">TIPS AVAILABLE: <span className="text-white text-xl ml-2">{gameState.score.toLocaleString()}</span></p>
              
              <div className="grid grid-cols-2 gap-4 w-3/4 max-w-2xl mb-8">
                  <ShopItem name="CAFFEINE RUSH" desc="+Speed (All Lives)" cost={SHOP_COSTS.SPEED} currentScore={gameState.score} onBuy={() => handleBuy('SPEED')} />
                  <ShopItem name="RAPID TOASTING" desc="+Fire Rate (All Lives)" cost={SHOP_COSTS.RAPID} currentScore={gameState.score} onBuy={() => handleBuy('RAPID')} />
                  <ShopItem name="MULTI-FORK" desc="+1 Bullet (All Lives)" cost={SHOP_COSTS.SPREAD} currentScore={gameState.score} onBuy={() => handleBuy('SPREAD')} />
                  <ShopItem name="NAPKIN SHIELD" desc="Start w/ Shield (All Lives)" cost={SHOP_COSTS.SHIELD} currentScore={gameState.score} onBuy={() => handleBuy('SHIELD')} />
                  <div className="col-span-2 flex justify-center mt-2">
                     <ShopItem name="EXTRA LIFE" desc="+1 Life Now" cost={SHOP_COSTS.LIFE} currentScore={gameState.score} onBuy={() => handleBuy('LIFE')} />
                  </div>
              </div>

              <button 
                onClick={handleCloseShop}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold text-xl rounded shadow-[0_0_15px_rgba(22,163,74,0.6)] transition-all transform hover:scale-105"
              >
                 NEXT ORDER &gt;&gt;
              </button>
           </div>
        )}

        {/* Game Over Overlay */}
        {gameState.isGameOver && (
          <div className="absolute inset-0 bg-red-900/40 flex flex-col items-center justify-center text-center z-30 backdrop-blur-sm">
            <h2 className="text-6xl text-red-500 font-black mb-4 drop-shadow-[0_0_25px_rgba(220,38,38,1)]">KITCHEN CLOSED</h2>
            <p className="text-2xl text-white mb-8">FINAL BILL: {gameState.score.toLocaleString()}</p>
             <div className="animate-pulse text-xl text-white font-bold cursor-pointer hover:text-yellow-400 transition-colors" onClick={handleStart}>
                PRESS <span className="border-b-2 border-white">ENTER</span> TO REOPEN
              </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-zinc-500 text-xs">
         Audio must be enabled in browser. 
         Gamepads supported (Xbox/PS).
      </div>
    </div>
  );
};

interface ShopItemProps {
    name: string;
    desc: string;
    cost: number;
    currentScore: number;
    onBuy: () => void;
}

const ShopItem: React.FC<ShopItemProps> = ({ name, desc, cost, currentScore, onBuy }) => {
    const canAfford = currentScore >= cost;
    return (
        <button 
           onClick={onBuy}
           disabled={!canAfford}
           className={`
             flex flex-col items-center p-4 border-2 rounded transition-all
             ${canAfford 
                ? 'border-cyan-500 bg-cyan-900/20 hover:bg-cyan-800/40 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                : 'border-zinc-700 bg-zinc-900/50 cursor-not-allowed opacity-50 grayscale'}
           `}
        >
            <span className="text-yellow-400 font-bold text-lg mb-1">{name}</span>
            <span className="text-zinc-300 text-xs mb-2">{desc}</span>
            <span className={`font-mono font-bold ${canAfford ? 'text-white' : 'text-red-400'}`}>
                {cost.toLocaleString()} PTS
            </span>
        </button>
    );
};

const EnemyEntry: React.FC<{name: string, color: string, desc: string}> = ({name, color, desc}) => (
    <div className="border-b border-zinc-800 pb-2">
        <h4 className={`font-bold text-lg ${color}`}>{name}</h4>
        <p className="text-zinc-400 text-sm">{desc}</p>
    </div>
);

export default App;

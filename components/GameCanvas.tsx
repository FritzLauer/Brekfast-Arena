import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../services/GameEngine';
import { GameState } from '../types';

interface GameCanvasProps {
  isPlaying: boolean;
  onStateChange: (state: Partial<GameState>) => void;
  gameEngineRef: React.MutableRefObject<GameEngine | null>;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ isPlaying, onStateChange, gameEngineRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (canvasRef.current && !gameEngineRef.current) {
      gameEngineRef.current = new GameEngine(canvasRef.current, onStateChange);
    }

    const animate = (time: number) => {
      // Initialize lastTime on first frame
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
      }

      // Calculate delta time in seconds
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (gameEngineRef.current) {
        if (isPlaying) {
          gameEngineRef.current.update(dt);
        } else {
            // Even if paused, we might want to prevent large dt build up when resuming
            lastTimeRef.current = time; 
        }
        gameEngineRef.current.draw();
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, onStateChange, gameEngineRef]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-zinc-900 border-4 border-zinc-700 rounded-lg overflow-hidden shadow-2xl scanlines">
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
        style={{ maxWidth: '100%', maxHeight: '100%', aspectRatio: '4/3' }}
      />
    </div>
  );
};

export default GameCanvas;
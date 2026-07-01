import React from 'react';
import { RefreshCw, Home, Skull, Calendar, ShieldAlert, Award } from 'lucide-react';
import { motion } from 'motion/react';

interface GameOverScreenProps {
  nightsSurvived: number;
  zombieKills: number;
  resourcesLooted: number;
  soldiersRescued: number;
  score: number;
  reason: 'player_died' | 'base_destroyed' | 'escaped';
  onRestart: () => void;
  onGoToMenu: () => void;
  isHardcore?: boolean;
}

export default function GameOverScreen({
  nightsSurvived,
  zombieKills,
  resourcesLooted,
  soldiersRescued,
  score,
  reason,
  onRestart,
  onGoToMenu,
  isHardcore,
}: GameOverScreenProps) {
  // Check if this was a personal best
  const currentBestNight = parseInt(localStorage.getItem('last_stand_high_night') || '0', 10);
  const currentBestKills = parseInt(localStorage.getItem('last_stand_high_kills') || '0', 10);

  const isNewNightRecord = nightsSurvived > currentBestNight;
  const isNewKillRecord = zombieKills > currentBestKills;

  // Save new high scores
  if (nightsSurvived > currentBestNight) {
    localStorage.setItem('last_stand_high_night', nightsSurvived.toString());
  }
  if (zombieKills > currentBestKills) {
    localStorage.setItem('last_stand_high_kills', zombieKills.toString());
  }
  if (reason === 'escaped') {
    localStorage.setItem('last_stand_escaped', 'true');
  }

  const isWin = reason === 'escaped';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-6 select-none relative overflow-hidden">
      {/* Red/Green alert light background */}
      <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,${
        isWin ? 'rgba(16,185,129,0.15)' : 'rgba(220,38,38,0.15)'
      }_0%,transparent_60%)] pointer-events-none animate-pulse`} />
      
      <div className={`max-w-md w-full bg-slate-900/85 backdrop-blur-md border ${
        isWin ? 'border-emerald-500/40' : 'border-red-900/40'
      } p-8 rounded-lg shadow-2xl relative z-10 text-center`}>
        {/* Indicator icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className={`w-16 h-16 ${
            isWin ? 'bg-emerald-950 border-emerald-500' : 'bg-red-950 border-red-500'
          } border rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_15px_rgba(16,185,129,0.3)]`}
        >
          {isWin ? (
            <Award className="w-8 h-8 text-emerald-400 animate-bounce" />
          ) : (
            <Skull className="w-8 h-8 text-red-500 animate-pulse" />
          )}
        </motion.div>

        {/* Cause of death/win title */}
        <h2 className="text-3xl font-sans font-black tracking-tighter text-slate-100 uppercase">
          {reason === 'player_died' 
            ? 'SOLDIER DEFEATED' 
            : reason === 'base_destroyed' 
            ? 'BASE RUN OVER' 
            : 'EVACUATION COMPLETE'}
        </h2>
        
        <p className={`${isWin ? 'text-emerald-400' : 'text-red-500'} font-mono text-xs uppercase tracking-widest mt-1 mb-4`}>
          {reason === 'player_died' 
            ? 'You were overwhelmed by the infected horde.' 
            : reason === 'base_destroyed'
            ? 'Your Command Center core was compromised.'
            : 'You boarded the helicopter & survived Wave 10!'}
        </p>

        {isHardcore && !isWin && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-2.5 mb-6 text-[10px] text-red-400 font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 animate-pulse">
            <span>💀 HARDCORE ACTIVE: CHECKPOINT WIPED</span>
          </div>
        )}

        {/* Stats List */}
        <div className="space-y-3.5 mb-8 text-left border-y border-slate-800 py-5">
          <div className="flex justify-between items-center text-sm font-sans text-slate-400">
            <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-500" /> Nights Survived:</span>
            <span className="font-mono text-base font-bold text-slate-100 flex items-center gap-1.5">
              {nightsSurvived}
              {isNewNightRecord && (
                <span className="text-[10px] uppercase bg-green-950 text-green-400 border border-green-500/30 px-1.5 rounded animate-bounce">
                  RECORD!
                </span>
              )}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm font-sans text-slate-400">
            <span className="flex items-center gap-2"><Skull className="w-4 h-4 text-slate-500" /> Infected Eliminated:</span>
            <span className="font-mono text-base font-bold text-red-400 flex items-center gap-1.5">
              {zombieKills}
              {isNewKillRecord && (
                <span className="text-[10px] uppercase bg-green-950 text-green-400 border border-green-500/30 px-1.5 rounded animate-bounce">
                  RECORD!
                </span>
              )}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm font-sans text-slate-400">
            <span className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-slate-500" /> Materials Scavenged:</span>
            <span className="font-mono text-base font-bold text-amber-500">{resourcesLooted} items</span>
          </div>

          <div className="flex justify-between items-center text-sm font-sans text-slate-400">
            <span className="flex items-center gap-2"><Award className="w-4 h-4 text-slate-500" /> Soldiers Rescued:</span>
            <span className="font-mono text-base font-bold text-indigo-400">{soldiersRescued} allies</span>
          </div>

          <div className="flex justify-between items-center text-sm font-sans text-slate-400 pt-2 border-t border-slate-800/50">
            <span className="font-bold text-slate-300">Survival Score:</span>
            <span className="font-mono text-lg font-bold text-green-400">{score} pts</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onRestart}
            className={`w-full py-3.5 ${
              isWin ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.2)]' : 'bg-red-600 hover:bg-red-500 shadow-[0_4px_12px_rgba(220,38,38,0.2)]'
            } text-white font-sans font-bold text-sm rounded tracking-wider transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer`}
            id="btn-restart"
          >
            <RefreshCw className="w-4 h-4" />
            STAND AGAIN
          </button>
          
          <button
            onClick={onGoToMenu}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans font-medium text-sm rounded border border-slate-700/60 transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer"
            id="btn-go-menu"
          >
            <Home className="w-4 h-4" />
            RETURN TO HQ
          </button>
        </div>
      </div>
    </div>
  );
}

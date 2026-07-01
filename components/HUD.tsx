import React from 'react';
import { Shield, Coins, Flame, Skull, Heart, Star, Clock, Compass, ShieldAlert, Swords } from 'lucide-react';
import { PlayerStats, Weapon, BaseCore } from '../types';

interface HUDProps {
  playerStats: PlayerStats;
  baseCore: BaseCore;
  activeWeapon: Weapon;
  timeOfDay: 'day' | 'night';
  secondsRemaining: number;
  wave: number;
  zombieCount: number;
  totalZombiesInWave: number;
  kills: number;
  activeAlliesCount: number;
  onOpenUpgradeMenu: () => void;
  isUpgradeMenuOpen: boolean;
  
  // Custom settings & survival props
  isSurvivalMode: boolean;
  onUseFood: () => void;
  onUseWater: () => void;
  onToggleSettings: () => void;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
}

export default function HUD({
  playerStats,
  baseCore,
  activeWeapon,
  timeOfDay,
  secondsRemaining,
  wave,
  zombieCount,
  totalZombiesInWave,
  kills,
  activeAlliesCount,
  onOpenUpgradeMenu,
  isUpgradeMenuOpen,
  isSurvivalMode,
  onUseFood,
  onUseWater,
  onToggleSettings,
  season,
}: HUDProps) {
  // HP %
  const playerHpPct = Math.max(0, (playerStats.hp / playerStats.maxHp) * 100);
  const baseHpPct = Math.max(0, (baseCore.hp / baseCore.maxHp) * 100);
  const staminaPct = Math.max(0, (playerStats.stamina / playerStats.maxStamina) * 100);
  const xpPct = Math.max(0, (playerStats.xp / playerStats.xpNeeded) * 100);

  // Time progress bar width
  const cycleMaxSeconds = timeOfDay === 'day' ? 60 : 120; // 60s day, 120s night wave
  const timePct = Math.max(0, (secondsRemaining / cycleMaxSeconds) * 100);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col justify-between p-4 font-sans text-slate-100">
      
      {/* TOP HEADER SECTION */}
      <div className="flex justify-between items-start gap-4">
        
        {/* Left: Player Vital Indicators */}
        <div className="flex flex-col gap-2 bg-slate-950/70 border border-slate-800/80 p-3 rounded-lg backdrop-blur-sm pointer-events-auto w-64">
          <div className="flex items-center justify-between border-b border-slate-800/50 pb-1.5 mb-1.5">
            <span className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
              🧬 SURVIVOR (LV.{playerStats.level})
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              {playerStats.hp}/{playerStats.maxHp} HP
            </span>
          </div>

          {/* Player HP Bar */}
          <div className="relative w-full h-3.5 bg-slate-900 border border-slate-850 rounded overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-150"
              style={{ width: `${playerHpPct}%` }}
            />
            {playerStats.armor > 0 && (
              <div 
                className="absolute top-0 right-0 h-full bg-indigo-500 opacity-60 flex items-center justify-end px-1" 
                style={{ width: `${playerStats.armor}%` }}
              />
            )}
          </div>

          {/* Stamina & Armor indicators */}
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-0.5">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-400 fill-current" />
              STAMINA
            </span>
            <span>{Math.round(playerStats.stamina)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-75"
              style={{ width: `${staminaPct}%` }}
            />
          </div>

          {/* XP Bar */}
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-1">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500 fill-current" />
              XP PROGRESS
            </span>
            <span>{playerStats.xp} / {playerStats.xpNeeded}</span>
          </div>
          <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden flex-shrink-0">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${xpPct}%` }}
            />
          </div>

          {/* Survival meters if enabled */}
          {isSurvivalMode && (
            <div className="border-t border-slate-800/50 pt-1.5 mt-1.5 space-y-2">
              {/* Hunger */}
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                <button 
                  onClick={onUseFood}
                  disabled={playerStats.foodCount <= 0}
                  className="flex items-center gap-1 hover:text-amber-400 disabled:opacity-40 disabled:hover:text-slate-400 pointer-events-auto cursor-pointer"
                  title="Click to eat canned food (+35 Hunger, +10 HP)"
                >
                  🥫 CANNED BEANS ({playerStats.foodCount})
                </button>
                <span className={playerStats.hunger < 25 ? 'text-red-400 font-bold animate-pulse' : 'text-amber-400'}>
                  {Math.round(playerStats.hunger)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${playerStats.hunger < 25 ? 'bg-red-500' : 'bg-amber-500'}`}
                  style={{ width: `${playerStats.hunger}%` }}
                />
              </div>

              {/* Thirst */}
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                <button 
                  onClick={onUseWater}
                  disabled={playerStats.waterCount <= 0}
                  className="flex items-center gap-1 hover:text-sky-400 disabled:opacity-40 disabled:hover:text-slate-400 pointer-events-auto cursor-pointer"
                  title="Click to drink pure water (+45 Thirst, +20 Stamina)"
                >
                  🥤 PURE WATER ({playerStats.waterCount})
                </button>
                <span className={playerStats.thirst < 25 ? 'text-red-400 font-bold animate-pulse' : 'text-sky-400'}>
                  {Math.round(playerStats.thirst)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${playerStats.thirst < 25 ? 'bg-red-500' : 'bg-sky-500'}`}
                  style={{ width: `${playerStats.thirst}%` }}
                />
              </div>
              
              <div className="text-[8px] text-slate-500 font-mono leading-none text-center">
                Click HUD or [U] to Eat, [I] to Drink
              </div>
            </div>
          )}
        </div>

        {/* Center: Cycle & Wave Master Control */}
        <div className="flex flex-col items-center justify-center bg-slate-950/85 border border-slate-800 p-3.5 rounded-lg backdrop-blur-md pointer-events-auto max-w-xs text-center">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded border mb-1.5 font-mono text-xs uppercase tracking-widest font-extrabold shadow-[0_0_10px_rgba(239,68,68,0.1)] bg-slate-900/90"
               style={{ 
                 borderColor: timeOfDay === 'day' ? '#e2e8f0' : '#ef4444',
                 color: timeOfDay === 'day' ? '#f8fafc' : '#ef4444'
               }}>
            <Clock className="w-4 h-4 animate-spin-slow" />
            <span>{timeOfDay === 'day' ? '☀️ SECURE DAYLIGHT' : '🌙 ENDURE THE NIGHT'}</span>
          </div>

          {/* Seasonal Condition indicator */}
          <div className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider mb-2 flex items-center justify-center gap-1 border ${
            season === 'spring' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
            season === 'summer' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
            season === 'autumn' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
            'bg-sky-500/10 text-sky-400 border-sky-500/30 animate-pulse'
          }`}>
            <span>
              {season === 'spring' ? '🌱 Springtime' :
               season === 'summer' ? '☀️ Summer Heat (1.5x Thirst)' :
               season === 'autumn' ? '🍂 Autumn Mist' :
               '❄️ Frozen Winter (Frostbite)'}
            </span>
          </div>

          <div className="text-sm font-sans font-black uppercase text-slate-200 tracking-wider">
            {timeOfDay === 'day' ? (
              <span>Wave {wave + 1} starting in <strong className="text-amber-400 font-mono text-base">{secondsRemaining}s</strong></span>
            ) : (
              <span>NIGHT WAVE <strong className="text-red-500 font-mono text-lg">{wave}</strong></span>
            )}
          </div>

          {/* Progress Bar for the current cycle */}
          <div className="w-48 h-1.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full transition-all duration-1000 ${timeOfDay === 'day' ? 'bg-amber-400 shadow-[0_0_5px_rgba(245,158,11,0.5)]' : 'bg-red-600 shadow-[0_0_5px_rgba(220,38,38,0.5)]'}`}
              style={{ width: `${timePct}%` }}
            />
          </div>

          {/* Wave info summary */}
          {timeOfDay === 'night' && (
            <span className="text-[10px] font-mono text-slate-400 mt-1.5 uppercase flex items-center gap-1.5">
              <Skull className="w-3 h-3 text-red-500" /> Infected Active: {zombieCount} / {totalZombiesInWave}
            </span>
          )}
        </div>

        {/* Right: Base Core Health Center & Settings Gear */}
        <div className="flex flex-col gap-2 items-end w-64">
          {/* Quick Settings gear */}
          <button
            onClick={onToggleSettings}
            className="pointer-events-auto w-8 h-8 bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-sm mb-1"
            title="Settings & Accessibility"
          >
            ⚙️
          </button>
          
          <div className="flex flex-col gap-2 bg-slate-950/70 border border-slate-800/80 p-3 rounded-lg backdrop-blur-sm pointer-events-auto w-full">
            <div className="flex items-center justify-between border-b border-slate-800/50 pb-1.5 mb-1.5">
              <span className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
                🛡️ BASE CORE HQ
              </span>
              <span className="text-[10px] font-mono text-red-400 font-bold">
                {baseCore.hp}/{baseCore.maxHp} HP
              </span>
            </div>

          {/* Base HP Bar */}
          <div className="relative w-full h-3.5 bg-slate-900 border border-slate-850 rounded overflow-hidden">
            <div
              className="h-full bg-red-600 transition-all duration-200"
              style={{ width: `${baseHpPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Compass className="w-2.5 h-2.5 text-slate-500 animate-pulse" />
              Center Map Location (1000, 1000)
            </span>
            {baseHpPct < 40 && (
              <span className="text-[9px] font-mono text-red-400 uppercase font-bold animate-pulse flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> DANGER!
              </span>
            )}
          </div>
        </div>
      </div>

    </div>

      {/* LOWER NAVIGATION & WEAPON SECTIONS */}
      <div className="flex justify-between items-end gap-6 mt-auto">
        
        {/* Bottom Left: Economy & Scavenged Stocks */}
        <div className="flex items-center gap-4 bg-slate-950/70 border border-slate-800/80 px-4 py-3 rounded-lg backdrop-blur-sm pointer-events-auto font-mono text-sm">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <div className="flex flex-col leading-none">
              <span className="text-[9px] text-slate-500 uppercase">Cash</span>
              <span className="font-bold text-amber-400">${playerStats.coins}</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800/50" />

          <div className="flex items-center gap-2">
            <span className="text-base leading-none">🪵</span>
            <div className="flex flex-col leading-none">
              <span className="text-[9px] text-slate-500 uppercase">Wood</span>
              <span className="font-bold text-slate-200">{playerStats.wood}</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800/50" />

          <div className="flex items-center gap-2">
            <span className="text-base leading-none">⚙️</span>
            <div className="flex flex-col leading-none">
              <span className="text-[9px] text-slate-500 uppercase">Scrap</span>
              <span className="font-bold text-slate-200">{playerStats.scrap}</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800/50" />

          <div className="flex items-center gap-2">
            <span className="text-base leading-none">👥</span>
            <div className="flex flex-col leading-none">
              <span className="text-[9px] text-slate-500 uppercase">Allies</span>
              <span className="font-bold text-indigo-400">{activeAlliesCount}</span>
            </div>
          </div>
        </div>

        {/* Bottom Center: Instruction Overlay Prompt */}
        <div className="hidden sm:flex flex-col items-center bg-slate-950/50 border border-slate-900 px-4 py-2 rounded font-mono text-[10px] text-slate-400 max-w-sm">
          <span className="text-slate-300 font-bold uppercase mb-0.5">🔥 SURVIVAL PROTOCOLS</span>
          <span>1. Gather logs 🪵 & metal ⚙️ near base.</span>
          <span>2. Defend with weapons [1-4]. Press [E] to build barricades.</span>
          <span>3. Press [Tab] to trigger HQ upgrades.</span>
        </div>

        {/* Bottom Right: Active Ammo Depot */}
        <div className="flex items-center gap-4">
          {/* Upgrade Trigger Button */}
          <button
            onClick={onOpenUpgradeMenu}
            className={`pointer-events-auto px-4 py-3.5 rounded-lg border font-mono font-bold text-xs uppercase tracking-wider cursor-pointer transition-all duration-150 flex items-center gap-2 ${
              isUpgradeMenuOpen
                ? 'bg-red-950 text-red-400 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                : 'bg-slate-900 text-slate-200 border-slate-800 hover:bg-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>[Tab] Upgrades</span>
          </button>

          {/* Weapon Details */}
          <div className="flex flex-col justify-between bg-slate-950/70 border border-slate-800/80 p-3 rounded-lg backdrop-blur-sm pointer-events-auto w-52 text-right">
            <div className="flex justify-between items-center border-b border-slate-800/50 pb-1 mb-1 font-mono text-[10px] text-slate-500">
              <span>ACTIVE ARMAMENT</span>
              <span style={{ color: activeWeapon.color }} className="font-bold uppercase tracking-wider">
                {activeWeapon.type}
              </span>
            </div>

            <span className="font-sans font-extrabold text-sm text-slate-200 uppercase tracking-tight">
              {activeWeapon.name}
            </span>

            {activeWeapon.type !== 'melee' ? (
              <div className="mt-1 font-mono flex justify-end items-baseline gap-1">
                <span className="text-lg font-black text-slate-100">{activeWeapon.ammo}</span>
                <span className="text-slate-500">/</span>
                <span className="text-xs text-slate-400 font-bold">{activeWeapon.maxAmmo}</span>
                <span className="text-[10px] text-slate-500 ml-1">AMMO</span>
              </div>
            ) : (
              <div className="mt-1 font-mono text-xs text-emerald-400 font-bold uppercase">
                Ready to swing
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

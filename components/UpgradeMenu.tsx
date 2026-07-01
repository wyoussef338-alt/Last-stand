import React, { useState } from 'react';
import { Shield, Sparkles, Zap, Heart, Flame, ShieldAlert, Swords, Target, Crosshair, HelpCircle } from 'lucide-react';
import { PlayerStats, Weapon, GameUpgrade } from '../types';
import { playSound } from '../utils/audio';

interface UpgradeMenuProps {
  playerStats: PlayerStats;
  weapons: Weapon[];
  upgrades: GameUpgrade[];
  onUpgradeStat: (upgradeId: string) => void;
  onUpgradeWeapon: (weaponId: string) => void;
  onClose: () => void;
}

type TabType = 'character' | 'weapons' | 'defense';

export default function UpgradeMenu({
  playerStats,
  weapons,
  upgrades,
  onUpgradeStat,
  onUpgradeWeapon,
  onClose,
}: UpgradeMenuProps) {
  const [activeTab, setActiveTab] = useState<TabType>('character');

  const charUpgrades = upgrades.filter(u => 
    ['player_hp', 'player_speed', 'player_stamina', 'armor'].includes(u.type)
  );
  const defenseUpgrades = upgrades.filter(u => 
    ['base_max_hp', 'melee_damage', 'reload_speed', 'turret_slots'].includes(u.type)
  );

  const getUpgradeIcon = (type: string) => {
    switch (type) {
      case 'player_hp': return <Heart className="w-5 h-5 text-emerald-400" />;
      case 'player_speed': return <Zap className="w-5 h-5 text-amber-400" />;
      case 'player_stamina': return <Flame className="w-5 h-5 text-orange-400" />;
      case 'armor': return <Shield className="w-5 h-5 text-indigo-400" />;
      case 'melee_damage': return <Swords className="w-5 h-5 text-red-400" />;
      case 'reload_speed': return <Crosshair className="w-5 h-5 text-blue-400" />;
      case 'base_max_hp': return <ShieldAlert className="w-5 h-5 text-pink-400" />;
      default: return <HelpCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header with funds */}
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/40">
          <div>
            <h2 className="text-xl font-sans font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-red-500 animate-pulse" />
              HQ UPGRADE & SUPPLY CENTER
            </h2>
            <p className="text-xs font-mono text-slate-400 mt-1 uppercase">Press [Tab] or click Close to return to stand</p>
          </div>
          
          <div className="flex gap-4 items-center">
            <div className="bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded flex flex-col font-mono">
              <span className="text-[10px] text-slate-500 uppercase">Available Cash</span>
              <span className="text-base font-bold text-amber-400">${playerStats.coins}</span>
            </div>
            <div className="bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded flex flex-col font-mono">
              <span className="text-[10px] text-slate-500 uppercase">Material Stocks</span>
              <span className="text-xs text-slate-300">🪵 {playerStats.wood} | ⚙️ {playerStats.scrap}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/50">
          {(['character', 'weapons', 'defense'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                playSound('repair');
              }}
              className={`flex-1 py-3 text-xs font-mono uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === tab
                  ? 'border-red-500 text-red-500 bg-slate-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              {tab === 'character' ? '🧬 SURVIVOR STATS' : tab === 'weapons' ? '🔫 WEAPONS DEPOT' : '🛡️ FORTIFICATION HQ'}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* CHARACTER TAB */}
          {activeTab === 'character' && (
            <div className="grid grid-cols-1 gap-4">
              {charUpgrades.map((upgrade) => {
                const canAfford = playerStats.coins >= upgrade.cost;
                const isMax = upgrade.level >= upgrade.maxLevel;
                return (
                  <div
                    key={upgrade.id}
                    className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-lg flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                        {getUpgradeIcon(upgrade.type)}
                      </div>
                      <div>
                        <h4 className="font-sans font-bold text-slate-200 text-sm flex items-center gap-2">
                          {upgrade.name}
                          <span className="font-mono text-xs text-slate-500">
                            (Lv.{upgrade.level}/{upgrade.maxLevel})
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">{upgrade.description}</p>
                      </div>
                    </div>

                    <button
                      disabled={isMax || !canAfford}
                      onClick={() => onUpgradeStat(upgrade.id)}
                      className={`px-4 py-2 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                        isMax
                          ? 'bg-slate-800 text-slate-500 border border-transparent cursor-not-allowed'
                          : canAfford
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                          : 'bg-slate-900 text-slate-500 border border-slate-800/80 hover:bg-slate-850 cursor-not-allowed'
                      }`}
                    >
                      {isMax ? 'MAXED' : `$${upgrade.cost}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* WEAPONS TAB */}
          {activeTab === 'weapons' && (
            <div className="grid grid-cols-1 gap-4">
              {weapons.map((weapon) => {
                const canAfford = playerStats.coins >= weapon.upgradeCost;
                const isLocked = !weapon.unlocked;
                const levelDisplay = isLocked ? 'LOCKED' : `Lv.${weapon.level}`;
                return (
                  <div
                    key={weapon.id}
                    className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-lg flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center font-mono font-bold text-lg" style={{ color: weapon.color }}>
                        {weapon.type === 'melee' ? '🪓' : weapon.type === 'pistol' ? '🔫' : weapon.type === 'shotgun' ? '💥' : '🚀'}
                      </div>
                      <div>
                        <h4 className="font-sans font-bold text-slate-200 text-sm flex items-center gap-2">
                          {weapon.name}
                          <span className={`font-mono text-xs px-2 py-0.5 rounded ${isLocked ? 'bg-red-950 text-red-400 border border-red-900/30' : 'bg-slate-800 text-slate-300'}`}>
                            {levelDisplay}
                          </span>
                        </h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-1 font-mono">
                          <span>Damage: <strong className="text-slate-200">{weapon.damage}</strong></span>
                          {weapon.type !== 'melee' && (
                            <>
                              <span>Clip: <strong className="text-slate-200">{weapon.ammo}/{weapon.maxAmmo}</strong></span>
                              <span>Reload: <strong className="text-slate-200">{(weapon.reloadTime / 1000).toFixed(1)}s</strong></span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={!canAfford}
                      onClick={() => onUpgradeWeapon(weapon.id)}
                      className={`px-4 py-2 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                        canAfford
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-900 text-slate-500 border border-slate-800/80 hover:bg-slate-850 cursor-not-allowed'
                      }`}
                    >
                      {isLocked ? `UNLOCK ($${weapon.upgradeCost})` : `UPGRADE ($${weapon.upgradeCost})`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* DEFENSE TAB */}
          {activeTab === 'defense' && (
            <div className="grid grid-cols-1 gap-4">
              {defenseUpgrades.map((upgrade) => {
                const canAfford = playerStats.coins >= upgrade.cost;
                const isMax = upgrade.level >= upgrade.maxLevel;
                return (
                  <div
                    key={upgrade.id}
                    className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-lg flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                        {getUpgradeIcon(upgrade.type)}
                      </div>
                      <div>
                        <h4 className="font-sans font-bold text-slate-200 text-sm flex items-center gap-2">
                          {upgrade.name}
                          <span className="font-mono text-xs text-slate-500">
                            (Lv.{upgrade.level}/{upgrade.maxLevel})
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">{upgrade.description}</p>
                      </div>
                    </div>

                    <button
                      disabled={isMax || !canAfford}
                      onClick={() => onUpgradeStat(upgrade.id)}
                      className={`px-4 py-2 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                        isMax
                          ? 'bg-slate-800 text-slate-500 border border-transparent cursor-not-allowed'
                          : canAfford
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                          : 'bg-slate-900 text-slate-500 border border-slate-800/80 hover:bg-slate-850 cursor-not-allowed'
                      }`}
                    >
                      {isMax ? 'MAXED' : `$${upgrade.cost}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold uppercase rounded border border-slate-700 transition-colors cursor-pointer"
          >
            RETURN TO STAND
          </button>
        </div>
      </div>
    </div>
  );
}

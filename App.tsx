import React, { useState, useEffect } from 'react';
import MainMenu from './components/MainMenu';
import GameOverScreen from './components/GameOverScreen';
import HUD from './components/HUD';
import GameCanvas from './components/GameCanvas';
import UpgradeMenu from './components/UpgradeMenu';
import SettingsModal from './components/SettingsModal';
import { PlayerStats, Weapon, BaseCore, GameUpgrade } from './types';
import { playSound } from './utils/audio';

type GameState = 'menu' | 'playing' | 'game_over';

const INITIAL_PLAYER_STATS: PlayerStats = {
  hp: 100,
  maxHp: 100,
  x: 1200,
  y: 1250,
  angle: 0,
  speed: 2.8,
  stamina: 100,
  maxStamina: 100,
  isSprinting: false,
  level: 1,
  xp: 0,
  xpNeeded: 100,
  coins: 0,
  wood: 15,  // starts with some materials to build early defenses
  scrap: 10,
  armor: 0,
  maxArmor: 60,
  isMeleeAttacking: false,
  meleeTimer: 0,
  spikeTrapsCount: 2,
  landminesCount: 1,
  electricFencesCount: 0,
  medkitsCount: 1,
  grenadesCount: 2,
  
  // Survival indicators (optional layer)
  hunger: 100,
  thirst: 100,
  foodCount: 1,
  waterCount: 1,

  // Character Customization appearance
  outfitColor: '#0f766e',
  headgear: 'none',
};

const INITIAL_BASE_CORE: BaseCore = {
  x: 1200,
  y: 1200,
  hp: 500,
  maxHp: 500,
  size: 45,
};

const INITIAL_WEAPONS: Weapon[] = [
  {
    id: 'pistol',
    name: 'Pistol C-9',
    type: 'pistol',
    damage: 15,
    fireRate: 350,
    reloadTime: 1200,
    maxAmmo: 12,
    ammo: 12,
    bulletSpeed: 520,
    spread: 0.05,
    projectileCount: 1,
    upgradeCost: 80,
    level: 1,
    unlocked: true,
    color: '#94a3b8',
  },
  {
    id: 'melee_axe',
    name: 'Firemans Axe',
    type: 'melee',
    damage: 30,
    fireRate: 500,
    reloadTime: 0,
    maxAmmo: 0,
    ammo: 0,
    bulletSpeed: 0,
    spread: 0,
    projectileCount: 1,
    upgradeCost: 75,
    level: 1,
    unlocked: true,
    color: '#f87171',
  },
  {
    id: 'shotgun',
    name: 'Tactical Shotgun',
    type: 'shotgun',
    damage: 10,
    fireRate: 900,
    reloadTime: 1900,
    maxAmmo: 6,
    ammo: 6,
    bulletSpeed: 450,
    spread: 0.32,
    projectileCount: 6,
    upgradeCost: 150,
    level: 1,
    unlocked: false,
    color: '#fb923c',
  },
  {
    id: 'rifle',
    name: 'Assault Rifle A-15',
    type: 'rifle',
    damage: 20,
    fireRate: 150,
    reloadTime: 1600,
    maxAmmo: 30,
    ammo: 30,
    bulletSpeed: 580,
    spread: 0.10,
    projectileCount: 1,
    upgradeCost: 220,
    level: 1,
    unlocked: false,
    color: '#60a5fa',
  },
];

const INITIAL_UPGRADES: GameUpgrade[] = [
  {
    id: 'player_hp',
    name: 'Max HP Matrix',
    description: 'Fortifies survival cells, increasing max HP (+35 HP per level).',
    cost: 50,
    level: 1,
    maxLevel: 5,
    type: 'player_hp',
  },
  {
    id: 'player_speed',
    name: 'Adrenaline Augment',
    description: 'Increases standard and sprint movement speed (+12% per level).',
    cost: 60,
    level: 1,
    maxLevel: 5,
    type: 'player_speed',
  },
  {
    id: 'player_stamina',
    name: 'Stamina Stamina Core',
    description: 'Improves sprinting duration and recovery stamina matrix.',
    cost: 45,
    level: 1,
    maxLevel: 5,
    type: 'player_stamina',
  },
  {
    id: 'armor',
    name: 'Nano Armor Plate',
    description: 'Absorbs heavy zombie strikes, reducing damage taken (+12% reduction).',
    cost: 90,
    level: 0,
    maxLevel: 5,
    type: 'armor',
  },
  {
    id: 'melee_damage',
    name: 'Alloy Sharpness',
    description: 'Increases firefighter axe slice and knockback strength (+15 Damage).',
    cost: 70,
    level: 1,
    maxLevel: 5,
    type: 'melee_damage',
  },
  {
    id: 'reload_speed',
    name: 'Rapid Reload Drills',
    description: 'Enhances gun reload timing speed and weapon fire rates (+15%).',
    cost: 80,
    level: 1,
    maxLevel: 5,
    type: 'reload_speed',
  },
  {
    id: 'base_max_hp',
    name: 'Shelter Hardening',
    description: 'Reinforces the Base Center, adding +150 max HP capacity.',
    cost: 100,
    level: 1,
    maxLevel: 5,
    type: 'base_max_hp',
  },
  {
    id: 'crit_chance',
    name: 'Precision Sight Upgrade',
    description: 'Increases critical hit chance (+5% per level, up to +25%).',
    cost: 75,
    level: 0,
    maxLevel: 5,
    type: 'crit_chance',
  },
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>('menu');

  // Interactive core state props to align with layout hud
  const [playerStats, setPlayerStats] = useState<PlayerStats>(INITIAL_PLAYER_STATS);
  const [baseCore, setBaseCore] = useState<BaseCore>(INITIAL_BASE_CORE);
  const [weapons, setWeapons] = useState<Weapon[]>(INITIAL_WEAPONS);
  const [upgrades, setUpgrades] = useState<GameUpgrade[]>(INITIAL_UPGRADES);

  // Time-Cycle / Wave stats
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'night'>('day');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60); // 60s starter day
  const [wave, setWave] = useState<number>(0);

  // Active counts
  const [zombieCount, setZombieCount] = useState<number>(0);
  const [totalZombiesInWave, setTotalZombiesInWave] = useState<number>(0);
  const [kills, setKills] = useState<number>(0);
  const [activeAlliesCount, setActiveAlliesCount] = useState<number>(0);

  // HUD and Menu views
  const [isUpgradeMenuOpen, setIsUpgradeMenuOpen] = useState<boolean>(false);
  const [gameOverReason, setGameOverReason] = useState<'player_died' | 'base_destroyed' | 'escaped'>('player_died');
  const [gameDifficulty, setGameDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');

  // New features state
  const [isHardcore, setIsHardcore] = useState<boolean>(false);
  const [isSurvivalMode, setIsSurvivalMode] = useState<boolean>(true);
  const [outfitColor, setOutfitColor] = useState<string>('#0f766e');
  const [headgear, setHeadgear] = useState<'none' | 'helmet' | 'bandana' | 'hood' | 'cap'>('none');

  // Accessibility & Settings options
  const [uiScale, setUiScale] = useState<'normal' | 'large'>('normal');
  const [colorblindMode, setColorblindMode] = useState<'normal' | 'protanopia' | 'tritanopia'>('normal');
  const [screenShakeEnabled, setScreenShakeEnabled] = useState<boolean>(true);
  const [flashEffectsEnabled, setFlashEffectsEnabled] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Close upgrade overlay on Escape/Tab keys
  useEffect(() => {
    const handleKeyOverlay = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.key === 'Tab') {
        e.preventDefault();
        setIsUpgradeMenuOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyOverlay);
    return () => window.removeEventListener('keydown', handleKeyOverlay);
  }, [gameState]);

  const handleStartGame = (
    difficulty: 'easy' | 'normal' | 'hard' = 'normal',
    hardcore: boolean = false,
    survival: boolean = true,
    color: string = '#0f766e',
    gear: 'none' | 'helmet' | 'bandana' | 'hood' | 'cap' = 'none'
  ) => {
    setGameDifficulty(difficulty);
    setIsHardcore(hardcore);
    setIsSurvivalMode(survival);
    setOutfitColor(color);
    setHeadgear(gear);
    
    // Scale starter resources based on difficulty
    let startWood = 15;
    let startScrap = 10;
    let startHp = 100;
    
    // Check achievements
    const highKills = parseInt(localStorage.getItem('last_stand_high_kills') || '0', 10);
    const highNight = parseInt(localStorage.getItem('last_stand_high_night') || '0', 10);
    if (highKills >= 10) {
      startScrap += 5; // Unlocked: First Blood (+5 starter scrap)
    }
    if (highNight >= 2) {
      startWood += 10; // Unlocked: Base Architect (+10 starter wood)
    }

    if (difficulty === 'easy') {
      startHp = 130;
      startWood += 10;
      startScrap += 10;
    } else if (difficulty === 'hard') {
      startHp = 80;
      startWood = Math.max(5, startWood - 7);
      startScrap = Math.max(2, startScrap - 6);
    }

    // Unlocked starting weapon upgrade if reach Wave 5
    const starterWeapons = [...INITIAL_WEAPONS];
    if (highNight >= 5) {
      // Pistol upgraded to Level 2
      starterWeapons[0] = {
        ...starterWeapons[0],
        level: 2,
        damage: starterWeapons[0].damage + 4,
      };
    }

    setPlayerStats({
      ...INITIAL_PLAYER_STATS,
      hp: startHp,
      maxHp: startHp,
      wood: startWood,
      scrap: startScrap,
      outfitColor: color,
      headgear: gear,
      hunger: 100,
      thirst: 100,
      foodCount: survival ? 2 : 0,
      waterCount: survival ? 2 : 0,
    });
    
    setBaseCore({
      ...INITIAL_BASE_CORE,
      hp: difficulty === 'easy' ? 700 : difficulty === 'hard' ? 400 : 500,
      maxHp: difficulty === 'easy' ? 700 : difficulty === 'hard' ? 400 : 500,
    });

    setWeapons(starterWeapons);
    setUpgrades(INITIAL_UPGRADES);
    setTimeOfDay('day');
    setSecondsRemaining(30); // 30s starter day to look around first
    setWave(0);
    setZombieCount(0);
    setTotalZombiesInWave(0);
    setKills(0);
    setActiveAlliesCount(0);
    setIsUpgradeMenuOpen(false);
    setGameState('playing');
    playSound('day_break');
  };

  const handleGameOver = (reason: 'player_died' | 'base_destroyed' | 'escaped') => {
    setGameOverReason(reason);
    setGameState('game_over');
    playSound(reason === 'escaped' ? 'day_break' : 'game_over');
  };

  // HANDLERS FOR UPGRADE SHOP DEPOT
  const handleUpgradeStat = (upgradeId: string) => {
    const upgradeIndex = upgrades.findIndex((u) => u.id === upgradeId);
    if (upgradeIndex === -1) return;

    const upgrade = upgrades[upgradeIndex];
    if (playerStats.coins < upgrade.cost || upgrade.level >= upgrade.maxLevel) return;

    // Process upgrade
    const nextLevel = upgrade.level + 1;
    const nextCost = Math.floor(upgrade.cost * 1.6);
    const updatedUpgrades = [...upgrades];
    updatedUpgrades[upgradeIndex] = { ...upgrade, level: nextLevel, cost: nextCost };
    setUpgrades(updatedUpgrades);

    // deduct player cash coins
    setPlayerStats((prev) => {
      const updated = { ...prev, coins: prev.coins - upgrade.cost };

      // Apply dynamic level ups
      if (upgrade.type === 'player_hp') {
        updated.maxHp += 35;
        updated.hp += 35; // heal extra HP
      } else if (upgrade.type === 'armor') {
        updated.armor = Math.min(60, nextLevel * 12);
      }

      return updated;
    });

    if (upgrade.type === 'base_max_hp') {
      setBaseCore((prev) => ({
        ...prev,
        maxHp: prev.maxHp + 150,
        hp: prev.hp + 150, // heal base slightly on upgrade
      }));
    }

    playSound('build');
  };

  const handleUpgradeWeapon = (weaponId: string) => {
    const weaponIndex = weapons.findIndex((w) => w.id === weaponId);
    if (weaponIndex === -1) return;

    const weapon = weapons[weaponIndex];
    if (playerStats.coins < weapon.upgradeCost) return;

    const updatedWeapons = [...weapons];

    if (!weapon.unlocked) {
      // unlock weapon!
      updatedWeapons[weaponIndex] = {
        ...weapon,
        unlocked: true,
        ammo: weapon.maxAmmo, // fill clip
      };
    } else {
      // upgrade weapon stats
      const nextLevel = weapon.level + 1;
      const nextCost = Math.floor(weapon.upgradeCost * 1.8);
      
      updatedWeapons[weaponIndex] = {
        ...weapon,
        level: nextLevel,
        upgradeCost: nextCost,
        damage: Math.floor(weapon.damage * 1.3),
        maxAmmo: weapon.type !== 'melee' ? Math.floor(weapon.maxAmmo * 1.25) : 0,
        reloadTime: weapon.type !== 'melee' ? Math.max(500, Math.floor(weapon.reloadTime * 0.85)) : 0,
        fireRate: Math.max(80, Math.floor(weapon.fireRate * 0.85)),
      };
    }

    setWeapons(updatedWeapons);
    setPlayerStats((prev) => ({
      ...prev,
      coins: prev.coins - weapon.upgradeCost,
    }));

    playSound('build');
  };

  const handleUseFood = () => {
    setPlayerStats((prev) => {
      if (prev.foodCount <= 0) return prev;
      playSound('repair'); // eating effect
      return {
        ...prev,
        foodCount: prev.foodCount - 1,
        hunger: Math.min(100, prev.hunger + 35),
        hp: Math.min(prev.maxHp, prev.hp + 12),
      };
    });
  };

  const handleUseWater = () => {
    setPlayerStats((prev) => {
      if (prev.waterCount <= 0) return prev;
      playSound('repair'); // drinking effect
      return {
        ...prev,
        waterCount: prev.waterCount - 1,
        thirst: Math.min(100, prev.thirst + 45),
        stamina: Math.min(prev.maxStamina, prev.stamina + 25),
      };
    });
  };

  // Active weapon tracker
  const [activeWeaponIdx, setActiveWeaponIdx] = useState<number>(0);
  const activeWeapon = weapons[activeWeaponIdx] || weapons[0];

  const currentSeason = wave <= 3 ? 'spring' : wave <= 6 ? 'summer' : wave <= 9 ? 'autumn' : 'winter';

  // Scoring
  const survivalScore = wave * 250 + kills * 15 + activeAlliesCount * 100 + playerStats.level * 50;

  return (
    <div className="w-full h-screen bg-slate-950 overflow-hidden relative font-sans">
      
      {gameState === 'menu' && (
        <MainMenu
          onStartGame={handleStartGame}
          uiScale={uiScale}
          setUiScale={setUiScale}
          colorblindMode={colorblindMode}
          setColorblindMode={setColorblindMode}
          screenShakeEnabled={screenShakeEnabled}
          setScreenShakeEnabled={setScreenShakeEnabled}
          flashEffectsEnabled={flashEffectsEnabled}
          setFlashEffectsEnabled={setFlashEffectsEnabled}
        />
      )}

      {gameState === 'playing' && (
        <div className="w-full h-full relative">
          
          {/* Active Canvas Context */}
          <GameCanvas
            playerStats={playerStats}
            setPlayerStats={setPlayerStats}
            baseCore={baseCore}
            setBaseCore={setBaseCore}
            weapons={weapons}
            setWeapons={setWeapons}
            upgrades={upgrades}
            timeOfDay={timeOfDay}
            setTimeOfDay={setTimeOfDay}
            secondsRemaining={secondsRemaining}
            setSecondsRemaining={setSecondsRemaining}
            wave={wave}
            setWave={setWave}
            zombieCount={zombieCount}
            setZombieCount={setZombieCount}
            totalZombiesInWave={totalZombiesInWave}
            setTotalZombiesInWave={setTotalZombiesInWave}
            kills={kills}
            setKills={setKills}
            activeAlliesCount={activeAlliesCount}
            setActiveAlliesCount={setActiveAlliesCount}
            onGameOver={handleGameOver}
            isUpgradeMenuOpen={isUpgradeMenuOpen}
            gameDifficulty={gameDifficulty}
            
            // New custom settings props
            isSurvivalMode={isSurvivalMode}
            isHardcore={isHardcore}
            uiScale={uiScale}
            colorblindMode={colorblindMode}
            screenShakeEnabled={screenShakeEnabled}
            flashEffectsEnabled={flashEffectsEnabled}
            season={currentSeason}
            onUseFood={handleUseFood}
            onUseWater={handleUseWater}
            activeWeaponIdx={activeWeaponIdx}
            setActiveWeaponIdx={setActiveWeaponIdx}
          />

          {/* Floating UI HUD Panel */}
          <HUD
            playerStats={playerStats}
            baseCore={baseCore}
            activeWeapon={activeWeapon}
            timeOfDay={timeOfDay}
            secondsRemaining={secondsRemaining}
            wave={wave}
            zombieCount={zombieCount}
            totalZombiesInWave={totalZombiesInWave}
            kills={kills}
            activeAlliesCount={activeAlliesCount}
            onOpenUpgradeMenu={() => setIsUpgradeMenuOpen((prev) => !prev)}
            isUpgradeMenuOpen={isUpgradeMenuOpen}
            
            // Custom settings callbacks
            isSurvivalMode={isSurvivalMode}
            onUseFood={handleUseFood}
            onUseWater={handleUseWater}
            onToggleSettings={() => setIsSettingsOpen((prev) => !prev)}
            season={currentSeason}
          />

          {/* Upgrades Shop Menu overlay */}
          {isUpgradeMenuOpen && (
            <UpgradeMenu
              playerStats={playerStats}
              weapons={weapons}
              upgrades={upgrades}
              onUpgradeStat={handleUpgradeStat}
              onUpgradeWeapon={handleUpgradeWeapon}
              onClose={() => setIsUpgradeMenuOpen(false)}
            />
          )}

          {/* Settings and Accessibility Modal overlay */}
          {isSettingsOpen && (
            <SettingsModal
              uiScale={uiScale}
              setUiScale={setUiScale}
              colorblindMode={colorblindMode}
              setColorblindMode={setColorblindMode}
              screenShakeEnabled={screenShakeEnabled}
              setScreenShakeEnabled={setScreenShakeEnabled}
              flashEffectsEnabled={flashEffectsEnabled}
              setFlashEffectsEnabled={setFlashEffectsEnabled}
              onClose={() => setIsSettingsOpen(false)}
            />
          )}

        </div>
      )}

      {gameState === 'game_over' && (
        <GameOverScreen
          nightsSurvived={wave}
          zombieKills={kills}
          resourcesLooted={playerStats.wood + playerStats.scrap}
          soldiersRescued={activeAlliesCount}
          score={survivalScore}
          reason={gameOverReason}
          onRestart={() => handleStartGame(gameDifficulty, isHardcore, isSurvivalMode, outfitColor, headgear)}
          onGoToMenu={() => setGameState('menu')}
          isHardcore={isHardcore}
        />
      )}

    </div>
  );
}


import React, { useEffect, useRef, useState } from 'react';
import { 
  PlayerStats, Weapon, Zombie, Wall, Turret, BaseCore, 
  Soldier, ResourceCrate, Bullet, Particle, GameUpgrade, Trap
} from '../types';
import { playSound } from '../utils/audio';

interface GameCanvasProps {
  playerStats: PlayerStats;
  setPlayerStats: React.Dispatch<React.SetStateAction<PlayerStats>>;
  baseCore: BaseCore;
  setBaseCore: React.Dispatch<React.SetStateAction<BaseCore>>;
  weapons: Weapon[];
  setWeapons: React.Dispatch<React.SetStateAction<Weapon[]>>;
  upgrades: GameUpgrade[];
  timeOfDay: 'day' | 'night';
  setTimeOfDay: (time: 'day' | 'night') => void;
  secondsRemaining: number;
  setSecondsRemaining: React.Dispatch<React.SetStateAction<number>>;
  wave: number;
  setWave: React.Dispatch<React.SetStateAction<number>>;
  zombieCount: number;
  setZombieCount: (count: number) => void;
  totalZombiesInWave: number;
  setTotalZombiesInWave: (count: number) => void;
  kills: number;
  setKills: React.Dispatch<React.SetStateAction<number>>;
  activeAlliesCount: number;
  setActiveAlliesCount: (count: number) => void;
  onGameOver: (reason: 'player_died' | 'base_destroyed' | 'escaped') => void;
  isUpgradeMenuOpen: boolean;
  gameDifficulty: 'easy' | 'normal' | 'hard';
  
  // Custom states
  isSurvivalMode: boolean;
  isHardcore: boolean;
  uiScale: 'normal' | 'large';
  colorblindMode: 'normal' | 'protanopia' | 'tritanopia';
  screenShakeEnabled: boolean;
  flashEffectsEnabled: boolean;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  onUseFood: () => void;
  onUseWater: () => void;
  activeWeaponIdx: number;
  setActiveWeaponIdx: React.Dispatch<React.SetStateAction<number>>;
}

// Map dimensions
const MAP_WIDTH = 2400;
const MAP_HEIGHT = 2400;
const BASE_X = 1200;
const BASE_Y = 1200;

// Build Spots definitions
interface BuildSpot {
  id: string;
  x: number;
  y: number;
  type: 'empty' | 'wall' | 'turret';
  targetId: string | null; // references active Wall or Turret id
}

export default function GameCanvas({
  playerStats,
  setPlayerStats,
  baseCore,
  setBaseCore,
  weapons,
  setWeapons,
  upgrades,
  timeOfDay,
  setTimeOfDay,
  secondsRemaining,
  setSecondsRemaining,
  wave,
  setWave,
  zombieCount,
  setZombieCount,
  totalZombiesInWave,
  setTotalZombiesInWave,
  kills,
  setKills,
  activeAlliesCount,
  setActiveAlliesCount,
  onGameOver,
  isUpgradeMenuOpen,
  gameDifficulty,
  isSurvivalMode,
  isHardcore,
  uiScale,
  colorblindMode,
  screenShakeEnabled,
  flashEffectsEnabled,
  season,
  onUseFood,
  onUseWater,
  activeWeaponIdx,
  setActiveWeaponIdx,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keyboard and Mouse input trackers
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseClicked = useRef<boolean>(false);

  // Crafting state
  const [isCraftingOpen, setIsCraftingOpen] = useState<boolean>(false);

  // Entities stored inside refs to bypass React state latency in high speed loop
  const playerRef = useRef<PlayerStats>(playerStats);
  const baseRef = useRef<BaseCore>(baseCore);
  const weaponsRef = useRef<Weapon[]>(weapons);
  const zombies = useRef<Zombie[]>([]);
  const bullets = useRef<Bullet[]>([]);
  const particles = useRef<Particle[]>([]);
  const soldiers = useRef<Soldier[]>([]);
  const crates = useRef<ResourceCrate[]>([]);
  const walls = useRef<Wall[]>([]);
  const turrets = useRef<Turret[]>([]);
  const traps = useRef<Trap[]>([]);

  // Advanced mechanics state refs
  const currentWeather = useRef<'clear' | 'fog' | 'rain'>('clear');
  const isHordeNight = useRef<boolean>(false);
  const chopperArrived = useRef<boolean>(false);
  const chopperTimer = useRef<number>(0); // 60s count
  const hasRadioedChopper = useRef<boolean>(false);

  // Traveling Merchant State
  const merchantActive = useRef<boolean>(false);
  const merchantPos = useRef<{ x: number; y: number }>({ x: BASE_X - 120, y: BASE_Y - 70 });
  const [isMerchantOpen, setIsMerchantOpen] = useState<boolean>(false);

  // Lore Log Diaries System
  const [collectedLogIds, setCollectedLogIds] = useState<string[]>([]);
  const [activeLogOverlay, setActiveLogOverlay] = useState<{ title: string; text: string } | null>(null);
  const spawnedLogs = useRef<{ id: string; x: number; y: number; title: string; text: string; collected: boolean }[]>([]);

  // Build spots around base
  const buildSpots = useRef<BuildSpot[]>([]);

  // Local stats trackers to lift up to React
  const currentWaveZombiesKilledInNight = useRef<number>(0);
  const maxZombiesToSpawnThisNight = useRef<number>(0);
  const zombiesSpawnedCount = useRef<number>(0);
  const lastZombieSpawnTime = useRef<number>(0);
  const lastCrateSpawnTime = useRef<number>(0);

  // Weapon details
  const lastShotTime = useRef<number>(0);
  const isReloading = useRef<boolean>(false);
  const reloadTimer = useRef<number>(0);

  // Dash mechanics
  const isDashing = useRef<boolean>(false);
  const dashTimer = useRef<number>(0);
  const dashCooldown = useRef<number>(0);
  const dashVx = useRef<number>(0);
  const dashVy = useRef<number>(0);
  const lastDashTime = useRef<number>(0);
  const dashTrailParticles = useRef<{ x: number; y: number; angle: number; alpha: number; id: number }[]>([]);
  const lastStateSyncTime = useRef<number>(0);

  // Visual cues
  const screenShake = useRef<number>(0);
  const activeWeaponIndex = useRef<number>(0); // 0=pistol, 1=melee, 2=shotgun, 3=rifle
  const playerHitFlashTimer = useRef<number>(0);
  const baseAttackIndicator = useRef<{ angle: number; timer: number } | null>(null);
  const timeOfDayOpacity = useRef<number>(0);
  const alarmTimer = useRef<number>(0);

  // Synchronize dynamic player states from React props back into gameplay loop refs
  useEffect(() => {
    playerRef.current = playerStats;
  }, [playerStats]);

  useEffect(() => {
    baseRef.current = baseCore;
  }, [baseCore]);

  useEffect(() => {
    weaponsRef.current = weapons;
  }, [weapons]);

  // INITIALIZE BUILD SPOTS & SCATTERED RESOURCES
  useEffect(() => {
    // 8 build spots around the central command base at radius 220 pixels
    const spots: BuildSpot[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const radius = 240;
      spots.push({
        id: `spot_${i}`,
        x: BASE_X + Math.cos(angle) * radius,
        y: BASE_Y + Math.sin(angle) * radius,
        type: 'empty',
        targetId: null,
      });
    }
    buildSpots.current = spots;

    // Pre-populate some starter walls in 4 spots to give base a nice initial look
    const startWallSpots = [0, 2, 4, 6];
    startWallSpots.forEach((idx) => {
      const spot = spots[idx];
      const wallId = `wall_init_${idx}`;
      const angle = (idx * Math.PI) / 4;
      
      const newWall: Wall = {
        id: wallId,
        x: spot.x,
        y: spot.y,
        hp: 150,
        maxHp: 150,
        width: Math.abs(Math.sin(angle)) > 0.7 ? 80 : 25,
        height: Math.abs(Math.cos(angle)) > 0.7 ? 80 : 25,
        material: 'wood',
        color: '#7c2d12', // brown
      };
      
      walls.current.push(newWall);
      spot.type = 'wall';
      spot.targetId = wallId;
    });

    // Spawn initial trees & metal scrap piles
    spawnScavengeNodes(60);

    // Populate scattered story diary pages
    const logPool = [
      {
        id: 'lore_1',
        title: '📓 PROJECT AEGIS: LAB NOTES #1',
        text: 'Entry Date: October 12.\nThe experimental cellular research in Sector 4 was meant to cure traumatic physical injury. Instead, it triggered total synaptic decay and reanimation within hours of exposure. We sealed the primary cleanroom doors, but the ventilation systems were compromised. If you find this log: the pathogen is airborne in sealed buildings. Stay outdoors. Build heavy wooden walls immediately.',
      },
      {
        id: 'lore_2',
        title: '📓 SURVIVAL DIARY: FIRST NIGHTFALL #2',
        text: 'Entry Date: October 19.\nThe screeching... we will never forget the horror of the first night. The infected are hypersensitive to solar ultraviolet waves; it actively burns their skin and optic nerves, forcing them into dark cellars during the day. But when darkness breaks, they mutate, sprint, and track human scent in packs of dozens. We built a command core here to broadcast signals. If the core goes dark, we all die.',
      },
      {
        id: 'lore_3',
        title: '📓 MILITARY INTEL: EXTRACTION PROTOCOL #3',
        text: 'Entry Date: November 2.\nHelicopter command has put a rescue birds chopper on standby. But fuel reserves are critical. The pilot radios that they cannot risk a landing until we hold off the horde for at least 15 waves. The hostiles are simply too dense. Defend the base, collect materials, and enlist stray soldiers from metal cages—their extra assault rifles are our only hope.',
      },
      {
        id: 'lore_4',
        title: '📓 SECTOR BRIEFING: SEASONAL DEVIATION #4',
        text: 'Entry Date: November 15.\nThe airborne bio-toxin has catalyzed extreme localized greenhouse feedback. Pacing is chaotic. Summer cycles scorch the landscape, draining your water supply 1.5x faster. Winter frost freezes muscle tissue, stalling stamina regeneration. Your only warmth is the thermal radiation of the central Command Core. Gather canned beans and drink pure water to stay alive!'
      }
    ];

    spawnedLogs.current = logPool.map((log) => ({
      ...log,
      x: Math.random() * (MAP_WIDTH - 600) + 300,
      y: Math.random() * (MAP_HEIGHT - 600) + 300,
      collected: false,
    }));

    merchantActive.current = true;

    // Spawn 2 trapped soldiers in cages to rescue early
    for (let i = 0; i < 2; i++) {
      spawnCrate('soldier_cage');
    }
  }, []);

  const spawnScavengeNodes = (count: number) => {
    for (let i = 0; i < count; i++) {
      let x = Math.random() * (MAP_WIDTH - 200) + 100;
      let y = Math.random() * (MAP_HEIGHT - 200) + 100;

      // Keep nodes away from immediate base center
      const dist = Math.hypot(x - BASE_X, y - BASE_Y);
      if (dist < 350) {
        // shift outward
        x += (x > BASE_X ? 350 : -350);
        y += (y > BASE_Y ? 350 : -350);
      }

      const types: ('wood' | 'scrap' | 'health' | 'ammo')[] = ['wood', 'wood', 'scrap', 'scrap', 'ammo', 'health'];
      const nodeType = types[Math.floor(Math.random() * types.length)];
      
      let color = '#f59e0b';
      let size = 18;
      if (nodeType === 'wood') {
        color = '#15803d'; // green tree canopy representation
        size = 24;
      } else if (nodeType === 'scrap') {
        color = '#64748b'; // slate metal scrap pile
        size = 18;
      } else if (nodeType === 'health') {
        color = '#ef4444'; // medical supply
        size = 14;
      } else {
        color = '#3b82f6'; // ammunition
        size = 14;
      }

      crates.current.push({
        id: `node_${Date.now()}_${Math.random()}`,
        x,
        y,
        type: nodeType,
        amount: nodeType === 'wood' || nodeType === 'scrap' ? Math.floor(Math.random() * 8) + 5 : 1,
        size,
        color,
        looted: false,
      });
    }
  };

  const spawnCrate = (specificType?: 'wood' | 'scrap' | 'ammo' | 'health' | 'soldier_cage') => {
    let x = Math.random() * (MAP_WIDTH - 300) + 150;
    let y = Math.random() * (MAP_HEIGHT - 300) + 150;

    const types: ('wood' | 'scrap' | 'ammo' | 'health' | 'soldier_cage')[] = ['wood', 'scrap', 'ammo', 'health'];
    const selectedType = specificType || types[Math.floor(Math.random() * types.length)];

    let color = '#f59e0b';
    let size = 20;

    if (selectedType === 'soldier_cage') {
      color = '#c084fc'; // purple metal cage
      size = 28;
    } else if (selectedType === 'health') {
      color = '#ec4899';
      size = 16;
    } else if (selectedType === 'ammo') {
      color = '#3b82f6';
      size = 16;
    }

    const crateId = `crate_${Date.now()}_${Math.random()}`;

    let trappedSoldier: Soldier | undefined;
    if (selectedType === 'soldier_cage') {
      // create the soldier metadata
      trappedSoldier = {
        id: `soldier_${Date.now()}`,
        x,
        y,
        hp: 100,
        maxHp: 100,
        speed: 2.2,
        angle: 0,
        state: 'trapped',
        role: 'follow', // default following behavior
        weaponType: Math.random() > 0.5 ? 'rifle' : 'shotgun',
        lastShotTime: 0,
        fireRate: Math.random() > 0.5 ? 400 : 900,
        damage: Math.random() > 0.5 ? 15 : 25,
        targetId: null,
        cageHp: 80, // cage needs to take this damage to break
      };
    }

    crates.current.push({
      id: crateId,
      x,
      y,
      type: selectedType,
      amount: selectedType === 'soldier_cage' ? 1 : Math.floor(Math.random() * 12) + 8,
      size,
      color,
      looted: false,
      soldierInside: trappedSoldier,
    });
  };

  // MAIN RUNTIME EFFECTS: Keyboards & Mouse events listener
  useEffect(() => {
    // Layout-independent key normalization helper (e.g. support Arabic layouts or other layouts)
    const getNormalizedKey = (e: KeyboardEvent): string => {
      const code = e.code ? e.code.toLowerCase() : '';
      if (code === 'keyw') return 'w';
      if (code === 'keya') return 'a';
      if (code === 'keys') return 's';
      if (code === 'keyd') return 'd';
      if (code === 'keye') return 'e';
      if (code === 'keyf') return 'f';
      if (code === 'keyq') return 'q';
      if (code === 'keyh') return 'h';
      if (code === 'keyg') return 'g';
      if (code === 'keyt') return 't';
      if (code === 'keyy') return 'y';
      if (code === 'space') return ' ';
      if (code === 'arrowup') return 'arrowup';
      if (code === 'arrowdown') return 'arrowdown';
      if (code === 'arrowleft') return 'arrowleft';
      if (code === 'arrowright') return 'arrowright';
      if (code === 'digit1') return '1';
      if (code === 'digit2') return '2';
      if (code === 'digit3') return '3';
      if (code === 'digit4') return '4';
      if (code === 'digit5') return '5';
      if (code === 'digit6') return '6';
      if (code === 'digit7') return '7';
      
      return e.key ? e.key.toLowerCase() : '';
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isUpgradeMenuOpen) return;

      const normKey = getNormalizedKey(e);
      if (normKey) {
        keysPressed.current[normKey] = true;
      }

      // Weapon selector numeric triggers
      if (normKey === '1') { activeWeaponIndex.current = 0; setActiveWeaponIdx(0); }
      if (normKey === '2') { activeWeaponIndex.current = 1; setActiveWeaponIdx(1); }
      if (normKey === '3') { activeWeaponIndex.current = 2; setActiveWeaponIdx(2); }
      if (normKey === '4') { activeWeaponIndex.current = 3; setActiveWeaponIdx(3); }

      // Tab or U keys can be captured to trigger React Upgrades
      if (normKey === 'tab' || normKey === 'u') {
        e.preventDefault();
        keysPressed.current['tab'] = false; // reset
        // trigger menu click via React custom element hook or direct trigger
        const upgradeBtn = document.querySelector('button[id*="Tab"]');
        if (upgradeBtn) {
          (upgradeBtn as HTMLButtonElement).click();
        }
      }

      // Q Key eats Food
      if (normKey === 'q') {
        onUseFood();
      }

      // H Key drinks Water
      if (normKey === 'h') {
        onUseWater();
      }

      // E Key action triggers base build/repair or opens Traveling Merchant shop
      if (normKey === 'e') {
        const player = playerRef.current;
        const distToMerchant = Math.hypot(player.x - merchantPos.current.x, player.y - merchantPos.current.y);
        if (merchantActive.current && timeOfDay === 'day' && distToMerchant < 65) {
          setIsMerchantOpen((prev) => !prev);
          playSound('repair');
        } else {
          handleBuildInteraction();
        }
      }

      // F Key triggers Crafting Bench Menu toggle
      if (normKey === 'f') {
        const distToBench = Math.hypot(playerRef.current.x - BASE_X, playerRef.current.y - (BASE_Y - 70));
        if (distToBench < 80) {
          setIsCraftingOpen((prev) => !prev);
          playSound('repair');
        }
      }

      // 5 Key - Place Spike Trap
      if (normKey === '5') {
        if (playerRef.current.spikeTrapsCount > 0) {
          setPlayerStats((prev) => ({ ...prev, spikeTrapsCount: prev.spikeTrapsCount - 1 }));
          traps.current.push({
            id: `trap_spike_${Date.now()}`,
            x: playerRef.current.x,
            y: playerRef.current.y,
            type: 'spike',
            hp: 200,
            maxHp: 200,
            size: 16,
            active: true,
          });
          createSparks(playerRef.current.x, playerRef.current.y, '#4b5563', 8);
          playSound('build');
        }
      }

      // 6 Key - Place Landmine
      if (normKey === '6') {
        if (playerRef.current.landminesCount > 0) {
          setPlayerStats((prev) => ({ ...prev, landminesCount: prev.landminesCount - 1 }));
          traps.current.push({
            id: `trap_mine_${Date.now()}`,
            x: playerRef.current.x,
            y: playerRef.current.y,
            type: 'landmine',
            hp: 1,
            maxHp: 1,
            size: 10,
            active: true,
          });
          createSparks(playerRef.current.x, playerRef.current.y, '#f59e0b', 8);
          playSound('build');
        }
      }

      // 7 Key - Place Electric Fence
      if (normKey === '7') {
        if (playerRef.current.electricFencesCount > 0) {
          setPlayerStats((prev) => ({ ...prev, electricFencesCount: prev.electricFencesCount - 1 }));
          traps.current.push({
            id: `trap_elec_${Date.now()}`,
            x: playerRef.current.x,
            y: playerRef.current.y,
            type: 'electric_fence',
            hp: 250,
            maxHp: 250,
            size: 18,
            active: true,
            zapCooldown: 0,
          });
          createSparks(playerRef.current.x, playerRef.current.y, '#38bdf8', 12);
          playSound('build');
        }
      }

      // Q or H Key - Use Medkit
      if (normKey === 'q' || normKey === 'h') {
        if (playerRef.current.medkitsCount > 0 && playerRef.current.hp < playerRef.current.maxHp) {
          setPlayerStats((prev) => ({
            ...prev,
            medkitsCount: prev.medkitsCount - 1,
            hp: Math.min(prev.maxHp, prev.hp + 40),
          }));
          createSparks(playerRef.current.x, playerRef.current.y, '#10b981', 15);
          playSound('repair');
        }
      }

      // G Key - Throw Grenade
      if (normKey === 'g') {
        if (playerRef.current.grenadesCount > 0) {
          setPlayerStats((prev) => ({ ...prev, grenadesCount: prev.grenadesCount - 1 }));
          const angle = playerRef.current.angle;
          bullets.current.push({
            id: `grenade_${Date.now()}`,
            x: playerRef.current.x,
            y: playerRef.current.y,
            vx: Math.cos(angle) * 350,
            vy: Math.sin(angle) * 350,
            damage: 150 + wave * 15,
            range: 150, // explodes at this range
            distanceTraveled: 0,
            source: 'player',
            size: 6,
            color: '#334155',
          });
          playSound('swing');
        }
      }

      // T Key - Command Soldier
      if (normKey === 't') {
        let closestSoldier: Soldier | null = null;
        let minDist = 100;
        soldiers.current.forEach((s) => {
          if (s.state !== 'trapped') {
            const d = Math.hypot(playerRef.current.x - s.x, playerRef.current.y - s.y);
            if (d < minDist) {
              minDist = d;
              closestSoldier = s;
            }
          }
        });
        if (closestSoldier) {
          const s = closestSoldier as Soldier;
          if (s.role === 'follow') {
            s.role = 'guard';
            s.guardX = s.x;
            s.guardY = s.y;
            s.state = 'defending';
          } else {
            s.role = 'follow';
            s.state = 'following';
          }
          playSound('repair');
          createSparks(s.x, s.y, '#818cf8', 8);
        }
      }

      // Y Key - Upgrade nearest wall material tier
      if (normKey === 'y') {
        let closestWall: Wall | null = null;
        let minDist = 75;
        walls.current.forEach((w) => {
          const d = Math.hypot(playerRef.current.x - w.x, playerRef.current.y - w.y);
          if (d < minDist) {
            minDist = d;
            closestWall = w;
          }
        });
        if (closestWall) {
          const w = closestWall as Wall;
          if (w.material === 'wood' && playerRef.current.scrap >= 15) {
            w.material = 'iron';
            w.maxHp = 600;
            w.hp = 600;
            w.color = '#475569';
            setPlayerStats((prev) => ({ ...prev, scrap: prev.scrap - 15 }));
            playSound('build');
            createSparks(w.x, w.y, '#475569', 15);
          } else if (w.material === 'iron' && playerRef.current.scrap >= 25 && playerRef.current.coins >= 150) {
            w.material = 'reinforced';
            w.maxHp = 1500;
            w.hp = 1500;
            w.color = '#312e81';
            setPlayerStats((prev) => ({ ...prev, scrap: prev.scrap - 25, coins: prev.coins - 150 }));
            playSound('build');
            createSparks(w.x, w.y, '#6366f1', 20);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const normKey = getNormalizedKey(e);
      if (normKey) {
        keysPressed.current[normKey] = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      
      // Calculate mouse position relative to canvas coordinates, accounting for current Camera translation
      const cx = (e.clientX - rect.left);
      const cy = (e.clientY - rect.top);
      
      // Store raw mouse position on the screen
      mousePos.current = { x: cx, y: cy };
    };

    const handleMouseDown = () => {
      mouseClicked.current = true;
      // Force keyboard event focus when clicking anywhere inside the game
      window.focus();
    };

    const handleMouseUp = () => {
      mouseClicked.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isUpgradeMenuOpen]);

  // BUILD AND REPAIR LOGIC ON E PRESS
  const handleBuildInteraction = () => {
    const player = playerRef.current;

    // Helicopter evacuation check
    if (wave >= 10 && chopperArrived.current) {
      const distToHeli = Math.hypot(player.x - BASE_X, player.y - (BASE_Y - 120));
      if (distToHeli < 85) {
        onGameOver('escaped');
        return;
      }
    }
    
    // Find closest build spot within range
    let closestSpot: BuildSpot | null = null;
    let minDist = 75; // build interact range

    buildSpots.current.forEach((spot) => {
      const dist = Math.hypot(player.x - spot.x, player.y - spot.y);
      if (dist < minDist) {
        minDist = dist;
        closestSpot = spot;
      }
    });

    if (!closestSpot) return;

    // Interact with Spot!
    const spot: BuildSpot = closestSpot;

    if (spot.type === 'empty') {
      // Prompt option: player has enough resources to build wood wall or turret
      // Let's build a WOOD WALL if player has 10 wood and 5 scrap, or TURRET if has 15 wood and 20 scrap
      if (player.wood >= 12 && player.scrap >= 6) {
        // Build Wood Wall
        const wallId = `wall_${Date.now()}`;
        const newWall: Wall = {
          id: wallId,
          x: spot.x,
          y: spot.y,
          hp: 250,
          maxHp: 250,
          width: 50,
          height: 35,
          material: 'wood',
          color: '#854d0e',
        };
        
        walls.current.push(newWall);
        spot.type = 'wall';
        spot.targetId = wallId;

        // deduct resources
        setPlayerStats((prev) => ({
          ...prev,
          wood: prev.wood - 12,
          scrap: prev.scrap - 6,
        }));
        
        createSparks(spot.x, spot.y, '#854d0e', 12);
        playSound('build');
      } else {
        // insufficient materials floating alert
        createSparks(player.x, player.y, '#ef4444', 4);
      }
    } else if (spot.type === 'wall') {
      // Spot currently has wall: Upgrade to TURRET (needs 15 Wood, 18 Scrap, 150 Coins) or REPAIR wall if damaged
      const wall = walls.current.find((w) => w.id === spot.targetId);
      
      if (wall && wall.hp < wall.maxHp) {
        // Repair! Spends 2 wood and 2 scrap
        if (player.wood >= 2 && player.scrap >= 2) {
          wall.hp = Math.min(wall.maxHp, wall.hp + 100);
          setPlayerStats((prev) => ({
            ...prev,
            wood: prev.wood - 2,
            scrap: prev.scrap - 2,
          }));
          createSparks(wall.x, wall.y, '#10b981', 8);
          playSound('repair');
        }
      } else if (wall && wall.hp === wall.maxHp) {
        // Full HP wall -> can be upgraded to Automatic Turret!
        // Spends 15 scrap, 10 wood, 120 coins
        if (player.scrap >= 15 && player.wood >= 10 && player.coins >= 120) {
          // Remove wall
          walls.current = walls.current.filter((w) => w.id !== wall.id);
          
          // Add Turret
          const turretId = `turret_${Date.now()}`;
          const newTurret: Turret = {
            id: turretId,
            x: spot.x,
            y: spot.y,
            hp: 200,
            maxHp: 200,
            level: 1,
            range: 220,
            damage: 8 + (upgrades.find(u => u.type === 'turret_slots')?.level || 0) * 4,
            fireRate: 800,
            lastShotTime: 0,
            angle: 0,
            upgradeCost: 150,
            color: '#1e293b',
          };
          
          turrets.current.push(newTurret);
          spot.type = 'turret';
          spot.targetId = turretId;

          setPlayerStats((prev) => ({
            ...prev,
            wood: prev.wood - 10,
            scrap: prev.scrap - 15,
            coins: prev.coins - 120,
          }));

          createSparks(spot.x, spot.y, '#3b82f6', 15);
          playSound('build');
        }
      }
    } else if (spot.type === 'turret') {
      // Spot has Turret: Upgrade Turret Level (spends 150 coins, increases range/damage) or Repair Turret
      const turret = turrets.current.find((t) => t.id === spot.targetId);
      if (turret && turret.hp < turret.maxHp) {
        // Repair spends 4 scrap
        if (player.scrap >= 4) {
          turret.hp = Math.min(turret.maxHp, turret.hp + 80);
          setPlayerStats((prev) => ({
            ...prev,
            scrap: prev.scrap - 4,
          }));
          createSparks(turret.x, turret.y, '#10b981', 8);
          playSound('repair');
        }
      } else if (turret && turret.hp === turret.maxHp && turret.level < 4) {
        // Upgrade level
        const cost = turret.upgradeCost;
        if (player.coins >= cost) {
          turret.level += 1;
          turret.range += 30;
          turret.damage += 6;
          turret.fireRate = Math.max(300, turret.fireRate - 120);
          turret.upgradeCost = Math.floor(turret.upgradeCost * 1.6);
          
          setPlayerStats((prev) => ({
            ...prev,
            coins: prev.coins - cost,
          }));

          createSparks(turret.x, turret.y, '#eab308', 20);
          playSound('build');
        }
      }
    }
  };

  // COLLISION HELPERS
  const checkCircleCollision = (x1: number, y1: number, r1: number, x2: number, y2: number, r2: number) => {
    return Math.hypot(x1 - x2, y1 - y2) < (r1 + r2);
  };

  // SPARK CREATOR
  const createSparks = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particles.current.push({
        id: `spark_${Date.now()}_${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3.5 + 1.5,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.015,
        life: 0,
        maxLife: Math.random() * 40 + 20,
        type: 'spark',
      });
    }
  };

  // BLOOD SPLATTER CREATOR
  const createBlood = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 0.5;
      particles.current.push({
        id: `blood_${Date.now()}_${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 4 + 2,
        alpha: 0.9,
        decay: Math.random() * 0.02 + 0.01,
        life: 0,
        maxLife: Math.random() * 50 + 30,
        type: 'blood',
      });
    }
  };

  // ZOMBIE EXPLOSION TRIGGER
  const triggerZombieExplosion = (zombie: Zombie) => {
    zombie.hp = 0; // kill it
    handleZombieKill(zombie);

    playSound('explode');
    screenShake.current = 15;

    // spawn visual particles
    particles.current.push({
      id: `explosion_ring_${Date.now()}_${Math.random()}`,
      x: zombie.x,
      y: zombie.y,
      vx: 0,
      vy: 0,
      color: '#ea580c',
      size: 60,
      alpha: 1,
      decay: 0.04,
      life: 0,
      maxLife: 25,
      type: 'explosion_ring',
    });
    createSparks(zombie.x, zombie.y, '#f97316', 15);

    // Damage checking on surrounding objects
    const player = playerRef.current;
    const base = baseRef.current;

    // Player
    if (checkCircleCollision(zombie.x, zombie.y, 65, player.x, player.y, 12)) {
      if (!isDashing.current) {
        const armorReduction = 1 - (player.armor / 100);
        setPlayerStats((prev) => ({
          ...prev,
          hp: Math.max(0, prev.hp - 35 * armorReduction),
        }));
        createBlood(player.x, player.y, '#ef4444', 8);
        if (player.hp <= 0) {
          onGameOver('player_died');
        }
      }
    }

    // Soldiers
    soldiers.current.forEach((s) => {
      if (s.state === 'trapped') return;
      if (checkCircleCollision(zombie.x, zombie.y, 65, s.x, s.y, 10)) {
        s.hp -= 35;
        createBlood(s.x, s.y, '#ef4444', 6);
      }
    });

    // Base
    if (checkCircleCollision(zombie.x, zombie.y, 65, BASE_X, BASE_Y, base.size)) {
      setBaseCore((prev) => ({
        ...prev,
        hp: Math.max(0, prev.hp - 50),
      }));
      createSparks(BASE_X, BASE_Y, '#f1f5f9', 10);
      if (baseRef.current.hp <= 0) {
        onGameOver('base_destroyed');
      }
    }

    // Walls
    walls.current.forEach((w) => {
      const bx = Math.abs(zombie.x - w.x) < (w.width / 2 + 65);
      const by = Math.abs(zombie.y - w.y) < (w.height / 2 + 65);
      if (bx && by) {
        w.hp -= 80;
        createSparks(w.x, w.y, w.color, 4);
      }
    });
  };

  // WAVE GENERATOR & GAME TIMERS
  useEffect(() => {
    const mainTimer = setInterval(() => {
      if (isUpgradeMenuOpen) return;

      // Survival Layer ticks (Hunger & Thirst)
      if (isSurvivalMode) {
        setPlayerStats((prev) => {
          const hungerRate = 0.22;
          let thirstRate = 0.32;
          if (season === 'summer') {
            thirstRate *= 1.5;
          }
          const nextHunger = Math.max(0, prev.hunger - hungerRate);
          const nextThirst = Math.max(0, prev.thirst - thirstRate);
          
          let hpDamage = 0;
          if (nextHunger <= 0) hpDamage += 1.5;
          if (nextThirst <= 0) hpDamage += 2.0;
          
          let nextHp = prev.hp;
          if (hpDamage > 0) {
            nextHp = Math.max(0, prev.hp - hpDamage);
            playerHitFlashTimer.current = 100; // brief flash for starvation/dehydration
          }
          return {
            ...prev,
            hunger: nextHunger,
            thirst: nextThirst,
            hp: nextHp,
          };
        });
      }

      // Handle Helicopter Rescue countdown
      if (hasRadioedChopper.current && chopperTimer.current > 0) {
        chopperTimer.current -= 1;
        if (chopperTimer.current === 0) {
          chopperArrived.current = true;
          playSound('day_break');
          screenShake.current = 20;
        }
      }

      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Toggle Time of Day!
          if (timeOfDay === 'day') {
            // Day ends, Transition to Night Wave
            setTimeOfDay('night');
            const nextWave = wave + 1;
            setWave(nextWave);
            
            // Handle Horde Night (every 3rd wave)
            isHordeNight.current = nextWave % 3 === 0;

            // Scale zombie horde based on next wave
            let baseSpawnCount = 15 + nextWave * 8;
            if (nextWave === 1) {
              baseSpawnCount = 6; // tutorial soft wave 1
            } else if (nextWave === 2) {
              baseSpawnCount = 11; // tutorial soft wave 2
            }

            if (isHordeNight.current && nextWave > 2) {
              baseSpawnCount = Math.floor(baseSpawnCount * 1.8);
            }

            // Adjust by Difficulty
            if (gameDifficulty === 'easy') {
              baseSpawnCount = Math.max(4, Math.floor(baseSpawnCount * 0.7));
            } else if (gameDifficulty === 'hard') {
              baseSpawnCount = Math.floor(baseSpawnCount * 1.35);
            }

            maxZombiesToSpawnThisNight.current = baseSpawnCount;
            setTotalZombiesInWave(maxZombiesToSpawnThisNight.current);
            setZombieCount(0);
            zombiesSpawnedCount.current = 0;
            currentWaveZombiesKilledInNight.current = 0;
            
            // Radio chopper at wave 10
            if (nextWave === 10) {
              hasRadioedChopper.current = true;
              chopperTimer.current = 60;
            }

            playSound('night_fall');
            screenShake.current = 10;
            return 120; // 120s night wave duration
          } else {
            // Night Wave ends, Day Breaks!
            setTimeOfDay('day');
            
            // Randomize weather at Day Break
            const rand = Math.random();
            if (rand < 0.20) {
              currentWeather.current = 'fog';
            } else if (rand < 0.40) {
              currentWeather.current = 'rain';
            } else {
              currentWeather.current = 'clear';
            }

            // Clean remaining zombies
            zombies.current = [];
            setZombieCount(0);
            
            // Reward for survival!
            let rewardCoins = 80 + wave * 40;
            if (gameDifficulty === 'easy') {
              rewardCoins = Math.floor(rewardCoins * 1.2);
            } else if (gameDifficulty === 'hard') {
              rewardCoins = Math.floor(rewardCoins * 0.8);
            }

            setPlayerStats((prev) => ({
              ...prev,
              coins: prev.coins + rewardCoins,
              xp: prev.xp + 40 + wave * 10,
            }));

            // Repopulate scavenge trees/metal nodes so world is rich again
            spawnScavengeNodes(25);
            
            // Auto repair base core for 15% on day break
            setBaseCore((prev) => ({
              ...prev,
              hp: Math.min(prev.maxHp, prev.hp + Math.floor(prev.maxHp * 0.15)),
            }));

            // Spawn 1 random cage crate
            spawnCrate('soldier_cage');

            playSound('day_break');
            return 60; // 60s day cycle
          }
        }
        return prev - 1;
      });

    }, 1000);

    return () => clearInterval(mainTimer);
  }, [timeOfDay, wave, isUpgradeMenuOpen, upgrades, gameDifficulty]);

  // CORE GAMEPLAY PHYSICS AND DRAWING LOOP (60 FPS)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (!isUpgradeMenuOpen) {
        updateGame(dt);
      }
      renderGame();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [timeOfDay, isUpgradeMenuOpen]);

  // RENDER THE FULL GAME WORLD ON CANVAS
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const player = playerRef.current;
    const base = baseRef.current;

    // Viewport resizing logic
    const parent = containerRef.current;
    if (parent) {
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    // Camera setup following player smoothly
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    ctx.save();
    
    // Apply screen shake
    if (screenShake.current > 0.1) {
      const shakeX = (Math.random() - 0.5) * screenShake.current;
      const shakeY = (Math.random() - 0.5) * screenShake.current;
      ctx.translate(shakeX, shakeY);
      screenShake.current *= 0.9; // decay
    }

    // Centered camera offset
    ctx.translate(cx - player.x, cy - player.y);

    // 1. DRAW MAP BACKGROUND
    let bgFillStyle = '#0f172a'; // dark steel gray grid background
    let bgStrokeStyle = '#1e293b';
    if (season === 'spring') {
      bgFillStyle = '#0b1f19'; // soft deep emerald
      bgStrokeStyle = '#133d32';
    } else if (season === 'summer') {
      bgFillStyle = '#1f130d'; // dry dusty brown
      bgStrokeStyle = '#3a2012';
    } else if (season === 'autumn') {
      bgFillStyle = '#1f1105'; // warm golden leaf background
      bgStrokeStyle = '#3d1d03';
    } else if (season === 'winter') {
      bgFillStyle = '#0f1d2f'; // snowy icy blue-grey
      bgStrokeStyle = '#1c3453';
    }

    ctx.fillStyle = bgFillStyle;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Draw grid lines
    ctx.strokeStyle = bgStrokeStyle;
    ctx.lineWidth = 1.5;
    const gridSize = 80;
    
    ctx.beginPath();
    for (let x = 0; x <= MAP_WIDTH; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, MAP_HEIGHT);
    }
    for (let y = 0; y <= MAP_HEIGHT; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(MAP_WIDTH, y);
    }
    ctx.stroke();

    // Map boundaries glow red
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // 2. DRAW CENTRAL BASE SHELTER / BASE CORE COMMAND CENTER
    const glowRad = base.size + 15 + Math.sin(Date.now() * 0.005) * 5;
    const grad = ctx.createRadialGradient(base.x, base.y, base.size - 10, base.x, base.y, glowRad);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(0.5, '#ef444422');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(base.x, base.y, glowRad, 0, Math.PI * 2);
    ctx.fill();

    // Base core central structure
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(base.x, base.y, base.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Metallic panel lines
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(base.x - base.size, base.y);
    ctx.lineTo(base.x + base.size, base.y);
    ctx.moveTo(base.x, base.y - base.size);
    ctx.lineTo(base.x, base.y + base.size);
    ctx.stroke();

    // Energy core glowing element at very center
    ctx.fillStyle = base.hp < base.maxHp * 0.35 ? '#ef4444' : '#60a5fa';
    ctx.beginPath();
    ctx.arc(base.x, base.y, 16 + Math.sin(Date.now() * 0.01) * 3, 0, Math.PI * 2);
    ctx.fill();

    // Health ring
    ctx.strokeStyle = base.hp < base.maxHp * 0.35 ? '#f87171' : '#10b981';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(base.x, base.y, base.size - 10, 0, (Math.PI * 2) * (base.hp / base.maxHp));
    ctx.stroke();

    // DRAW CRAFTING BENCH at (BASE_X, BASE_Y - 70)
    const benchX = BASE_X;
    const benchY = BASE_Y - 70;
    const isPlayerNearBench = Math.hypot(player.x - benchX, player.y - benchY) < 80;
    
    ctx.save();
    ctx.translate(benchX, benchY);
    // Draw Bench table shadow
    ctx.fillStyle = 'rgba(2, 6, 17, 0.5)';
    ctx.fillRect(-22, -10, 44, 20);
    // Draw wood table top
    ctx.fillStyle = '#b45309'; // warm amber brown
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-20, -8, 40, 16);
    ctx.strokeRect(-20, -8, 40, 16);
    // Metallic vice clamp details on the bench
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-12, -4, 5, 3);
    // Glowing neon blueprints
    ctx.fillStyle = 'rgba(56, 189, 248, 0.75)'; // cyan blueprint paper
    ctx.fillRect(4, -3, 10, 7);
    
    // Help Tooltip label
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BENCH', 0, 3);

    if (isPlayerNearBench) {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.fillRect(-50, -28, 100, 14);
      ctx.strokeRect(-50, -28, 100, 14);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('Press [F] to Craft', 0, -18);
    }
    ctx.restore();

    // 3. DRAW BUILD SPOTS AND STRUCTURES
    buildSpots.current.forEach((spot) => {
      // Draw spot marker
      const isPlayerNear = Math.hypot(player.x - spot.x, player.y - spot.y) < 75;

      ctx.save();
      ctx.translate(spot.x, spot.y);

      if (spot.type === 'empty') {
        // glowing build bracket
        ctx.strokeStyle = isPlayerNear ? '#fbbf24' : '#475569';
        ctx.lineWidth = isPlayerNear ? 3 : 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // plus icon in middle
        ctx.fillStyle = isPlayerNear ? '#fbbf24' : '#475569';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', 0, 0);

        if (isPlayerNear) {
          // interact tooltip
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1;
          ctx.fillRect(-60, -42, 120, 18);
          ctx.strokeRect(-60, -42, 120, 18);
          
          ctx.fillStyle = '#fbbf24';
          ctx.font = '9px monospace';
          ctx.fillText('E - WALL [12🪵, 6⚙️]', 0, -32);
        }
      }
      ctx.restore();
    });

    // DRAW WALLS
    walls.current.forEach((wall) => {
      ctx.save();
      ctx.translate(wall.x, wall.y);
      
      // Draw wall shadow
      ctx.fillStyle = '#02061766';
      ctx.fillRect(-wall.width / 2 + 5, -wall.height / 2 + 5, wall.width, wall.height);

      // Material color
      ctx.fillStyle = wall.material === 'wood' ? '#78350f' : wall.material === 'scrap' ? '#475569' : '#0f172a';
      ctx.strokeStyle = wall.material === 'wood' ? '#b45309' : wall.material === 'scrap' ? '#94a3b8' : '#334155';
      ctx.lineWidth = 2.5;
      
      ctx.fillRect(-wall.width / 2, -wall.height / 2, wall.width, wall.height);
      ctx.strokeRect(-wall.width / 2, -wall.height / 2, wall.width, wall.height);

      // Cracks if damaged
      if (wall.hp < wall.maxHp) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-wall.width / 2, -wall.height / 4);
        ctx.lineTo(wall.width / 2, wall.height / 4);
        ctx.stroke();
      }

      // Draw short HP bar if hovered or damaged
      const wallHpPct = wall.hp / wall.maxHp;
      if (wallHpPct < 1) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-20, -wall.height / 2 - 10, 40, 4);
        ctx.fillStyle = wallHpPct < 0.3 ? '#ef4444' : '#fbbf24';
        ctx.fillRect(-20, -wall.height / 2 - 10, 40 * wallHpPct, 4);
      }

      // Show Repair/Upgrade option if player is very close
      const dist = Math.hypot(player.x - wall.x, player.y - wall.y);
      if (dist < 75) {
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1;
        ctx.fillRect(-65, -wall.height / 2 - 30, 130, 18);
        ctx.strokeRect(-65, -wall.height / 2 - 30, 130, 18);

        ctx.fillStyle = '#eab308';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        
        if (wallHpPct < 1) {
          ctx.fillText('E - REPAIR [2🪵, 2⚙️]', 0, -wall.height / 2 - 19);
        } else {
          ctx.fillText('E - TURRET [10🪵, 15⚙️, $120]', 0, -wall.height / 2 - 19);
        }
      }

      ctx.restore();
    });

    // DRAW TURRETS
    turrets.current.forEach((turret) => {
      ctx.save();
      ctx.translate(turret.x, turret.y);

      // Base circle
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Laser scanner direction indicator
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(turret.angle) * turret.range, Math.sin(turret.angle) * turret.range);
      ctx.stroke();

      // Rotating gun barrel
      ctx.rotate(turret.angle);
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.5;
      // barrel rectangles
      ctx.fillRect(0, -4, 18, 8);
      ctx.strokeRect(0, -4, 18, 8);
      ctx.restore();

      // Level indicator dots
      ctx.fillStyle = '#eab308';
      for (let i = 0; i < turret.level; i++) {
        ctx.beginPath();
        ctx.arc(-10 + i * 7, 24, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Repair option if damaged
      const turretHpPct = turret.hp / turret.maxHp;
      if (turretHpPct < 1) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-20, -28, 40, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-20, -28, 40 * turretHpPct, 4);
      }

      // Upgrade option if player is close
      const dist = Math.hypot(player.x - turret.x, player.y - turret.y);
      if (dist < 75) {
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.fillRect(-65, -46, 130, 18);
        ctx.strokeRect(-65, -46, 130, 18);

        ctx.fillStyle = '#60a5fa';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        if (turretHpPct < 1) {
          ctx.fillText('E - REPAIR [4⚙️]', 0, -35);
        } else if (turret.level < 4) {
          ctx.fillText(`E - UPGRADE [lv.${turret.level + 1}: $${turret.upgradeCost}]`, 0, -35);
        } else {
          ctx.fillText('MAX LEVEL reached', 0, -35);
        }
      }
    });

    // 4. DRAW COINS, CRATES & SCAVENGE NODES
    crates.current.forEach((crate) => {
      if (crate.looted) return;

      // glowing aura around cage or health box
      const pulseSize = crate.size + Math.sin(Date.now() * 0.006) * 3;
      ctx.fillStyle = `${crate.color}22`;
      ctx.beginPath();
      ctx.arc(crate.x, crate.y, pulseSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(crate.x, crate.y);

      // Cage details
      if (crate.type === 'soldier_cage') {
        ctx.fillStyle = '#3b0764'; // dark purple
        ctx.strokeStyle = crate.color;
        ctx.lineWidth = 3;
        ctx.fillRect(-crate.size / 2, -crate.size / 2, crate.size, crate.size);
        ctx.strokeRect(-crate.size / 2, -crate.size / 2, crate.size, crate.size);

        // draw iron bars
        ctx.strokeStyle = '#e9d5ff';
        ctx.lineWidth = 2.5;
        for (let xOffset = -8; xOffset <= 8; xOffset += 8) {
          ctx.beginPath();
          ctx.moveTo(xOffset, -crate.size / 2);
          ctx.lineTo(xOffset, crate.size / 2);
          ctx.stroke();
        }

        // Cage Health
        if (crate.soldierInside && crate.soldierInside.cageHp! < 80) {
          const hpPct = crate.soldierInside.cageHp! / 80;
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-15, -crate.size / 2 - 12, 30 * hpPct, 3);
        }

        // Mini cage label
        ctx.fillStyle = '#e9d5ff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PRISONER', 0, crate.size / 2 + 10);
      } else {
        // Standard Scavenge Resource Box
        ctx.fillStyle = crate.color;
        ctx.fillRect(-crate.size / 2, -crate.size / 2, crate.size, crate.size);
        ctx.strokeStyle = '#ffffffaa';
        ctx.lineWidth = 1;
        ctx.strokeRect(-crate.size / 2, -crate.size / 2, crate.size, crate.size);

        // Label initials
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const letter = crate.type === 'wood' ? '🪵' : crate.type === 'scrap' ? '⚙️' : crate.type === 'health' ? '❤️' : '⚡';
        ctx.fillText(letter, 0, 0);
      }

      ctx.restore();
    });

    // 5. DRAW RESCUED SOLDIER ALLIES
    soldiers.current.forEach((soldier) => {
      ctx.save();
      ctx.translate(soldier.x, soldier.y);

      // allied glowing indicator circle under feet
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();

      ctx.rotate(soldier.angle);

      // Draw soldier torso (deep blue/military green)
      ctx.fillStyle = '#1e3a8a'; // military blue uniform
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      // Hands carrying rifle/pistol
      ctx.fillStyle = '#facc15'; // yellow skin
      ctx.beginPath();
      ctx.arc(6, -8, 3, 0, Math.PI * 2);
      ctx.arc(6, 8, 3, 0, Math.PI * 2);
      ctx.fill();

      // Gun weapon barrel barrel
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(5, -2, 12, 4);

      ctx.restore();

      // HP bar for soldier
      const hpPct = soldier.hp / soldier.maxHp;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(soldier.x - 12, soldier.y - 18, 24, 3);
      ctx.fillStyle = '#818cf8';
      ctx.fillRect(soldier.x - 12, soldier.y - 18, 24 * hpPct, 3);
    });

    // 5B. DRAW TRAVELING MERCHANT
    if (merchantActive.current && timeOfDay === 'day') {
      const merX = merchantPos.current.x;
      const merY = merchantPos.current.y;
      
      ctx.save();
      ctx.translate(merX, merY);

      // merchant golden aura ring
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();

      // Body (brown merchant traveling cloak)
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();

      // Backpack (brown wood rectangle)
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-15, -6, 5, 12);

      // Gold wide-brimmed merchant hat
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Hat brim line
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 10, -Math.PI, 0);
      ctx.stroke();

      // Hands counting gold coins
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(6, -6, 2.5, 0, Math.PI * 2);
      ctx.arc(6, 6, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Merchant label & coin sign above head
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🛒 MERCHANT', merX, merY - 24);
      
      const player = playerRef.current;
      const distToMerchant = Math.hypot(player.x - merX, player.y - merY);
      if (distToMerchant < 65) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('[E] TRADE', merX, merY - 14);
      }
    }

    // 5C. DRAW SCATTERED DIARY PAGES
    spawnedLogs.current.forEach((log) => {
      if (!log.collected) {
        ctx.save();
        ctx.translate(log.x, log.y);
        
        // subtle sky blue pulsing aura
        const diaryPulse = 9 + Math.sin(Date.now() * 0.006) * 2;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, diaryPulse + 3, 0, Math.PI * 2);
        ctx.fill();

        // Diary pages
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-5, -7, 10, 14);
        ctx.strokeRect(-5, -7, 10, 14);

        // tiny page text lines
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-2, -3); ctx.lineTo(2, -3);
        ctx.moveTo(-2, 0); ctx.lineTo(2, 0);
        ctx.moveTo(-2, 3); ctx.lineTo(1, 3);
        ctx.stroke();

        ctx.restore();

        // label
        ctx.fillStyle = '#38bdf8';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('📓 DIARY PAGE', log.x, log.y - 12);
      }
    });

    // 6. DRAW ZOMBIES
    zombies.current.forEach((zombie) => {
      ctx.save();
      ctx.translate(zombie.x, zombie.y);
      ctx.rotate(zombie.angle);

      // Glow effect for bosses or status effects
      if (zombie.type === 'boss') {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#c084fc';
      } else if (zombie.freezeTimer && zombie.freezeTimer > 0) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#06b6d4';
      } else if (zombie.burnTimer && zombie.burnTimer > 0) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#f97316';
      }

      // Draw main body circle
      ctx.fillStyle = zombie.color;
      ctx.beginPath();
      ctx.arc(0, 0, zombie.size, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadows for details
      ctx.shadowBlur = 0;

      // Custom accessories/drawings per Type
      if (zombie.isRaider) {
        // Draw human-like red bandana band across forehead
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(zombie.size - 6, -zombie.size + 1, 3, zombie.size * 2 - 2);

        // Draw human slate-blue eyes (not glowing red)
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(zombie.size - 5, -3, 1.8, 0, Math.PI * 2);
        ctx.arc(zombie.size - 5, 3, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Draw tactical raider gun barrel extending forward
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(zombie.size - 2, -2, 10, 4);
      } else {
        // Glowing feral Red Zombie eyes (or purple-white for boss)
        ctx.fillStyle = zombie.type === 'boss' ? '#e9d5ff' : '#ef4444';
        ctx.beginPath();
        ctx.arc(zombie.size - 4, -4, zombie.type === 'boss' ? 4 : 2, 0, Math.PI * 2);
        ctx.arc(zombie.size - 4, 4, zombie.type === 'boss' ? 4 : 2, 0, Math.PI * 2);
        ctx.fill();

        // Arms and decorations matching classification
        ctx.fillStyle = zombie.color;
        if (zombie.type === 'tank') {
          // Extra heavy brute arms
          ctx.fillRect(zombie.size - 2, -8, 10, 5);
          ctx.fillRect(zombie.size - 2, 3, 10, 5);
          
          // Draw armored crimson bone spikes on back
          ctx.fillStyle = '#7f1d1d';
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(-zombie.size + 2, i * 4);
            ctx.lineTo(-zombie.size - 4, i * 4 - 2);
            ctx.lineTo(-zombie.size - 2, i * 4 - 4);
            ctx.fill();
          }
        } else if (zombie.type === 'exploding') {
          // Orange bomb vest with hazard ticking core
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-6, -zombie.size + 1, 12, zombie.size * 2 - 2);
          ctx.fillStyle = '#1e293b'; // black straps/wiring
          ctx.fillRect(-2, -zombie.size + 2, 4, zombie.size * 2 - 4);
          
          // Flash lamp
          ctx.fillStyle = (Math.floor(Date.now() / 250) % 2 === 0) ? '#facc15' : '#7f1d1d';
          ctx.beginPath();
          ctx.arc(0, 0, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (zombie.type === 'spitter') {
          // Acid chemical glands on spitter's back
          ctx.fillStyle = '#4d7c0f';
          ctx.beginPath();
          ctx.arc(-4, 0, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#a3e635'; // glowing slime center
          ctx.beginPath();
          ctx.arc(-4, 0, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (zombie.type === 'boss') {
          // Obsidian crown spikes for boss
          ctx.fillStyle = '#581c87';
          for (let angleOff = -1; angleOff <= 1; angleOff += 0.5) {
            const crownX = Math.cos(angleOff) * -zombie.size;
            const crownY = Math.sin(angleOff) * -zombie.size;
            ctx.beginPath();
            ctx.moveTo(crownX, crownY);
            ctx.lineTo(crownX - 8, crownY - 6);
            ctx.lineTo(crownX - 4, crownY + 4);
            ctx.fill();
          }
        } else {
          // Standard walkers/runners arms
          ctx.fillRect(zombie.size - 2, -6, 8, 3);
          ctx.fillRect(zombie.size - 2, 3, 8, 3);
        }
      }

      // Freeze ice overlay coating
      if (zombie.freezeTimer && zombie.freezeTimer > 0) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, zombie.size + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // White hit flash overlay
      if (zombie.hitFlashTimer && zombie.hitFlashTimer > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.arc(0, 0, zombie.size + 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // HP bar for tougher zombies / raiders
      if (zombie.hp < zombie.maxHp) {
        const hpPct = zombie.hp / zombie.maxHp;
        ctx.fillStyle = '#020617';
        ctx.fillRect(zombie.x - 12, zombie.y - zombie.size - 8, 24, 3.5);
        ctx.fillStyle = zombie.isRaider ? '#38bdf8' : '#ef4444'; // blue HP for human raiders
        ctx.fillRect(zombie.x - 12, zombie.y - zombie.size - 8, 24 * hpPct, 3.5);
      }
    });

    // 7. DRAW BULLETS & RANGED ACID SPITS
    bullets.current.forEach((bullet) => {
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
      ctx.fill();

      // glowing fire trail
      ctx.fillStyle = `${bullet.color}44`;
      ctx.beginPath();
      ctx.arc(bullet.x - bullet.vx * 0.05, bullet.y - bullet.vy * 0.05, bullet.size * 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 7.5 DRAW DASH TRAIL GHOSTS
    dashTrailParticles.current.forEach((trail) => {
      ctx.save();
      ctx.translate(trail.x, trail.y);
      ctx.rotate(trail.angle);

      // Draw semi-transparent body outline
      ctx.fillStyle = `rgba(15, 118, 110, ${trail.alpha * 0.45})`;
      ctx.beginPath();
      ctx.arc(0, 0, 11.5, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = `rgba(254, 240, 138, ${trail.alpha * 0.45})`;
      ctx.beginPath();
      ctx.arc(-2, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // 8. DRAW PLAYER CHARACTER
    ctx.save();
    ctx.translate(player.x, player.y);
    
    // Sprint Stamina particle ring
    if (player.isSprinting && player.stamina > 10) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.rotate(player.angle);

    // Player body
    ctx.fillStyle = player.outfitColor || '#0f766e'; // Custom outfit color
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    // Player head skin tone
    ctx.fillStyle = '#fef08a'; // yellow skin tone
    ctx.beginPath();
    ctx.arc(-2, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    // Draw Custom Headgear if selected
    if (player.headgear && player.headgear !== 'none') {
      if (player.headgear === 'helmet') {
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(-2, 0, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-2, 0, 8.5, -Math.PI * 0.3, Math.PI * 0.3);
        ctx.stroke();
      } else if (player.headgear === 'bandana') {
        ctx.fillStyle = '#dc2626'; // combat red bandana
        ctx.fillRect(-5, -7.5, 3, 15);
      } else if (player.headgear === 'hood') {
        ctx.fillStyle = '#1e293b'; // dark rogue hood
        ctx.beginPath();
        ctx.arc(-3, 0, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a'; // hood interior shadows
        ctx.beginPath();
        ctx.arc(-1, 0, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a'; // face inside
        ctx.beginPath();
        ctx.arc(-1, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (player.headgear === 'cap') {
        ctx.fillStyle = '#1d4ed8'; // baseball cap
        ctx.beginPath();
        ctx.arc(-3, 0, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e40af'; // cap bill
        ctx.fillRect(2.5, -4, 5, 8);
      }
    }

    // Hands
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(8, -8, 3.5, 0, Math.PI * 2);
    ctx.arc(8, 8, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Weapon representation based on active index
    ctx.fillStyle = weaponsRef.current[activeWeaponIndex.current]?.color || '#94a3b8';
    if (activeWeaponIndex.current === 1) {
      // Melee Swing Axe
      ctx.fillRect(5, -4, 4, 8);
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(8, -6);
      ctx.lineTo(14, -12);
      ctx.lineTo(14, 0);
      ctx.fill();
    } else {
      // Firearms barrel size
      const barrelLength = activeWeaponIndex.current === 0 ? 10 : activeWeaponIndex.current === 2 ? 14 : 18;
      ctx.fillRect(8, -3, barrelLength, 6);
    }

    ctx.restore();

    // Melee attack sweep arc drawing
    if (player.isMeleeAttacking) {
      ctx.save();
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.45)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 40, player.angle - 0.9, player.angle + 0.9);
      ctx.stroke();
      ctx.restore();
    }

    // 9. DRAW DUST & EXPLOSIVE PARTICLES
    particles.current.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      if (p.type === 'text') {
        ctx.fillStyle = p.color;
        ctx.font = `bold ${p.size}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(p.text || '', p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // 10. LIGHTING SYSTEM & FLASH LIGHT OF SURVIVAL
    // Smooth transition darkness overlay based on time of day
    if (timeOfDayOpacity.current > 0.02) {
      ctx.restore(); // temporary clear centered camera to cover entire viewport

      ctx.save();
      // Draw standard black night dark sheet with dynamic opacity
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = canvas.width;
      offscreenCanvas.height = canvas.height;
      const offCtx = offscreenCanvas.getContext('2d')!;

      offCtx.fillStyle = `rgba(3, 7, 18, ${timeOfDayOpacity.current})`; // smooth sunset/dawn ambient transition
      offCtx.fillRect(0, 0, canvas.width, canvas.height);

      // Change composition to erase parts of the darkness mask
      offCtx.globalCompositeOperation = 'destination-out';

      // Draw dynamic radial gradient flashlight cone originating at player relative screen position
      const pScreenX = player.x + (cx - player.x);
      const pScreenY = player.y + (cy - player.y);

      // Flashlight spot cone
      const flashGrad = offCtx.createRadialGradient(pScreenX, pScreenY, 20, pScreenX, pScreenY, 180);
      flashGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      flashGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
      flashGrad.addColorStop(1, 'transparent');
      
      offCtx.fillStyle = flashGrad;
      offCtx.beginPath();
      offCtx.arc(pScreenX, pScreenY, 180, 0, Math.PI * 2);
      offCtx.fill();

      // Glowing dome around Base Command center screen position
      const baseScreenX = base.x + (cx - player.x);
      const baseScreenY = base.y + (cy - player.y);
      const baseGrad = offCtx.createRadialGradient(baseScreenX, baseScreenY, 50, baseScreenX, baseScreenY, 320);
      baseGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      baseGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)');
      baseGrad.addColorStop(1, 'transparent');
      offCtx.fillStyle = baseGrad;
      offCtx.beginPath();
      offCtx.arc(baseScreenX, baseScreenY, 320, 0, Math.PI * 2);
      offCtx.fill();

      // Glowing radius around active Turrets
      turrets.current.forEach((t) => {
        const tX = t.x + (cx - player.x);
        const tY = t.y + (cy - player.y);
        const turretGrad = offCtx.createRadialGradient(tX, tY, 10, tX, tY, 80);
        turretGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        turretGrad.addColorStop(1, 'transparent');
        offCtx.fillStyle = turretGrad;
        offCtx.beginPath();
        offCtx.arc(tX, tY, 80, 0, Math.PI * 2);
        offCtx.fill();
      });

      // Render darkness mask layer on top of final viewport!
      ctx.drawImage(offscreenCanvas, 0, 0);
      ctx.restore();
    } else {
      ctx.restore(); // restore from camera shift
    }

    // --- ABSOLUTE SCREEN COORDINATES OVERLAYS ---

    // A. Player Vignette Red Hit-Flash Overlay
    if (playerHitFlashTimer.current > 0) {
      ctx.save();
      const flashAlpha = Math.min(0.35, playerHitFlashTimer.current / 180);
      const vignette = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.35,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.7
      );
      vignette.addColorStop(0, 'transparent');
      vignette.addColorStop(1, `rgba(239, 68, 68, ${flashAlpha})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // B. Base Under Attack Arrow / Side Pointer
    if (baseAttackIndicator.current && baseAttackIndicator.current.timer > 0) {
      const angleToAttack = Math.atan2(BASE_Y - player.y, BASE_X - player.x);
      const distance = Math.hypot(BASE_X - player.x, BASE_Y - player.y);
      const isBaseOffScreen = distance > Math.min(canvas.width, canvas.height) * 0.42;

      ctx.save();
      const pulseAlpha = 0.4 + Math.sin(Date.now() * 0.015) * 0.4;

      if (isBaseOffScreen) {
        // Base is off screen: draw edge pointing arrow from screen center
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(angleToAttack);

        const arrowDist = Math.min(canvas.width, canvas.height) * 0.38;
        ctx.translate(arrowDist, 0);

        // Draw alert arrow
        ctx.fillStyle = `rgba(239, 68, 68, ${pulseAlpha})`;
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, -12);
        ctx.lineTo(-4, -4);
        ctx.lineTo(-25, -4);
        ctx.lineTo(-25, 4);
        ctx.lineTo(-4, 4);
        ctx.lineTo(-10, 12);
        ctx.closePath();
        ctx.fill();

        // Warning Label Text
        ctx.rotate(-angleToAttack); // upright label
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BASE ATTACKED!', 0, -22);
      } else {
        // Base is on screen: draw flashing damage warning claw right next to base core
        const baseScreenX = BASE_X + (canvas.width / 2 - player.x);
        const baseScreenY = BASE_Y + (canvas.height / 2 - player.y);
        ctx.translate(baseScreenX, baseScreenY);
        ctx.rotate(baseAttackIndicator.current.angle);

        ctx.fillStyle = `rgba(239, 68, 68, ${pulseAlpha})`;
        ctx.beginPath();
        ctx.moveTo(base.size + 42, 0);
        ctx.lineTo(base.size + 18, -10);
        ctx.lineTo(base.size + 24, -3);
        ctx.lineTo(base.size + 6, 0);
        ctx.lineTo(base.size + 24, 3);
        ctx.lineTo(base.size + 18, 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  };

  // UPDATE LOOP FOR ALL ENTITIES & PHYSICS
  const updateGame = (dt: number) => {
    // If Crafting Bench is open, game is paused
    if (isCraftingOpen) return;

    const player = playerRef.current;
    const base = baseRef.current;

    // Check general player death condition
    if (player.hp <= 0) {
      onGameOver('player_died');
      return;
    }

    // Decrement dash cooldown
    if (dashCooldown.current > 0) {
      dashCooldown.current = Math.max(0, dashCooldown.current - dt);
    }

    // A. MOVE PLAYER CHARACTER (WASD + SPRINT or DASH)
    let vx = 0;
    let vy = 0;
    if (keysPressed.current['w'] || keysPressed.current['arrowup']) vy = -1;
    if (keysPressed.current['s'] || keysPressed.current['arrowdown']) vy = 1;
    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) vx = -1;
    if (keysPressed.current['d'] || keysPressed.current['arrowright']) vx = 1;

    // Normalize diagonal speed vector
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    // Handle Active Dash
    if (isDashing.current) {
      dashTimer.current -= dt;
      player.x = Math.max(20, Math.min(MAP_WIDTH - 20, player.x + dashVx.current * dt));
      player.y = Math.max(20, Math.min(MAP_HEIGHT - 20, player.y + dashVy.current * dt));

      // Append beautiful motion trail ghost
      dashTrailParticles.current.push({
        x: player.x,
        y: player.y,
        angle: player.angle,
        alpha: 0.6,
        id: Math.random(),
      });

      // Spawn some dust sparks at player feet
      if (Math.random() < 0.4) {
        particles.current.push({
          id: `dash_dust_${Date.now()}_${Math.random()}`,
          x: player.x,
          y: player.y + 10,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          color: '#cbd5e1',
          size: Math.random() * 3 + 1.5,
          alpha: 0.8,
          decay: 0.05,
          life: 0,
          maxLife: 20,
          type: 'spark',
        });
      }

      if (dashTimer.current <= 0) {
        isDashing.current = false;
      }
    } else {
      // Normal movement (Shift to Sprint)
      const sprintSpeedUpgrade = upgrades.find(u => u.type === 'player_speed')?.level || 0;
      const statSpeed = player.speed + sprintSpeedUpgrade * 0.35;
      
      // Environment slow in rain
      const rainSlow = currentWeather.current === 'rain' ? 0.75 : 1.0;

      // Sprint is now Shift key instead of Spacebar
      const trySprint = keysPressed.current['shift'] && player.stamina > 5 && (vx !== 0 || vy !== 0);
      const finalSpeed = (trySprint ? statSpeed * 1.6 : statSpeed) * rainSlow;

      player.x = Math.max(20, Math.min(MAP_WIDTH - 20, player.x + vx * finalSpeed));
      player.y = Math.max(20, Math.min(MAP_HEIGHT - 20, player.y + vy * finalSpeed));

      // Handle Stamina replenishment / drainage
      if (trySprint) {
        player.stamina = Math.max(0, player.stamina - dt * 25);
        player.isSprinting = true;
      } else {
        const staminaMaxUpgrade = upgrades.find(u => u.type === 'player_stamina')?.level || 0;
        // Winter Frost reduces stamina regeneration by 75% unless the player is close to the warmth of the Base Core (within 250px)
        const isNearCore = Math.hypot(player.x - BASE_X, player.y - BASE_Y) <= 250;
        const winterMultiplier = (season === 'winter' && !isNearCore) ? 0.25 : 1.0;
        player.stamina = Math.min(player.maxStamina + staminaMaxUpgrade * 15, player.stamina + dt * 12 * winterMultiplier);
        player.isSprinting = false;
      }

      // Spacebar triggers Dash/Dodge if ready and has stamina
      if (keysPressed.current[' '] && dashCooldown.current <= 0 && player.stamina >= 25) {
        isDashing.current = true;
        dashTimer.current = 0.18; // 180ms duration
        dashCooldown.current = 1.6; // 1.6s cooldown
        lastDashTime.current = Date.now();
        player.stamina = Math.max(0, player.stamina - 25);

        // Compute dash direction (normalized WASD movement, or pointing to cursor if stationary)
        let dx = vx;
        let dy = vy;
        if (dx === 0 && dy === 0) {
          dx = Math.cos(player.angle);
          dy = Math.sin(player.angle);
        } else {
          const len = Math.hypot(dx, dy);
          dx /= len;
          dy /= len;
        }

        dashVx.current = dx * 550; // 550px/sec velocity
        dashVy.current = dy * 550;

        playSound('dash');

        // Initial burst of dust particles at feet
        createSparks(player.x, player.y, '#94a3b8', 12);
      }
    }

    // Fade out ghost trail particles
    dashTrailParticles.current.forEach((trail) => {
      trail.alpha -= dt * 3.5;
    });
    dashTrailParticles.current = dashTrailParticles.current.filter((trail) => trail.alpha > 0);

    // Sync vital stats (stamina, hp) back to React periodically (every 100ms) to ensure smooth HUD without performance cost
    const nowTimestamp = Date.now();
    if (nowTimestamp - lastStateSyncTime.current >= 100) {
      lastStateSyncTime.current = nowTimestamp;
      setPlayerStats((prev) => ({
        ...prev,
        hp: player.hp,
        stamina: player.stamina,
        maxStamina: player.maxStamina,
        level: player.level,
        xp: player.xp,
        xpNeeded: player.xpNeeded,
      }));
    }

    // Facing rotation directed at cursor relative to player coordinates
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const pScreenX = canvas.width / 2;
      const pScreenY = canvas.height / 2;
      player.angle = Math.atan2(mousePos.current.y - pScreenY, mousePos.current.x - pScreenX);
    }

    // Melee attack logic tracking
    if (player.isMeleeAttacking) {
      player.meleeTimer -= dt * 1000;
      if (player.meleeTimer <= 0) {
        player.isMeleeAttacking = false;
      }
    }

    // B. SHOOT ACTIVE WEAPONS ON LEFT-CLICK
    const currentWeapon = weaponsRef.current[activeWeaponIndex.current];
    if (currentWeapon && mouseClicked.current && !player.isMeleeAttacking) {
      const now = Date.now();
      const fireDelay = currentWeapon.fireRate;

      if (now - lastShotTime.current >= fireDelay) {
        if (currentWeapon.type === 'melee') {
          // Trigger melee weapon swing arc
          player.isMeleeAttacking = true;
          player.meleeTimer = 180; // 180ms swipe visual duration
          lastShotTime.current = now;
          playSound('swing');

          // Melee sweep damage computation
          const strengthUpgrade = upgrades.find(u => u.type === 'melee_damage')?.level || 0;
          const finalMeleeDmg = currentWeapon.damage + strengthUpgrade * 15;

          zombies.current.forEach((z) => {
            const dist = Math.hypot(player.x - z.x, player.y - z.y);
            if (dist < 55) {
              // angle verification
              const angleToZ = Math.atan2(z.y - player.y, z.x - player.x);
              let diff = Math.abs(player.angle - angleToZ);
              if (diff > Math.PI) diff = Math.PI * 2 - diff;

              if (diff < 1.0) {
                // Strike hit!
                let hitDmg = finalMeleeDmg;
                let isCrit = false;
                let isBackAttack = false;
                let isDistanceBonus = false;

                // 1. Melee Crit Calculation
                const critLevel = upgrades.find((u) => u.type === 'crit_chance')?.level || 0;
                let critChance = 0.15 + critLevel * 0.05; // 15% base + 5% per level
                if (currentWeapon.rarity === 'legendary') {
                  critChance += 0.15;
                }
                if (Math.random() < critChance) {
                  isCrit = true;
                  hitDmg *= 2.0;
                }

                // 2. Back Attack Bonus
                const getAngleDiff = (a1: number, a2: number) => {
                  let diff = Math.abs(a1 - a2) % (Math.PI * 2);
                  if (diff > Math.PI) diff = Math.PI * 2 - diff;
                  return diff;
                };
                if (getAngleDiff(z.angle, angleToZ) < 1.1) {
                  isBackAttack = true;
                  const dashedRecently = (Date.now() - lastDashTime.current) < 1200;
                  if (dashedRecently) {
                    hitDmg *= 2.5; // Shadow Strike synergy!
                  } else {
                    hitDmg *= 1.5;
                  }
                }

                // 3. Distance Precision
                if (dist > 220) {
                  isDistanceBonus = true;
                  hitDmg *= 1.4;
                }

                z.hp -= hitDmg;
                z.hitFlashTimer = 110;

                // Add extreme knockback
                z.x += Math.cos(player.angle) * 35;
                z.y += Math.sin(player.angle) * 35;

                createBlood(z.x, z.y, zombieBloodColor(z.type), 8);

                if (isCrit) {
                  createSparks(z.x, z.y, '#eab308', 12);
                  createSparks(z.x, z.y, '#ffffff', 6);
                  playSound('crit');
                } else {
                  playSound('hit_zombie');
                }

                // Floating damage text for melee
                let textStr = `-${Math.round(hitDmg)}`;
                let textColor = '#fca5a5';
                let textSize = 11;

                if (isCrit) {
                  textColor = '#facc15';
                  textSize = 16;
                  textStr = `⭐ CRIT ${textStr}!`;
                }
                if (isBackAttack) {
                  const dashedRecently = (Date.now() - lastDashTime.current) < 1200;
                  if (dashedRecently) {
                    textColor = '#c084fc'; // purple shadow color
                    textStr = `⚡ SHADOW ${textStr}`;
                  } else {
                    if (!isCrit) textColor = '#38bdf8';
                    textStr = `⚡ BACK ${textStr}`;
                  }
                }
                if (isDistanceBonus) {
                  if (!isCrit && !isBackAttack) textColor = '#f43f5e';
                  textStr = `🎯 LONG ${textStr}`;
                }

                particles.current.push({
                  id: `dmg_melee_${Date.now()}_${Math.random()}`,
                  x: z.x + (Math.random() - 0.5) * 16,
                  y: z.y - 12,
                  vx: (Math.random() - 0.5) * 1.2,
                  vy: -1.6,
                  color: textColor,
                  size: textSize,
                  alpha: 1,
                  decay: 0.022,
                  life: 0,
                  maxLife: 45,
                  type: 'text',
                  text: textStr,
                });

                if (z.hp <= 0) {
                  handleZombieKill(z);
                }
              }
            }
          });
        } else {
          // Firearms ammunition ammunition check
          if (currentWeapon.ammo > 0) {
            currentWeapon.ammo -= 1;
            lastShotTime.current = now;
            
            // Apply screen shakes based on firearm power
            screenShake.current = currentWeapon.type === 'shotgun' ? 14 : currentWeapon.type === 'rifle' ? 5 : 3;

            // Generate projectile muzzle spray
            const projectileCount = currentWeapon.projectileCount;
            const reloadSpeedUpgrade = upgrades.find(u => u.type === 'reload_speed')?.level || 0;
            const finalDmg = currentWeapon.damage + (currentWeapon.level - 1) * 4;

            for (let i = 0; i < projectileCount; i++) {
              const bulletAngle = player.angle + (Math.random() - 0.5) * currentWeapon.spread;
              const vx = Math.cos(bulletAngle) * currentWeapon.bulletSpeed;
              const vy = Math.sin(bulletAngle) * currentWeapon.bulletSpeed;

              bullets.current.push({
                id: `bullet_${Date.now()}_${Math.random()}`,
                x: player.x + Math.cos(player.angle) * 16,
                y: player.y + Math.sin(player.angle) * 16,
                vx,
                vy,
                damage: finalDmg,
                range: currentWeapon.type === 'shotgun' ? 180 : 600,
                distanceTraveled: 0,
                source: 'player',
                size: currentWeapon.type === 'shotgun' ? 3.5 : 2.5,
                color: currentWeapon.specialEffect === 'burn' ? '#f97316' : currentWeapon.specialEffect === 'freeze' ? '#38bdf8' : currentWeapon.specialEffect === 'explode' ? '#ef4444' : '#facc15',
                rarity: currentWeapon.rarity,
                specialEffect: currentWeapon.specialEffect,
              });
            }

            // Sound Synth play
            if (currentWeapon.type === 'pistol') playSound('shoot_pistol');
            if (currentWeapon.type === 'shotgun') playSound('shoot_shotgun');
            if (currentWeapon.type === 'rifle') playSound('shoot_rifle');
          } else {
            // Play empty click and trigger automatic reload
            playSound('empty_click');
            triggerWeaponReload(currentWeapon);
          }
        }
      }
    }

    // Auto Reload tracker updates
    if (isReloading.current) {
      reloadTimer.current -= dt * 1000;
      if (reloadTimer.current <= 0) {
        isReloading.current = false;
        currentWeapon.ammo = currentWeapon.maxAmmo;
        playSound('repair'); // mechanical lock sound
      }
    }

    // Decay custom timers for visuals and warnings
    if (playerHitFlashTimer.current > 0) {
      playerHitFlashTimer.current = Math.max(0, playerHitFlashTimer.current - dt * 1000);
    }
    if (baseAttackIndicator.current && baseAttackIndicator.current.timer > 0) {
      baseAttackIndicator.current.timer = Math.max(0, baseAttackIndicator.current.timer - dt * 1000);
    }

    // Smooth transition of night-time dimming vignette
    const targetOpacity = timeOfDay === 'night' ? 0.92 : 0.0;
    timeOfDayOpacity.current += (targetOpacity - timeOfDayOpacity.current) * dt * 2.5;

    // Periodic low HP warning sound cue (if below 25%)
    const pStats = playerRef.current;
    const bCore = baseRef.current;
    if (pStats.hp > 0 && bCore.hp > 0) {
      const playerHpPct = pStats.hp / pStats.maxHp;
      const baseHpPct = bCore.hp / bCore.maxHp;
      if (playerHpPct < 0.25 || baseHpPct < 0.25) {
        alarmTimer.current -= dt * 1000;
        if (alarmTimer.current <= 0) {
          alarmTimer.current = 1500; // warning sound every 1.5s
          playSound('low_health_alert');
        }
      }
    }

    // C. UPDATE PROJECTILES PHYSICS & TRAJECTORY
    bullets.current.forEach((bullet) => {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      
      const speed = Math.hypot(bullet.vx, bullet.vy);
      bullet.distanceTraveled += speed * dt;

      // Grenade fuse timer detonation
      if (bullet.id.startsWith('grenade_') && bullet.distanceTraveled >= bullet.range) {
        playSound('explode');
        screenShake.current = 15;
        
        // Spawn explosion ring particle
        particles.current.push({
          id: `explosion_ring_${Date.now()}_${Math.random()}`,
          x: bullet.x,
          y: bullet.y,
          vx: 0,
          vy: 0,
          color: '#ea580c',
          size: 75,
          alpha: 1,
          decay: 0.03,
          life: 0,
          maxLife: 30,
          type: 'explosion_ring',
        });
        createSparks(bullet.x, bullet.y, '#f59e0b', 25);

        // Deal AOE blast damage to nearby zombies
        zombies.current.forEach((z) => {
          const blastDist = Math.hypot(z.x - bullet.x, z.y - bullet.y);
          if (blastDist < 90) {
            const falloff = 1 - (blastDist / 90);
            z.hp -= bullet.damage * falloff;
            createBlood(z.x, z.y, zombieBloodColor(z.type), 8);
            if (z.hp <= 0) {
              handleZombieKill(z);
            }
          }
        });
      }
    });

    // Clean aged or out of range bullets
    bullets.current = bullets.current.filter((b) => b.distanceTraveled < b.range);

    // D. TURRET TARGETING & AUTOMATIC ENGAGEMENT
    turrets.current.forEach((turret) => {
      // Find closest zombie in sight radius
      let closestZ: Zombie | null = null;
      let minDist = turret.range;

      zombies.current.forEach((z) => {
        const d = Math.hypot(turret.x - z.x, turret.y - z.y);
        if (d < minDist) {
          minDist = d;
          closestZ = z;
        }
      });

      if (closestZ) {
        const target: Zombie = closestZ;
        // Lock turret rotation facing zombie
        turret.angle = Math.atan2(target.y - turret.y, target.x - turret.x);

        const now = Date.now();
        if (now - turret.lastShotTime >= turret.fireRate) {
          turret.lastShotTime = now;
          
          // Fire auto turret bullet
          const vx = Math.cos(turret.angle) * 450;
          const vy = Math.sin(turret.angle) * 450;

          bullets.current.push({
            id: `turret_bullet_${Date.now()}_${Math.random()}`,
            x: turret.x + Math.cos(turret.angle) * 14,
            y: turret.y + Math.sin(turret.angle) * 14,
            vx,
            vy,
            damage: turret.damage,
            range: turret.range,
            distanceTraveled: 0,
            source: 'turret',
            size: 3,
            color: '#3b82f6', // electric blue turret trace
          });

          playSound('shoot_pistol');
        }
      }
    });

    // E. RESCUED SOLDIER AI AUTOMATIC BEHAVIOR
    soldiers.current.forEach((soldier) => {
      if (soldier.state === 'trapped') return; // wait to be rescued

      // Move behavior: Soldiers walk towards the player or guard their designated spot
      if (soldier.role === 'guard' && soldier.guardX !== undefined && soldier.guardY !== undefined) {
        const distToGuard = Math.hypot(soldier.guardX - soldier.x, soldier.guardY - soldier.y);
        if (distToGuard > 15) {
          soldier.angle = Math.atan2(soldier.guardY - soldier.y, soldier.guardX - soldier.x);
          soldier.x += Math.cos(soldier.angle) * soldier.speed;
          soldier.y += Math.sin(soldier.angle) * soldier.speed;
        }
      } else {
        const distToPlayer = Math.hypot(player.x - soldier.x, player.y - soldier.y);
        if (distToPlayer > 180) {
          // Walk following player
          soldier.angle = Math.atan2(player.y - soldier.y, player.x - soldier.x);
          soldier.x += Math.cos(soldier.angle) * soldier.speed;
          soldier.y += Math.sin(soldier.angle) * soldier.speed;
        } else if (distToPlayer < 70) {
          // disperse slightly, do not block player path
          const pushAngle = Math.atan2(soldier.y - player.y, soldier.x - player.x);
          soldier.x += Math.cos(pushAngle) * 0.8;
          soldier.y += Math.sin(pushAngle) * 0.8;
        }
      }

      // Automatic aim and combat firing loop
      let closestZ: Zombie | null = null;
      let minDist = 220; // soldier awareness

      zombies.current.forEach((z) => {
        const d = Math.hypot(soldier.x - z.x, soldier.y - z.y);
        if (d < minDist) {
          minDist = d;
          closestZ = z;
        }
      });

      if (closestZ) {
        const target: Zombie = closestZ;
        soldier.angle = Math.atan2(target.y - soldier.y, target.x - soldier.x);

        const now = Date.now();
        if (now - soldier.lastShotTime >= soldier.fireRate) {
          soldier.lastShotTime = now;
          const bAngle = soldier.angle + (Math.random() - 0.5) * 0.15;
          const vx = Math.cos(bAngle) * 400;
          const vy = Math.sin(bAngle) * 400;

          bullets.current.push({
            id: `soldier_bullet_${Date.now()}_${Math.random()}`,
            x: soldier.x + Math.cos(soldier.angle) * 14,
            y: soldier.y + Math.sin(soldier.angle) * 14,
            vx,
            vy,
            damage: soldier.damage,
            range: 250,
            distanceTraveled: 0,
            source: 'soldier',
            size: 2.5,
            color: '#818cf8', // glowing purple allied tracer
          });

          playSound('shoot_rifle');
        }
      }
    });

    // EA. TRAPS PHYSICS & DETONATION/ZAP/SLOW SIMULATION
    traps.current.forEach((trap) => {
      if (!trap.active) return;

      if (trap.type === 'spike') {
        // Slows & damages zombies passing over it
        zombies.current.forEach((z) => {
          const dist = Math.hypot(z.x - trap.x, z.y - trap.y);
          if (dist < trap.size + z.size) {
            // Apply slow
            z.speed = Math.max(0.4, z.speed * 0.45);
            
            // Damage over time (roughly 20 dps, dt = seconds elapsed)
            z.hp -= 20 * dt;
            trap.hp! -= 5 * dt; // slowly decays when triggered
            
            if (Math.random() < 0.05) {
              createBlood(z.x, z.y, zombieBloodColor(z.type), 1);
            }
            if (z.hp <= 0) {
              handleZombieKill(z);
            }
          }
        });
      } else if (trap.type === 'landmine') {
        // Triggers massive AOE damage if a zombie steps on it
        let triggered = false;
        zombies.current.forEach((z) => {
          if (triggered) return;
          const dist = Math.hypot(z.x - trap.x, z.y - trap.y);
          if (dist < trap.size + z.size) {
            triggered = true;
          }
        });

        if (triggered) {
          trap.active = false;
          trap.hp = 0; // mark destroyed
          playSound('explode');
          screenShake.current = 15;
          
          // Spawn explosion ring particle
          particles.current.push({
            id: `explosion_ring_${Date.now()}`,
            x: trap.x,
            y: trap.y,
            vx: 0,
            vy: 0,
            color: '#f97316',
            size: 60,
            alpha: 1,
            decay: 0.04,
            life: 0,
            maxLife: 25,
            type: 'explosion_ring',
          });

          // Blast sparks
          createSparks(trap.x, trap.y, '#f59e0b', 24);

          // AOE blast damage to all nearby zombies
          zombies.current.forEach((z) => {
            const blastDist = Math.hypot(z.x - trap.x, z.y - trap.y);
            if (blastDist < 75) {
              const falloff = 1 - (blastDist / 75);
              z.hp -= 180 * falloff;
              createBlood(z.x, z.y, zombieBloodColor(z.type), 8);
              if (z.hp <= 0) {
                handleZombieKill(z);
              }
            }
          });
        }
      } else if (trap.type === 'electric_fence') {
        // Zaps and stuns up to 3 nearby zombies periodically
        if (trap.zapCooldown === undefined) trap.zapCooldown = 0;
        if (trap.zapCooldown > 0) {
          trap.zapCooldown -= dt;
        } else {
          // Look for nearby zombies
          const candidates: Zombie[] = [];
          zombies.current.forEach((z) => {
            const dist = Math.hypot(z.x - trap.x, z.y - trap.y);
            if (dist < 100) {
              candidates.push(z);
            }
          });

          if (candidates.length > 0) {
            // Zap up to 3 candidates
            const targets = candidates.slice(0, 3);
            targets.forEach((z) => {
              z.hp -= 45;
              // Stun speed (zombie AI will restore this speed during next movement checks)
              z.speed = 0; 
              createSparks(z.x, z.y, '#38bdf8', 6);
              
              if (z.hp <= 0) {
                handleZombieKill(z);
              }
            });

            trap.zapCooldown = 3.0; // 3 seconds cooldown
            trap.hp! -= 25; // drains fence health
            playSound('shoot_pistol'); // electrify sound
          }
        }
      }
    });

    // Filter out destroyed/broken traps
    traps.current = traps.current.filter((t) => t.hp! > 0 && t.active);

    // F. SPAWN ZOMBIES IN WAVES AT NIGHT TIME
    if (timeOfDay === 'night' && zombiesSpawnedCount.current < maxZombiesToSpawnThisNight.current) {
      const now = Date.now();
      // spawn delay decreases on higher waves
      const spawnDelay = Math.max(300, 2500 - wave * 250);

      if (now - lastZombieSpawnTime.current >= spawnDelay) {
        lastZombieSpawnTime.current = now;
        
        // Spawn zombie on the outer edge of map radius relative to base
        const spawnAngle = Math.random() * Math.PI * 2;
        const radius = 900 + Math.random() * 200; // spawn far away
        const zx = BASE_X + Math.cos(spawnAngle) * radius;
        const zy = BASE_Y + Math.sin(spawnAngle) * radius;

        // Scale zombie specs on higher waves & difficulty
        const isBossSpawn = wave % 5 === 0 && zombiesSpawnedCount.current === 0;
        
        let zType: 'crawler' | 'walker' | 'runner' | 'tank' | 'spitter' | 'boss' | 'exploding' = 'walker';
        let isRaiderSpawn = false;

        if (isBossSpawn) {
          zType = 'boss';
        } else {
          // Raiders appear from wave 8+ with a small chance
          if (wave >= 8 && Math.random() < 0.20) {
            isRaiderSpawn = true;
          } else {
            // Select random zombie type based on unlock waves
            const rolls: ('walker' | 'runner' | 'tank' | 'exploding' | 'spitter')[] = ['walker'];
            if (wave >= 1) rolls.push('runner');
            if (wave >= 3) rolls.push('tank');
            if (wave >= 5) rolls.push('exploding');
            if (wave >= 7) rolls.push('spitter');

            const rolled = rolls[Math.floor(Math.random() * rolls.length)];
            
            // Random chance mappings for types
            if (rolled === 'runner' && Math.random() < 0.40) zType = 'runner';
            else if (rolled === 'tank' && Math.random() < 0.28) zType = 'tank';
            else if (rolled === 'exploding' && Math.random() < 0.28) zType = 'exploding';
            else if (rolled === 'spitter' && Math.random() < 0.32) zType = 'spitter';
            else zType = 'walker';
          }
        }

        let hp = 30 + wave * 5;
        let speed = 1.2 + Math.random() * 0.2;
        let damage = 5 + wave * 1.5;
        let color = '#15803d'; // walker green
        let size = 12;
        let coinsReward = 6 + wave * 2;
        let isRaider = false;
        let raiderWeaponType: 'pistol' | 'rifle' | 'shotgun' | undefined;

        if (isRaiderSpawn) {
          isRaider = true;
          const rWeapons: ('pistol' | 'rifle' | 'shotgun')[] = ['pistol', 'rifle', 'shotgun'];
          raiderWeaponType = rWeapons[Math.floor(Math.random() * rWeapons.length)];
          hp = 65 + wave * 9;
          speed = 1.35;
          damage = 7 + wave * 1.2;
          color = '#475569'; // slate grey
          size = 12;
          coinsReward = 40 + wave * 3;
        } else if (zType === 'boss') {
          hp = 1000 + wave * 200;
          speed = 0.95;
          damage = 45 + wave * 5;
          color = '#a855f7'; // giant glowing purple
          size = 30;
          coinsReward = 300 + wave * 20;
        } else if (zType === 'tank') {
          // Brute: slow, high health, deals heavy damage
          hp = 250 + wave * 35;
          speed = 0.75;
          damage = 25 + wave * 3;
          color = '#991b1b'; // dark crimson
          size = 20;
          coinsReward = 40 + wave * 3;
        } else if (zType === 'spitter') {
          hp = 50 + wave * 5;
          speed = 1.25;
          damage = 8 + wave * 1.2;
          color = '#84cc16'; // acid green
          size = 11;
          coinsReward = 18 + wave * 2;
        } else if (zType === 'exploding') {
          hp = 40 + wave * 4;
          speed = 1.9;
          damage = 50 + wave * 2; // high base detonator
          color = '#ea580c'; // hazard orange
          size = 11;
          coinsReward = 22 + wave * 2;
        } else if (zType === 'runner') {
          hp = 20 + wave * 3;
          speed = 2.6; // super fast direct runner
          damage = 4 + wave * 0.8;
          color = '#d97706'; // bright yellow amber
          size = 10;
          coinsReward = 12 + wave * 1.5;
        } else {
          // Walker/crawler default
          zType = 'walker';
          hp = wave === 1 ? 25 : 30 + wave * 6;
          speed = wave === 1 ? 0.9 + Math.random() * 0.2 : 1.1 + Math.random() * 0.3;
          damage = wave === 1 ? 4 : 5 + wave * 1.2;
          color = '#15803d';
          size = 12;
          coinsReward = 6 + wave * 2;
        }

        // Apply gameDifficulty modifiers
        if (gameDifficulty === 'easy') {
          hp = Math.max(10, Math.floor(hp * 0.7));
          damage = Math.max(1, Math.floor(damage * 0.7));
        } else if (gameDifficulty === 'hard') {
          hp = Math.floor(hp * 1.35);
          damage = Math.floor(damage * 1.35);
          speed *= 1.15;
        }

        zombies.current.push({
          id: `zombie_${Date.now()}_${Math.random()}`,
          x: Math.max(20, Math.min(MAP_WIDTH - 20, zx)),
          y: Math.max(20, Math.min(MAP_HEIGHT - 20, zy)),
          hp,
          maxHp: hp,
          speed,
          damage,
          type: zType,
          color,
          size,
          angle: 0,
          lastAttackTime: 0,
          attackCooldown: zType === 'exploding' ? 200 : zType === 'boss' ? 1000 : 1200,
          state: 'chasing_base',
          xpReward: Math.floor(hp / 4) + 6,
          coinReward: coinsReward,
          isRaider,
          raiderWeaponType,
        });

        zombiesSpawnedCount.current += 1;
        setZombieCount(zombies.current.length);
      }
    }

    // G. ZOMBIE BEHAVIOR & MOVEMENT PHYSICS
    zombies.current.forEach((zombie) => {
      // Initialize state properties if needed
      if (zombie.freezeTimer === undefined) zombie.freezeTimer = 0;
      if (zombie.burnTimer === undefined) zombie.burnTimer = 0;

      // Decay hit flash timer
      if (zombie.hitFlashTimer && zombie.hitFlashTimer > 0) {
        zombie.hitFlashTimer = Math.max(0, zombie.hitFlashTimer - dt * 1000);
      }

      // Handle burning status effect damage over time (DoT)
      if (zombie.burnTimer > 0) {
        zombie.burnTimer -= dt;
        zombie.hp -= 18 * dt; // 18 damage per second burn DoT
        if (Math.random() < 0.15) {
          createSparks(zombie.x, zombie.y, '#f97316', 2); // orange fire sparks
        }
      }

      // Find optimal target: nearest element among (Player, Base Core, closest Wall, or Soldier)
      let targetX = BASE_X;
      let targetY = BASE_Y;
      let targetState: 'chasing_player' | 'chasing_base' | 'chasing_soldier' | 'attacking' = 'chasing_base';

      const dToPlayer = Math.hypot(player.x - zombie.x, player.y - zombie.y);
      let closestDist = Math.hypot(BASE_X - zombie.x, BASE_Y - zombie.y);

      // Scent detection distance
      if (dToPlayer < 400 && dToPlayer < closestDist) {
        targetX = player.x;
        targetY = player.y;
        targetState = 'chasing_player';
        closestDist = dToPlayer;
      }

      // Allies check
      soldiers.current.forEach((s) => {
        if (s.state === 'trapped') return;
        const dToS = Math.hypot(s.x - zombie.x, s.y - zombie.y);
        if (dToS < 250 && dToS < closestDist) {
          targetX = s.x;
          targetY = s.y;
          targetState = 'chasing_soldier';
          closestDist = dToS;
        }
      });

      // Runner: Fast, direct rush to the player
      if (zombie.type === 'runner' && player.hp > 0) {
        targetX = player.x;
        targetY = player.y;
        targetState = 'chasing_player';
        closestDist = dToPlayer;
      }

      // Set facing direction towards target or away (if Raider retreats)
      let calculatedAngle = Math.atan2(targetY - zombie.y, targetX - zombie.x);
      let isRaiderFleeing = false;

      if (zombie.isRaider && zombie.hp < zombie.maxHp * 0.35) {
        isRaiderFleeing = true;
        // Flee: face directly away from closest threat
        calculatedAngle = Math.atan2(zombie.y - targetY, zombie.x - targetX);
      }

      zombie.angle = calculatedAngle;

      // Handle Boss special attacks
      let currentBossSpeedModifier = 1.0;
      if (zombie.type === 'boss') {
        const bossObj = zombie as any;
        if (bossObj.bossChargeCooldown === undefined) {
          bossObj.bossChargeCooldown = 6000;
          bossObj.bossChargeTimer = 0;
          bossObj.bossSummonCooldown = 10000;
        }

        // 1. Minion summoning logic (every 10s spawns 2 purple minion runners)
        bossObj.bossSummonCooldown -= dt * 1000;
        if (bossObj.bossSummonCooldown <= 0) {
          bossObj.bossSummonCooldown = 11000;
          playSound('build'); // summon cue sound
          for (let i = 0; i < 2; i++) {
            const summonAngle = Math.random() * Math.PI * 2;
            zombies.current.push({
              id: `boss_summon_${Date.now()}_${Math.random()}`,
              x: zombie.x + Math.cos(summonAngle) * 45,
              y: zombie.y + Math.sin(summonAngle) * 45,
              hp: 20 + wave * 4,
              maxHp: 20 + wave * 4,
              speed: 2.3, // fast minion
              damage: 5 + wave * 0.5,
              type: 'runner',
              color: '#c084fc', // purple minion
              size: 10,
              angle: zombie.angle,
              lastAttackTime: 0,
              attackCooldown: 1000,
              state: 'chasing_player',
              xpReward: 3,
              coinReward: 5,
            });
          }
          createSparks(zombie.x, zombie.y, '#a855f7', 15);
        }

        // 2. Charge attack logic (every 8s, roar and run 4.0x speed for 1.5 seconds)
        bossObj.bossChargeCooldown -= dt * 1000;
        if (bossObj.bossChargeTimer > 0) {
          bossObj.bossChargeTimer -= dt * 1000;
          currentBossSpeedModifier = 3.6; // super charge speed boost
          if (Math.random() < 0.3) {
            createSparks(zombie.x, zombie.y, '#c084fc', 3); // charge trails
          }
        } else if (bossObj.bossChargeCooldown <= 0 && closestDist < 450) {
          bossObj.bossChargeTimer = 1500; // 1.5s charge duration
          bossObj.bossChargeCooldown = 8500; // cooldown reset
          playSound('explode'); // charge roar effect
          createSparks(zombie.x, zombie.y, '#7c3aed', 20);
        }
      }

      // Handle Spitter Ranged Spits
      if (zombie.type === 'spitter' && closestDist < 260) {
        if (!zombie.spitCooldown) zombie.spitCooldown = 0;
        zombie.spitCooldown -= dt * 1000;
        if (zombie.spitCooldown <= 0) {
          zombie.spitCooldown = 3000; // spit cooldown 3s
          
          // spit slime ball
          const spitAngle = zombie.angle + (Math.random() - 0.5) * 0.1;
          const spitVx = Math.cos(spitAngle) * 220;
          const spitVy = Math.sin(spitAngle) * 220;

          bullets.current.push({
            id: `spit_${Date.now()}`,
            x: zombie.x,
            y: zombie.y,
            vx: spitVx,
            vy: spitVy,
            damage: 10 + wave * 1.5,
            range: 300,
            distanceTraveled: 0,
            source: 'zombie',
            size: 4.5,
            color: '#84cc16', // acidic green spit ball
          });
        }
      }

      // Handle Raider firearm ranged attacks
      if (zombie.isRaider && closestDist < 350) {
        if (!zombie.spitCooldown) zombie.spitCooldown = 0;
        zombie.spitCooldown -= dt * 1000;
        if (zombie.spitCooldown <= 0) {
          zombie.spitCooldown = isRaiderFleeing ? 2400 : 1400; // shoot slower when retreating
          playSound('shoot_pistol');

          const shotAngle = zombie.angle + (Math.random() - 0.5) * 0.15;
          bullets.current.push({
            id: `raider_bullet_${Date.now()}_${Math.random()}`,
            x: zombie.x + Math.cos(zombie.angle) * zombie.size,
            y: zombie.y + Math.sin(zombie.angle) * zombie.size,
            vx: Math.cos(shotAngle) * 270,
            vy: Math.sin(shotAngle) * 270,
            damage: 7 + wave,
            range: 360,
            distanceTraveled: 0,
            source: 'zombie',
            size: 3.5,
            color: '#fb7185', // pale rose raider bullet
          });
        }
      }

      // Check if blocked by any buildable defensive wall in path
      let blockedByWall = false;
      walls.current.forEach((wall) => {
        // bounding check simple box
        const bx = Math.abs(zombie.x - wall.x) < (wall.width / 2 + zombie.size);
        const by = Math.abs(zombie.y - wall.y) < (wall.height / 2 + zombie.size);
        if (bx && by) {
          blockedByWall = true;

          if (zombie.type === 'exploding') {
            triggerZombieExplosion(zombie);
            return;
          }

          // attack wall instead of moving
          const now = Date.now();
          if (now - zombie.lastAttackTime >= zombie.attackCooldown) {
            zombie.lastAttackTime = now;
            wall.hp -= zombie.damage;
            createSparks(wall.x, wall.y, wall.color, 6);
            playSound('hit_base');
          }
        }
      });

      if (zombie.hp <= 0) return; // if exploded, stop checking other contact

      // Determine movement state: Spitter and Raiders stand ground/take cover at comfortable shooting range
      let isMoving = !blockedByWall;
      if (zombie.type === 'spitter' && closestDist < 240) {
        isMoving = false; // stands still at range to spit
      }
      if (zombie.isRaider && closestDist < 220 && !isRaiderFleeing) {
        isMoving = false; // "takes cover" stands ground at range to shoot
      }

      if (isMoving) {
        // Compute movement speed multipliers based on active freezing status
        let finalSpeed = zombie.speed * currentBossSpeedModifier;
        if (zombie.freezeTimer > 0) {
          zombie.freezeTimer -= dt;
          finalSpeed *= 0.5; // slow down by 50%
          if (Math.random() < 0.1) {
            createSparks(zombie.x, zombie.y, '#38bdf8', 1); // icy blue particles
          }
        }

        zombie.x += Math.cos(zombie.angle) * finalSpeed;
        zombie.y += Math.sin(zombie.angle) * finalSpeed;
      }

      // MELEE ATTACKS BY ZOMBIES ON PLAYERS / SOLDIERS / BASE CORE
      const now = Date.now();
      
      // Attack Player
      if (checkCircleCollision(zombie.x, zombie.y, zombie.size, player.x, player.y, 12)) {
        if (isDashing.current) {
          // Ignore collision damage during dash invincibility frames
          return;
        }

        if (zombie.type === 'exploding') {
          triggerZombieExplosion(zombie);
          return;
        }

        if (now - zombie.lastAttackTime >= zombie.attackCooldown) {
          zombie.lastAttackTime = now;
          // apply player armor shield damage reduction
          const armorReduction = 1 - (player.armor / 100);
          const finalDmgToPlayer = Math.max(1, zombie.damage * armorReduction);

          setPlayerStats((prev) => ({
            ...prev,
            hp: Math.max(0, prev.hp - finalDmgToPlayer),
          }));

          playerHitFlashTimer.current = 180; // Trigger screen vignette hit flash
          
          // Spawn player damage number text particle
          particles.current.push({
            id: `dmg_p_${Date.now()}_${Math.random()}`,
            x: player.x + (Math.random() - 0.5) * 12,
            y: player.y - 12,
            vx: (Math.random() - 0.5) * 1.2,
            vy: -1.6,
            color: '#f87171', // Bright red for player damage
            size: 12,
            alpha: 1,
            decay: 0.022,
            life: 0,
            maxLife: 45,
            type: 'text',
            text: `-${Math.round(finalDmgToPlayer)}`,
          });

          createBlood(player.x, player.y, '#ef4444', 12);
          playSound('hit_player');
          screenShake.current = 18;

          // Game over verification
          if (player.hp <= 0) {
            onGameOver('player_died');
          }
        }
      }

      if (zombie.hp <= 0) return;

      // Attack Rescued Allies
      soldiers.current.forEach((s) => {
        if (s.state === 'trapped') return;
        if (checkCircleCollision(zombie.x, zombie.y, zombie.size, s.x, s.y, 10)) {
          if (zombie.type === 'exploding') {
            triggerZombieExplosion(zombie);
            return;
          }

          if (now - zombie.lastAttackTime >= zombie.attackCooldown) {
            zombie.lastAttackTime = now;
            s.hp -= zombie.damage;
            createBlood(s.x, s.y, '#ef4444', 8);
            playSound('hit_player');
          }
        }
      });

      if (zombie.hp <= 0) return;

      // Attack Base command center
      if (checkCircleCollision(zombie.x, zombie.y, zombie.size, BASE_X, BASE_Y, base.size)) {
        if (zombie.type === 'exploding') {
          triggerZombieExplosion(zombie);
          return;
        }

        if (now - zombie.lastAttackTime >= zombie.attackCooldown) {
          zombie.lastAttackTime = now;
          setBaseCore((prev) => ({
            ...prev,
            hp: Math.max(0, prev.hp - zombie.damage),
          }));

          // Track base attack direction for warning indicator
          const attackAngle = Math.atan2(zombie.y - BASE_Y, zombie.x - BASE_X);
          baseAttackIndicator.current = { angle: attackAngle, timer: 1500 };

          createSparks(BASE_X, BASE_Y, '#f3f4f6', 10);
          playSound('hit_base');
          screenShake.current = 24;

          if (baseRef.current.hp <= 0) {
            onGameOver('base_destroyed');
          }
        }
      }
    });

    // Clean up dead soldiers
    const aliveSoldiers = soldiers.current.filter((s) => s.hp > 0);
    if (aliveSoldiers.length !== soldiers.current.length) {
      soldiers.current = aliveSoldiers;
      setActiveAlliesCount(aliveSoldiers.length);
    }

    // Clean up broken walls
    const standingWalls = walls.current.filter((w) => w.hp > 0);
    if (standingWalls.length !== walls.current.length) {
      // release related build spots
      buildSpots.current.forEach((spot) => {
        if (spot.type === 'wall' && !standingWalls.some((w) => w.id === spot.targetId)) {
          spot.type = 'empty';
          spot.targetId = null;
        }
      });
      walls.current = standingWalls;
    }

    // Clean up broken turrets
    const activeTurrets = turrets.current.filter((t) => t.hp > 0);
    if (activeTurrets.length !== turrets.current.length) {
      buildSpots.current.forEach((spot) => {
        if (spot.type === 'turret' && !activeTurrets.some((t) => t.id === spot.targetId)) {
          spot.type = 'empty';
          spot.targetId = null;
        }
      });
      turrets.current = activeTurrets;
    }

    // H. BULLETS COLLISION DETECTION
    bullets.current.forEach((bullet) => {
      // Player / turret / ally bullets hitting zombies
      if (bullet.source !== 'zombie') {
        zombies.current.forEach((z) => {
          if (checkCircleCollision(bullet.x, bullet.y, bullet.size, z.x, z.y, z.size)) {
            const player = playerRef.current;
            let finalDmg = bullet.damage;
            let isCrit = false;
            let isBackAttack = false;
            let isDistanceBonus = false;

            if (bullet.source === 'player') {
              // 1. Critical Hit Calculation
              const critLevel = upgrades.find((u) => u.type === 'crit_chance')?.level || 0;
              let critChance = 0.15 + critLevel * 0.05; // 15% base + 5% per level
              if (bullet.rarity === 'legendary') {
                critChance += 0.15; // legendary upgrade bonus
              }
              if (Math.random() < critChance) {
                isCrit = true;
                finalDmg *= 2.0;
              }

              // 2. Back Attack Bonus
              const angleToZ = Math.atan2(z.y - player.y, z.x - player.x);
              const getAngleDiff = (a1: number, a2: number) => {
                let diff = Math.abs(a1 - a2) % (Math.PI * 2);
                if (diff > Math.PI) diff = Math.PI * 2 - diff;
                return diff;
              };
              if (getAngleDiff(z.angle, angleToZ) < 1.1) {
                isBackAttack = true;
                const dashedRecently = (Date.now() - lastDashTime.current) < 1200;
                if (dashedRecently) {
                  finalDmg *= 2.5; // Shadow Strike synergy!
                } else {
                  finalDmg *= 1.5;
                }
              }

              // 3. Distance Precision Bonus
              const distToZ = Math.hypot(z.x - player.x, z.y - player.y);
              if (distToZ > 220) {
                isDistanceBonus = true;
                finalDmg *= 1.4;
              }
            }

            z.hp -= finalDmg;
            z.hitFlashTimer = 110; // Trigger white hit flash effect
            bullet.distanceTraveled = bullet.range + 10; // destroy bullet

            // Apply special weapon status effects
            if (bullet.specialEffect === 'burn') {
              z.burnTimer = 4.0; // Burn for 4s
              createSparks(z.x, z.y, '#f97316', 8);
              playSound('hit_base');
            } else if (bullet.specialEffect === 'freeze') {
              z.freezeTimer = 4.0; // Freeze/slow for 4s
              createSparks(z.x, z.y, '#38bdf8', 8);
              playSound('repair');
            } else if (bullet.specialEffect === 'explode') {
              // High impact Area-of-Effect explosion (75px radius)
              playSound('explode');
              createSparks(z.x, z.y, '#ef4444', 14);
              zombies.current.forEach((otherZ) => {
                if (otherZ.id === z.id) return; // already hit directly
                const distZ = Math.hypot(otherZ.x - z.x, otherZ.y - z.y);
                if (distZ < 75) {
                  const splashDmg = Math.floor(finalDmg * 0.65); // Splash dmg inherits modifiers!
                  otherZ.hp -= splashDmg;
                  otherZ.hitFlashTimer = 110;
                  createBlood(otherZ.x, otherZ.y, zombieBloodColor(otherZ.type), 2);
                  if (otherZ.hp <= 0) {
                    handleZombieKill(otherZ);
                  }
                }
              });
            }

            createBlood(z.x, z.y, zombieBloodColor(z.type), 5);
            
            if (isCrit) {
              createSparks(z.x, z.y, '#eab308', 12); // bright gold crit sparks
              createSparks(z.x, z.y, '#ffffff', 6);  // white center sparks
              playSound('crit');
            } else {
              playSound('hit_zombie');
            }

            // Spawn floating damage text particle with layered labels
            let textStr = `-${Math.round(finalDmg)}`;
            let textColor = '#fca5a5'; // soft red default
            let textSize = 11;

            if (isCrit) {
              textColor = '#facc15'; // golden yellow
              textSize = 16;
              textStr = `⭐ CRIT ${textStr}!`;
            }
            if (isBackAttack) {
              const dashedRecently = (Date.now() - lastDashTime.current) < 1200;
              if (dashedRecently) {
                textColor = '#c084fc'; // purple shadow color
                textStr = `⚡ SHADOW ${textStr}`;
              } else {
                if (!isCrit) textColor = '#38bdf8'; // light blue
                textStr = `⚡ BACK ${textStr}`;
              }
            }
            if (isDistanceBonus) {
              if (!isCrit && !isBackAttack) textColor = '#f43f5e'; // rose red
              textStr = `🎯 LONG ${textStr}`;
            }

            particles.current.push({
              id: `dmg_${Date.now()}_${Math.random()}`,
              x: z.x + (Math.random() - 0.5) * 16,
              y: z.y - 12,
              vx: (Math.random() - 0.5) * 1.2,
              vy: -1.6, // float upward
              color: textColor,
              size: textSize,
              alpha: 1,
              decay: 0.022,
              life: 0,
              maxLife: 45,
              type: 'text',
              text: textStr,
            });

            // Zombie death check
            if (z.hp <= 0) {
              // trigger kill XP and Cash rewards
              handleZombieKill(z);
            }
          }
        });

        // bullets hitting cages to release soldiers
        crates.current.forEach((c) => {
          if (!c.looted && c.type === 'soldier_cage') {
            if (checkCircleCollision(bullet.x, bullet.y, bullet.size, c.x, c.y, c.size / 2)) {
              bullet.distanceTraveled = bullet.range + 10; // destroy bullet
              
              if (c.soldierInside) {
                c.soldierInside.cageHp! -= bullet.damage;
                createSparks(c.x, c.y, c.color, 4);
                
                if (c.soldierInside.cageHp! <= 0) {
                  // free soldier!
                  c.looted = true;
                  const soldier = c.soldierInside;
                  soldier.state = 'following';
                  soldiers.current.push(soldier);
                  setActiveAlliesCount(soldiers.current.length);
                  
                  createSparks(c.x, c.y, '#10b981', 15);
                  playSound('level_up');
                }
              }
            }
          }
        });
      } else {
        // Spitter acidic spit bullet hitting player or soldiers
        if (checkCircleCollision(bullet.x, bullet.y, bullet.size, player.x, player.y, 12)) {
          bullet.distanceTraveled = bullet.range + 10; // destroy
          if (isDashing.current) {
            // Ignore projectile damage during dash
            return;
          }
          const armorReduction = 1 - (player.armor / 100);
          const finalSpitDmg = bullet.damage * armorReduction;
          
          setPlayerStats((prev) => ({
            ...prev,
            hp: Math.max(0, prev.hp - finalSpitDmg),
          }));

          playerHitFlashTimer.current = 180; // Trigger screen vignette hit flash
          
          // Spawn player damage number text particle
          particles.current.push({
            id: `dmg_p_${Date.now()}_${Math.random()}`,
            x: player.x + (Math.random() - 0.5) * 12,
            y: player.y - 12,
            vx: (Math.random() - 0.5) * 1.2,
            vy: -1.6,
            color: '#f87171', // Bright red for player damage
            size: 12,
            alpha: 1,
            decay: 0.022,
            life: 0,
            maxLife: 45,
            type: 'text',
            text: `-${Math.round(finalSpitDmg)}`,
          });

          createBlood(player.x, player.y, '#84cc16', 8); // toxic green splash
          playSound('hit_player');
          if (player.hp <= 0) {
            onGameOver('player_died');
          }
        }

        // hits soldiers
        soldiers.current.forEach((s) => {
          if (s.state === 'trapped') return;
          if (checkCircleCollision(bullet.x, bullet.y, bullet.size, s.x, s.y, 10)) {
            bullet.distanceTraveled = bullet.range + 10;
            s.hp -= bullet.damage;
            createBlood(s.x, s.y, '#84cc16', 6);
            playSound('hit_player');
          }
        });

        // hits walls
        walls.current.forEach((w) => {
          const bx = Math.abs(bullet.x - w.x) < (w.width / 2 + bullet.size);
          const by = Math.abs(bullet.y - w.y) < (w.height / 2 + bullet.size);
          if (bx && by) {
            bullet.distanceTraveled = bullet.range + 10;
            w.hp -= bullet.damage;
            createSparks(w.x, w.y, w.color, 4);
          }
        });
      }
    });

    // Remove dead zombies
    const aliveZombies = zombies.current.filter((z) => z.hp > 0);
    if (aliveZombies.length !== zombies.current.length) {
      zombies.current = aliveZombies;
      setZombieCount(aliveZombies.length);
    }

    // I. COLLISION SCAVENGING CRATES (WOOD, SCRAP, AMMO, HEALTH)
    crates.current.forEach((crate) => {
      if (crate.looted) return;

      const dist = Math.hypot(player.x - crate.x, player.y - crate.y);
      if (dist < (crate.size + 15)) {
        // Loot successfully!
        crate.looted = true;
        playSound('repair');

        if (crate.type === 'wood') {
          setPlayerStats((prev) => ({ ...prev, wood: prev.wood + crate.amount }));
          createSparks(crate.x, crate.y, '#15803d', 10);
        } else if (crate.type === 'scrap') {
          setPlayerStats((prev) => ({ ...prev, scrap: prev.scrap + crate.amount }));
          createSparks(crate.x, crate.y, '#64748b', 10);
        } else if (crate.type === 'health') {
          // Heal the player for 40 HP
          setPlayerStats((prev) => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + 40) }));
          createSparks(crate.x, crate.y, '#ec4899', 12);
        } else if (crate.type === 'ammo') {
          // Give ammo to all firearms
          setWeapons((prev) => 
            prev.map((w) => {
              if (w.type !== 'melee') {
                return { ...w, ammo: Math.min(w.maxAmmo, w.ammo + Math.floor(w.maxAmmo * 0.4)) };
              }
              return w;
            })
          );
          createSparks(crate.x, crate.y, '#3b82f6', 12);
        } else if (crate.type === 'military_tech') {
          // Grant high amount of cash and crafting items
          setPlayerStats((prev) => ({ 
            ...prev, 
            coins: prev.coins + 150,
            spikeTrapsCount: prev.spikeTrapsCount + 2,
            landminesCount: prev.landminesCount + 1,
            electricFencesCount: prev.electricFencesCount + 1,
            grenadesCount: prev.grenadesCount + 2,
            medkitsCount: prev.medkitsCount + 1,
          }));
          createSparks(crate.x, crate.y, '#f59e0b', 20);
          playSound('level_up');
        } else if ((crate.type as string) === 'weapon_crate') {
          // Choose a random unlocked firearm to upgrade
          const unlockedFirearms = weaponsRef.current.filter((w) => w.unlocked && w.type !== 'melee');
          const candidate = unlockedFirearms.length > 0 
            ? unlockedFirearms[Math.floor(Math.random() * unlockedFirearms.length)]
            : weaponsRef.current[0];

          if (candidate) {
            const currentRarity = candidate.rarity || 'common';
            let nextRarity: 'rare' | 'legendary' = 'rare';
            let specEffect: 'burn' | 'freeze' | 'explode' | undefined;

            if (currentRarity === 'common') {
              nextRarity = 'rare';
            } else {
              nextRarity = 'legendary';
              const effects: ('burn' | 'freeze' | 'explode')[] = ['burn', 'freeze', 'explode'];
              specEffect = effects[Math.floor(Math.random() * effects.length)];
            }

            const isLegendary = nextRarity === 'legendary';
            const dmgMult = isLegendary ? 1.6 : 1.35;
            const frMult = isLegendary ? 0.70 : 0.85; // lower fire rate delay = faster fire rate
            const ammoMult = isLegendary ? 1.75 : 1.4;

            const rarityColor = isLegendary ? '#f59e0b' : '#a855f7'; // Gold / Purple
            const baseName = candidate.name.split(' [')[0];
            const effectTag = specEffect === 'burn' ? '🔥 Incendiary' : specEffect === 'freeze' ? '❄️ Freeze' : specEffect === 'explode' ? '💥 Explosive' : 'Rare';
            const finalName = `${baseName} [${nextRarity.toUpperCase()}${specEffect ? ` - ${effectTag}` : ''}]`;

            // Update state
            setWeapons((prev) => 
              prev.map((w) => {
                if (w.id === candidate.id) {
                  const newMaxAmmo = Math.floor(w.maxAmmo * ammoMult);
                  return {
                    ...w,
                    name: finalName,
                    rarity: nextRarity,
                    specialEffect: specEffect,
                    damage: Math.floor(w.damage * dmgMult),
                    fireRate: Math.floor(w.fireRate * frMult),
                    maxAmmo: newMaxAmmo,
                    ammo: newMaxAmmo,
                    color: rarityColor,
                  };
                }
                return w;
              })
            );

            // Update ref
            weaponsRef.current = weaponsRef.current.map((w) => {
              if (w.id === candidate.id) {
                const newMaxAmmo = Math.floor(w.maxAmmo * ammoMult);
                return {
                  ...w,
                  name: finalName,
                  rarity: nextRarity,
                  specialEffect: specEffect,
                  damage: Math.floor(w.damage * dmgMult),
                  fireRate: Math.floor(w.fireRate * frMult),
                  maxAmmo: newMaxAmmo,
                  ammo: newMaxAmmo,
                  color: rarityColor,
                };
              }
              return w;
            });

            createSparks(crate.x, crate.y, rarityColor, 25);
            playSound('level_up');

            // Floating text alert above player
            particles.current.push({
              id: `text_weap_${Date.now()}_${Math.random()}`,
              x: player.x,
              y: player.y - 15,
              vx: 0,
              vy: -1.5,
              color: rarityColor,
              size: 13,
              alpha: 1,
              decay: 0.015,
              life: 0,
              maxLife: 60,
              type: 'text',
              text: `⭐ ${nextRarity.toUpperCase()} UPGRADE! ⭐`,
            });
          }
        }
      }
    });

    // Clean looted boxes
    crates.current = crates.current.filter((c) => !c.looted);

    // J. PARTICLES RECOVERY & DECAY LIFESPAN
    particles.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = Math.max(0, p.alpha - p.decay);
      p.life += 1;
    });

    particles.current = particles.current.filter((p) => p.life < p.maxLife && p.alpha > 0);

    // K. LORE DIARY LOGS COLLECTION
    spawnedLogs.current.forEach((log) => {
      if (!log.collected) {
        const dist = Math.hypot(player.x - log.x, player.y - log.y);
        if (dist < 40) {
          log.collected = true;
          playSound('level_up');
          setCollectedLogIds((prev) => [...prev, log.id]);
          setActiveLogOverlay({ title: log.title, text: log.text });
        }
      }
    });
  };

  // AMMUNITION AUTO RECOVERS TIMER
  const triggerWeaponReload = (weapon: Weapon) => {
    if (isReloading.current) return;
    isReloading.current = true;
    reloadTimer.current = weapon.reloadTime;
    
    // Play custom synthesized weapon-specific reload sound effects
    if (weapon.type === 'pistol') {
      playSound('reload_pistol');
    } else if (weapon.type === 'rifle') {
      playSound('reload_rifle');
    } else if (weapon.type === 'shotgun') {
      playSound('reload_shotgun');
    } else {
      playSound('repair');
    }
  };

  const spawnWeaponCrate = (cx: number, cy: number) => {
    crates.current.push({
      id: `weapon_crate_${Date.now()}_${Math.random()}`,
      x: cx,
      y: cy,
      type: 'weapon_crate' as any,
      amount: 1,
      size: 16,
      color: '#e11d48', // Golden magenta legendary weapon crate color
      looted: false,
    });
    // Create golden sparks around drop spot
    createSparks(cx, cy, '#fbbf24', 15);
  };

  // COMBAT LEVEL UPS AND SKILL REWARDS
  const handleZombieKill = (z: Zombie) => {
    if (z.type === 'exploding' && !z.hasExploded) {
      z.hasExploded = true;
      triggerZombieExplosion(z);
      return;
    }

    if (z.type === 'boss') {
      spawnWeaponCrate(z.x, z.y);
    } else if (wave >= 4 && Math.random() < 0.035) {
      // 3.5% rare drop chance for normal zombies starting on wave 4
      spawnWeaponCrate(z.x, z.y);
    }

    currentWaveZombiesKilledInNight.current += 1;
    setKills((prev) => prev + 1);
    
    // Reward player coin cash and experience
    let rewardedXp = z.xpReward;
    let rewardedCoins = z.coinReward;

    setPlayerStats((prev) => {
      let currentXp = prev.xp + rewardedXp;
      let currentLevel = prev.level;
      let nextXpNeeded = prev.xpNeeded;

      // level up verification
      if (currentXp >= nextXpNeeded) {
        currentLevel += 1;
        currentXp -= nextXpNeeded;
        nextXpNeeded = Math.floor(nextXpNeeded * 1.5);
        
        // reward full HP heal
        playSound('level_up');
        // spark visual level circle
        createSparks(prev.x, prev.y, '#fbbf24', 25);
        
        return {
          ...prev,
          level: currentLevel,
          xp: currentXp,
          xpNeeded: nextXpNeeded,
          hp: prev.maxHp, // fully healed
        };
      }

      return {
        ...prev,
        xp: currentXp,
        coins: prev.coins + rewardedCoins,
      };
    });

    playSound('kill_zombie');
  };

  const zombieBloodColor = (type: string) => {
    return type === 'spitter' ? '#84cc16' : '#14532d'; // green zombie goo splatters
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none cursor-crosshair">
      <canvas ref={canvasRef} className="block w-full h-full bg-slate-950" />

      {/* CRAFTING BENCH MODAL OVERLAY */}
      {isCraftingOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-sky-400 font-mono flex items-center gap-2">
                  🛠️ BASE CRAFTING BENCH
                </h2>
                <p className="text-xs text-slate-400">Assemble defense traps, explosives, and healing kits.</p>
              </div>
              <button 
                onClick={() => setIsCraftingOpen(false)}
                className="text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Resources indicators bar */}
            <div className="bg-slate-950 px-4 py-2.5 flex justify-around text-xs border-b border-slate-800 text-slate-300 font-mono">
              <span className="flex items-center gap-1 font-semibold">🪵 Wood: <strong className="text-green-400">{playerStats.wood}</strong></span>
              <span className="flex items-center gap-1 font-semibold">⚙️ Scrap: <strong className="text-slate-400">{playerStats.scrap}</strong></span>
              <span className="flex items-center gap-1 font-semibold">💰 Cash: <strong className="text-yellow-400">${playerStats.coins}</strong></span>
            </div>

            {/* Recipes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {[
                {
                  id: 'spike',
                  name: 'Spike Trap',
                  icon: '🪵⚔️',
                  desc: 'Slows down and inflicts damage over time on zombies walking over it.',
                  costs: { wood: 30, scrap: 15 },
                  owned: playerStats.spikeTrapsCount,
                  craftAction: () => {
                    if (playerStats.wood >= 30 && playerStats.scrap >= 15) {
                      setPlayerStats(prev => ({ 
                        ...prev, 
                        wood: prev.wood - 30, 
                        scrap: prev.scrap - 15, 
                        spikeTrapsCount: prev.spikeTrapsCount + 1 
                      }));
                      playSound('repair');
                    }
                  }
                },
                {
                  id: 'landmine',
                  name: 'Landmine Explosive',
                  icon: '💥⚙️',
                  desc: 'Triggers a massive area blast when detonated by a zombie stepping on it.',
                  costs: { scrap: 35, coins: 50 },
                  owned: playerStats.landminesCount,
                  craftAction: () => {
                    if (playerStats.scrap >= 35 && playerStats.coins >= 50) {
                      setPlayerStats(prev => ({ 
                        ...prev, 
                        scrap: prev.scrap - 35, 
                        coins: prev.coins - 50, 
                        landminesCount: prev.landminesCount + 1 
                      }));
                      playSound('repair');
                    }
                  }
                },
                {
                  id: 'electric_fence',
                  name: 'Electric Stun Fence',
                  icon: '⚡🛡️',
                  desc: 'Zaps and stuns up to 3 nearby zombies every few seconds.',
                  costs: { scrap: 60, coins: 100 },
                  owned: playerStats.electricFencesCount,
                  craftAction: () => {
                    if (playerStats.scrap >= 60 && playerStats.coins >= 100) {
                      setPlayerStats(prev => ({ 
                        ...prev, 
                        scrap: prev.scrap - 60, 
                        coins: prev.coins - 100, 
                        electricFencesCount: prev.electricFencesCount + 1 
                      }));
                      playSound('repair');
                    }
                  }
                },
                {
                  id: 'medkit',
                  name: 'Combat Medkit',
                  icon: '❤️📦',
                  desc: 'Restores up to 100 HP. Use with [Q] or [H] to heal.',
                  costs: { scrap: 20, coins: 40 },
                  owned: playerStats.medkitsCount,
                  craftAction: () => {
                    if (playerStats.scrap >= 20 && playerStats.coins >= 40) {
                      setPlayerStats(prev => ({ 
                        ...prev, 
                        scrap: prev.scrap - 20, 
                        coins: prev.coins - 40, 
                        medkitsCount: prev.medkitsCount + 1 
                      }));
                      playSound('repair');
                    }
                  }
                },
                {
                  id: 'grenade',
                  name: 'Explosive Grenade',
                  icon: '💣🎒',
                  desc: 'Throwable tactical bomb. Press [G] to throw at cursor.',
                  costs: { scrap: 30, coins: 30 },
                  owned: playerStats.grenadesCount,
                  craftAction: () => {
                    if (playerStats.scrap >= 30 && playerStats.coins >= 30) {
                      setPlayerStats(prev => ({ 
                        ...prev, 
                        scrap: prev.scrap - 30, 
                        coins: prev.coins - 30, 
                        grenadesCount: prev.grenadesCount + 1 
                      }));
                      playSound('repair');
                    }
                  }
                }
              ].map((recipe) => {
                const canCraft = Object.entries(recipe.costs).every(([res, cost]) => {
                  if (res === 'wood') return playerStats.wood >= cost;
                  if (res === 'scrap') return playerStats.scrap >= cost;
                  if (res === 'coins') return playerStats.coins >= cost;
                  return false;
                });

                return (
                  <div key={recipe.id} className="p-3 bg-slate-800/60 border border-slate-700 rounded-lg flex items-start gap-3 hover:border-slate-500 transition-colors">
                    <div className="text-2xl p-2 bg-slate-800 rounded-lg border border-slate-700 flex-shrink-0">
                      {recipe.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-100 font-mono">{recipe.name}</span>
                        <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded font-mono">Owned: {recipe.owned}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-normal">{recipe.desc}</p>
                      
                      {/* Cost breakdown & craft button */}
                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-800 pt-2">
                        <div className="flex gap-2.5 text-[10px] font-mono text-slate-400">
                          {Object.entries(recipe.costs).map(([res, cost]) => (
                            <span key={res} className={
                              (res === 'wood' && playerStats.wood >= cost) ||
                              (res === 'scrap' && playerStats.scrap >= cost) ||
                              (res === 'coins' && playerStats.coins >= cost)
                                ? "text-slate-300" : "text-red-400 font-semibold"
                            }>
                              {res === 'wood' ? '🪵' : res === 'scrap' ? '⚙️' : '💰'} {cost}
                            </span>
                          ))}
                        </div>
                        <button
                          disabled={!canCraft}
                          onClick={recipe.craftAction}
                          className={`px-3 py-1 rounded text-xs font-semibold font-mono transition-all ${
                            canCraft 
                              ? "bg-sky-500 hover:bg-sky-400 text-white cursor-pointer active:scale-95" 
                              : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                          }`}
                        >
                          CRAFT
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Close footer help instructions */}
            <div className="bg-slate-950 p-3 text-center border-t border-slate-800 text-[10px] text-slate-400 font-mono">
              Press <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-400">F</kbd> to resume. Deploy items: <span className="text-amber-400">Spikes [5], Mines [6], Fences [7]</span>
            </div>

          </div>
        </div>
      )}

      {/* TRAVELING MERCHANT MODAL OVERLAY */}
      {isMerchantOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-amber-950/40 p-4 border-b border-amber-500/30 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-amber-400 font-mono flex items-center gap-2">
                  🛒 TRAVELING MERCHANT SHOP
                </h2>
                <p className="text-xs text-amber-200/70">Wandering traveler with rare resources and survival gear.</p>
              </div>
              <button 
                onClick={() => setIsMerchantOpen(false)}
                className="text-amber-400 hover:text-white bg-amber-900/40 hover:bg-amber-800/60 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Cash indicators bar */}
            <div className="bg-slate-950 px-4 py-2.5 flex justify-around text-xs border-b border-slate-800 text-slate-300 font-mono">
              <span className="flex items-center gap-1 font-semibold">💰 Your Cash: <strong className="text-yellow-400">${playerStats.coins}</strong></span>
              <span className="flex items-center gap-1 font-semibold">🥫 Food: <strong className="text-amber-400">{playerStats.foodCount}</strong></span>
              <span className="flex items-center gap-1 font-semibold">💧 Water: <strong className="text-sky-400">{playerStats.waterCount}</strong></span>
            </div>

            {/* Merchant Trades List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {[
                {
                  id: 'buy_food',
                  name: '🥫 Preserved Food Can',
                  desc: 'High-calorie survival beans. Restores 35 Hunger and heals 12 HP.',
                  cost: 25,
                  count: playerStats.foodCount,
                  action: () => {
                    if (playerStats.coins < 25) return;
                    setPlayerStats((prev) => ({
                      ...prev,
                      coins: prev.coins - 25,
                      foodCount: prev.foodCount + 1,
                    }));
                    playSound('repair');
                  },
                },
                {
                  id: 'buy_water',
                  name: '💧 Purified Water Bottle',
                  desc: 'Sparkling clean groundwater. Restores 45 Thirst and 25 Stamina.',
                  cost: 25,
                  count: playerStats.waterCount,
                  action: () => {
                    if (playerStats.coins < 25) return;
                    setPlayerStats((prev) => ({
                      ...prev,
                      coins: prev.coins - 25,
                      waterCount: prev.waterCount + 1,
                    }));
                    playSound('repair');
                  },
                },
                {
                  id: 'buy_wood',
                  name: '🪵 Premium Lumber Bundle',
                  desc: 'Heavy-duty construction wood. Instantly adds +12 Wood to build walls.',
                  cost: 40,
                  count: playerStats.wood,
                  action: () => {
                    if (playerStats.coins < 40) return;
                    setPlayerStats((prev) => ({
                      ...prev,
                      coins: prev.coins - 40,
                      wood: prev.wood + 12,
                    }));
                    playSound('repair');
                  },
                },
                {
                  id: 'buy_scrap',
                  name: '⚙️ Industrial Scrap Metal',
                  desc: 'High-density metal debris. Adds +12 Scrap for crafting spikes, turrets, or fences.',
                  cost: 55,
                  count: playerStats.scrap,
                  action: () => {
                    if (playerStats.coins < 55) return;
                    setPlayerStats((prev) => ({
                      ...prev,
                      coins: prev.coins - 55,
                      scrap: prev.scrap + 12,
                    }));
                    playSound('repair');
                  },
                },
                {
                  id: 'buy_armor',
                  name: '🛡️ Kevlar Armor Plate',
                  desc: 'Sleek protective vest insert. Restores +25 Armor defense values (Max 100).',
                  cost: 90,
                  count: playerStats.armor || 0,
                  action: () => {
                    if (playerStats.coins < 90) return;
                    setPlayerStats((prev) => ({
                      ...prev,
                      coins: prev.coins - 90,
                      armor: Math.min(100, (prev.armor || 0) + 25),
                    }));
                    playSound('repair');
                  },
                },
              ].map((item) => {
                const canBuy = playerStats.coins >= item.cost;
                return (
                  <div key={item.id} className="p-3 bg-slate-800/60 border border-slate-700 rounded-lg flex items-start gap-3 hover:border-amber-500/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-100 font-mono">{item.name}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded font-mono">Stock: Infinite</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-normal">{item.desc}</p>
                      
                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/55 pt-2">
                        <span className={canBuy ? "text-yellow-400 font-mono text-xs font-semibold" : "text-red-400 font-mono text-xs font-semibold"}>
                          💰 ${item.cost}
                        </span>
                        <button
                          disabled={!canBuy}
                          onClick={item.action}
                          className={`px-3.5 py-1 rounded text-xs font-semibold font-mono transition-all ${
                            canBuy 
                              ? "bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer active:scale-95 font-bold" 
                              : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                          }`}
                        >
                          BUY ITEM
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Close footer help instructions */}
            <div className="bg-slate-950 p-3 text-center border-t border-slate-800 text-[10px] text-amber-400 font-mono">
              Press <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-400">E</kbd> near the Merchant to close.
            </div>

          </div>
        </div>
      )}

      {/* LORE DIARY OVERLAY MODAL */}
      {activeLogOverlay && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-6">
          <div className="w-full max-w-lg bg-amber-50 border border-amber-300 rounded-xl shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden flex flex-col max-h-[85vh] text-amber-950">
            
            {/* Modal Journal Header */}
            <div className="bg-amber-100 p-4 border-b border-amber-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-700 font-mono">
                📖 APOCALYPSE RECORDINGS
              </span>
              <button 
                onClick={() => setActiveLogOverlay(null)}
                className="text-amber-800 hover:text-black bg-amber-200/50 hover:bg-amber-200 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Journal Body Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 font-serif leading-relaxed text-base">
              <h2 className="text-xl md:text-2xl font-bold font-sans text-amber-900 tracking-tight border-b border-amber-200 pb-2">
                {activeLogOverlay.title}
              </h2>
              <p className="whitespace-pre-line text-amber-900/95">
                {activeLogOverlay.text}
              </p>
            </div>

            {/* Journal Footer */}
            <div className="bg-amber-100 p-4 border-t border-amber-200 text-center text-xs font-mono font-bold text-amber-700 flex justify-between items-center">
              <span>{collectedLogIds.length} / 4 Pages Collected</span>
              <button 
                onClick={() => setActiveLogOverlay(null)}
                className="bg-amber-800 hover:bg-amber-900 text-white px-5 py-1.5 rounded font-sans text-xs font-semibold tracking-wider active:scale-95 transition-all cursor-pointer"
              >
                DISMISS DIARY
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

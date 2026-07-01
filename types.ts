export interface Weapon {
  id: string;
  name: string;
  type: 'melee' | 'pistol' | 'shotgun' | 'rifle';
  damage: number;
  fireRate: number; // delay in ms between shots
  reloadTime: number; // in ms
  maxAmmo: number;
  ammo: number;
  bulletSpeed: number;
  spread: number; // angle in radians
  projectileCount: number; // 1 for single, multiple for shotgun
  upgradeCost: number;
  level: number;
  unlocked: boolean;
  color: string;
  rarity?: 'common' | 'rare' | 'legendary';
  specialEffect?: 'burn' | 'freeze' | 'explode';
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  stamina: number;
  maxStamina: number;
  isSprinting: boolean;
  level: number;
  xp: number;
  xpNeeded: number;
  coins: number;
  wood: number;
  scrap: number;
  armor: number; // damage reduction percentage (0 to 60)
  maxArmor: number;
  isMeleeAttacking: boolean;
  meleeTimer: number;
  
  // Advanced inventory for crafted items & weapons
  spikeTrapsCount: number;
  landminesCount: number;
  electricFencesCount: number;
  medkitsCount: number;
  grenadesCount: number;

  // Survival Layer (Hunger & Thirst)
  hunger: number;
  thirst: number;
  foodCount: number;
  waterCount: number;

  // Character Customization
  outfitColor: string;
  headgear: 'none' | 'helmet' | 'bandana' | 'hood' | 'cap';
}

export interface Zombie {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  type: 'crawler' | 'walker' | 'runner' | 'tank' | 'spitter' | 'boss' | 'exploding';
  color: string;
  size: number;
  angle: number;
  lastAttackTime: number;
  attackCooldown: number; // in ms
  state: 'wandering' | 'chasing_player' | 'chasing_base' | 'chasing_soldier' | 'attacking';
  xpReward: number;
  coinReward: number;
  spitCooldown?: number;
  isEnraged?: boolean;
  hitFlashTimer?: number; // duration in ms for red hit flash effect
  burnTimer?: number;
  freezeTimer?: number;
  hasExploded?: boolean;
  isRaider?: boolean;
  raiderWeaponType?: 'pistol' | 'rifle' | 'shotgun';
}

export interface Wall {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  width: number;
  height: number;
  material: 'wood' | 'scrap' | 'iron' | 'reinforced';
  color: string;
}

export interface Turret {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  range: number;
  damage: number;
  fireRate: number; // shot delay in ms
  lastShotTime: number;
  angle: number;
  upgradeCost: number;
  color: string;
}

export interface BaseCore {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  size: number;
}

export interface Soldier {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  angle: number;
  state: 'trapped' | 'following' | 'defending';
  role: 'follow' | 'guard' | 'man_turret';
  guardX?: number;
  guardY?: number;
  weaponType: 'pistol' | 'rifle' | 'shotgun';
  lastShotTime: number;
  fireRate: number;
  damage: number;
  targetId: string | null;
  cageHp?: number; // if trapped, needs rescue
}

export interface ResourceCrate {
  id: string;
  x: number;
  y: number;
  type: 'wood' | 'scrap' | 'ammo' | 'health' | 'soldier_cage' | 'military_tech';
  amount: number;
  size: number;
  color: string;
  looted: boolean;
  soldierInside?: Soldier;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  range: number;
  distanceTraveled: number;
  source: 'player' | 'turret' | 'soldier' | 'zombie';
  size: number;
  color: string;
  rarity?: 'common' | 'rare' | 'legendary';
  specialEffect?: 'burn' | 'freeze' | 'explode';
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  life: number;
  maxLife: number;
  type: 'blood' | 'spark' | 'debris' | 'level_up' | 'acid' | 'explosion_ring' | 'smoke' | 'rain' | 'fog' | 'text';
  text?: string; // Floating text string for damage numbers
}

export interface GameUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  level: number;
  maxLevel: number;
  type: 'player_hp' | 'player_speed' | 'player_stamina' | 'melee_damage' | 'reload_speed' | 'turret_slots' | 'base_max_hp' | 'armor' | 'crit_chance';
}

export interface Trap {
  id: string;
  x: number;
  y: number;
  type: 'spike' | 'landmine' | 'electric_fence';
  hp: number;
  maxHp: number;
  size: number;
  active: boolean;
  zapCooldown?: number;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface LoreLog {
  id: string;
  x: number;
  y: number;
  title: string;
  content: string;
  author: string;
  date: string;
  collected: boolean;
}



import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Shield, Target, Award, Key, Trophy, Sparkles, 
  Volume2, Flame, Skull, Sun, Snowflake, Leaf, Eye, 
  BookOpen, Compass, ChevronDown, RefreshCw, Star, Info, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound } from '../utils/audio';

interface MainMenuProps {
  onStartGame: (
    difficulty: 'easy' | 'normal' | 'hard',
    hardcore: boolean,
    survival: boolean,
    outfitColor: string,
    headgear: 'none' | 'helmet' | 'bandana' | 'hood' | 'cap'
  ) => void;
  uiScale: 'normal' | 'large';
  setUiScale: (val: 'normal' | 'large') => void;
  colorblindMode: 'normal' | 'protanopia' | 'tritanopia';
  setColorblindMode: (val: 'normal' | 'protanopia' | 'tritanopia') => void;
  screenShakeEnabled: boolean;
  setScreenShakeEnabled: (val: boolean) => void;
  flashEffectsEnabled: boolean;
  setFlashEffectsEnabled: (val: boolean) => void;
}

export default function MainMenu({
  onStartGame,
  uiScale,
  setUiScale,
  colorblindMode,
  setColorblindMode,
  screenShakeEnabled,
  setScreenShakeEnabled,
  flashEffectsEnabled,
  setFlashEffectsEnabled,
}: MainMenuProps) {
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [isHardcore, setIsHardcore] = useState<boolean>(false);
  const [isSurvivalMode, setIsSurvivalMode] = useState<boolean>(true);
  const [outfitColor, setOutfitColor] = useState<string>('#0f766e');
  const [headgear, setHeadgear] = useState<'none' | 'helmet' | 'bandana' | 'hood' | 'cap'>('none');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // Interactive Stats Preview State
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>('pistol');
  const [simulateTrigger, setSimulateTrigger] = useState<number>(0);
  const [simulationSparks, setSimulationSparks] = useState<{ id: number; x: number; y: number; r: number }[]>([]);
  const [simulatedShotsCount, setSimulatedShotsCount] = useState<number>(0);

  // Interactive Season Atmosphere State
  const [previewSeason, setPreviewSeason] = useState<'spring' | 'summer' | 'autumn' | 'winter'>('spring');
  const [atmosphereParticles, setAtmosphereParticles] = useState<{ id: number; x: number; y: number; size: number; speed: number; angle: number }[]>([]);

  // Lore Log decryptions from local storage
  const [unlockedLogIds, setUnlockedLogIds] = useState<string[]>([]);
  const [readingLogId, setReadingLogId] = useState<string | null>(null);

  const highNight = localStorage.getItem('last_stand_high_night') || '0';
  const highKills = localStorage.getItem('last_stand_high_kills') || '0';
  
  // Track Achievements
  const [unlockedFirstBlood, setUnlockedFirstBlood] = useState(false);
  const [unlockedArchitect, setUnlockedArchitect] = useState(false);
  const [unlockedTrueSurvivor, setUnlockedTrueSurvivor] = useState(false);
  const [unlockedMasterEscapist, setUnlockedMasterEscapist] = useState(false);

  useEffect(() => {
    const killsNum = parseInt(highKills, 10);
    const nightsNum = parseInt(highNight, 10);
    
    if (killsNum >= 10) setUnlockedFirstBlood(true);
    if (nightsNum >= 2) setUnlockedArchitect(true);
    if (nightsNum >= 5) setUnlockedTrueSurvivor(true);
    if (localStorage.getItem('last_stand_escaped') === 'true') {
      setUnlockedMasterEscapist(true);
    }

    // Load Decrypted Lore logs collected during active gameplay
    try {
      const logsJson = localStorage.getItem('last_stand_collected_logs');
      if (logsJson) {
        const parsed = JSON.parse(logsJson);
        if (Array.isArray(parsed)) {
          setUnlockedLogIds(parsed);
        }
      } else {
        // Pre-populate lore 1 for better initial interaction so user can test decryption immediately
        localStorage.setItem('last_stand_collected_logs', JSON.stringify(['lore_1']));
        setUnlockedLogIds(['lore_1']);
      }
    } catch (e) {
      setUnlockedLogIds(['lore_1']);
    }
  }, [highKills, highNight]);

  // Seasonal atmosphere particles generator loop
  useEffect(() => {
    const count = previewSeason === 'winter' ? 30 : previewSeason === 'autumn' ? 20 : previewSeason === 'spring' ? 15 : 10;
    const initialParticles = Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * (previewSeason === 'winter' ? 4 : 8) + 2,
      speed: Math.random() * 1 + 0.5,
      angle: Math.random() * 0.4 - 0.2 + (previewSeason === 'winter' ? 0.2 : -0.1),
    }));
    setAtmosphereParticles(initialParticles);

    const interval = setInterval(() => {
      setAtmosphereParticles((prev) =>
        prev.map((p) => {
          let nextY = p.y + p.speed;
          let nextX = p.x + Math.sin(Date.now() * 0.002 + p.id) * 0.2;
          if (nextY > 105) {
            nextY = -5;
            nextX = Math.random() * 100;
          }
          return { ...p, y: nextY, x: nextX };
        })
      );
    }, 45);

    return () => clearInterval(interval);
  }, [previewSeason]);

  const outfitColors = [
    { name: 'Teal Tactical', hex: '#0f766e', locked: false },
    { name: 'Orange Hazard', hex: '#ea580c', locked: false },
    { name: 'Crimson Ops', hex: '#991b1b', locked: false },
    { name: 'Void Purple', hex: '#6b21a8', locked: false },
    { name: 'Golden Champion', hex: '#d97706', locked: !unlockedMasterEscapist }, 
  ];

  const headgears = [
    { id: 'none', label: 'None' },
    { id: 'bandana', label: 'Bandana' },
    { id: 'helmet', label: 'Helmet' },
    { id: 'hood', label: 'Hazmat' },
    { id: 'cap', label: 'Cap' },
  ];

  // Tactical Weapons specifications catalog
  const WEAPONS_CATALOG = [
    {
      id: 'pistol',
      name: 'Pistol C-9',
      category: 'Sidearm',
      desc: 'Standard-issue semi-automatic sidearm. High accuracy, rapid trigger response, but moderate stopping power.',
      damage: 15,
      fireRate: '350ms',
      reload: '1.2s',
      magazine: 12,
      ammoType: '9mm FMJ',
      pros: 'Precise, very quick reload, infinite spare reserve ammo',
      cons: 'Lacks piercing potential and heavy knockback power',
      color: 'bg-slate-400',
    },
    {
      id: 'melee_axe',
      name: 'Firemans Axe',
      category: 'Melee',
      desc: 'Heavy-duty steel firefighter utility axe. Cuts through infected flesh effortlessly with wide-sweeping arcs.',
      damage: 30,
      fireRate: '500ms',
      reload: 'Instant',
      magazine: 'Infinite',
      ammoType: 'Muscular Force',
      pros: 'Consumes zero ammunition, wide knockback cleave angle',
      cons: 'Requires close proximity, leaves you vulnerable to speeders',
      color: 'bg-red-500',
    },
    {
      id: 'shotgun',
      name: 'Tactical Shotgun',
      category: 'Close Quarters',
      desc: '12-gauge pump-action military shotgun. Fires 6 high-velocity lead pellets per trigger pull to shred groups.',
      damage: 60, // 6 pellets * 10
      fireRate: '900ms',
      reload: '1.9s',
      magazine: 6,
      ammoType: '12g Buckshot',
      pros: 'Extreme damage at close range, high group suppression',
      cons: 'Heavy shell spread over distance, long shell reload timing',
      color: 'bg-orange-500',
    },
    {
      id: 'rifle',
      name: 'Assault Rifle A-15',
      category: 'Tactical Rifle',
      desc: 'Fully-automatic gas-operated tactical carbine. Unloads high-penetration 5.56mm ammunition at extreme speeds.',
      damage: 20,
      fireRate: '150ms',
      reload: '1.6s',
      magazine: 30,
      ammoType: '5.56x45mm NATO',
      pros: 'Excellent fire rate, large magazine, destroys giant boss mutants',
      cons: 'Consumes ammunition quickly, higher spray spread when sprinting',
      color: 'bg-blue-500',
    }
  ];

  const LORE_DATABASE = [
    {
      id: 'lore_1',
      title: '📓 PROJECT AEGIS: LAB NOTES #1',
      date: 'Oct 12 — Outbreak',
      preview: 'The experimental cellular research in Sector 4 was meant to cure traumatic physical injury...',
      text: 'Entry Date: October 12.\nThe experimental cellular research in Sector 4 was meant to cure traumatic physical injury. Instead, it triggered total synaptic decay and reanimation within hours of exposure.\n\nWe sealed the primary cleanroom doors, but the ventilation systems were compromised. If you find this log: the pathogen is airborne in sealed buildings. Stay outdoors. Build heavy wooden walls immediately to construct safe barricades.',
    },
    {
      id: 'lore_2',
      title: '📓 SURVIVAL DIARY: FIRST NIGHT #2',
      date: 'Oct 19 — Nightfall',
      preview: 'The screeching... we will never forget the horror of the first night. The infected are hypersensitive...',
      text: 'Entry Date: October 19.\nThe screeching... we will never forget the horror of the first night. The infected are hypersensitive to solar ultraviolet waves; it actively burns their skin and optic nerves, forcing them into dark subterranean cellars during the day.\n\nBut when darkness breaks, they mutate, sprint, and track human scent in packs of dozens. We built a command core here to broadcast signals. If the core goes dark, we all die. Keep the core repaired at all costs!',
    },
    {
      id: 'lore_3',
      title: '📓 MILITARY INTEL: EXTRACTION PROTOCOL #3',
      date: 'Nov 02 — Chopper Standby',
      preview: 'Helicopter command has put a rescue birds chopper on standby. But fuel reserves are critical...',
      text: 'Entry Date: November 2.\nHelicopter command has put a rescue birds chopper on standby. But fuel reserves are critical.\n\nThe pilot radios that they cannot risk a landing until we hold off the horde for at least 15 waves. The hostiles are simply too dense. Defend the base, collect materials, and enlist stray soldiers from metal cages—their extra assault rifles are our only hope.',
    },
    {
      id: 'lore_4',
      title: '📓 SECTOR BRIEFING: SEASONAL DEVIATION #4',
      date: 'Nov 15 — Atmosphere Greenhouse',
      preview: 'The airborne bio-toxin has catalyzed extreme localized greenhouse feedback. Pacing is chaotic...',
      text: 'Entry Date: November 15.\nThe airborne bio-toxin has catalyzed extreme localized greenhouse feedback. Pacing is chaotic. Summer cycles scorch the landscape, draining your water supply 1.5x faster. Winter frost freezes muscle tissue, stalling stamina regeneration.\n\nYour only warmth is the thermal radiation of the central Command Core. Gather canned beans and drink pure water to stay alive!'
    }
  ];

  const currentWeapon = WEAPONS_CATALOG.find(w => w.id === selectedWeaponId) || WEAPONS_CATALOG[0];

  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      playSound('empty_click');
    }
  };

  const handleTestFire = () => {
    if (selectedWeaponId === 'pistol') {
      playSound('shoot_pistol');
    } else if (selectedWeaponId === 'shotgun') {
      playSound('shoot_shotgun');
    } else if (selectedWeaponId === 'rifle') {
      playSound('shoot_rifle');
    } else {
      playSound('swing');
    }
    setSimulateTrigger(prev => prev + 1);
    setSimulatedShotsCount(prev => prev + 1);

    // generate cute mini flashes inside preview
    const newSparks = Array.from({ length: selectedWeaponId === 'shotgun' ? 12 : 5 }).map((_, i) => ({
      id: Math.random() + i,
      x: Math.random() * 80 + 30,
      y: Math.random() * 40 + 20,
      r: Math.random() * 4 + 2,
    }));
    setSimulationSparks(newSparks);
    setTimeout(() => {
      setSimulationSparks([]);
    }, 200);
  };

  return (
    <div className="flex flex-col items-center justify-start h-full w-full bg-slate-950 text-slate-100 select-none relative overflow-y-auto scroll-smooth pb-16">
      
      {/* Background Ambience Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(185,28,28,0.1)_0%,transparent_50%)] pointer-events-none" />
      <div className="absolute top-[800px] left-10 w-[500px] h-[500px] bg-sky-900/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute top-[1600px] right-10 w-[500px] h-[500px] bg-emerald-950/5 blur-3xl rounded-full pointer-events-none" />

      {/* STICKY GLASS HEADER NAVIGATION RAIL */}
      <div className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleScrollTo('sec-hero')}>
          <div className="w-7 h-7 bg-red-600 rounded flex items-center justify-center font-sans font-black text-xs text-white">
            LS
          </div>
          <div>
            <h1 className="text-sm font-bold font-mono tracking-tight text-slate-100">
              LAST <span className="text-red-500">STAND</span>
            </h1>
            <span className="text-[9px] font-mono text-slate-500 block -mt-1">TACTICAL DASHBOARD</span>
          </div>
        </div>

        {/* Quick Nav Anchors */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-mono">
          <button 
            onClick={() => handleScrollTo('sec-hero')} 
            className="text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            🎮 Mission
          </button>
          <button 
            onClick={() => handleScrollTo('sec-gear')} 
            className="text-slate-400 hover:text-sky-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            ⚙️ Customizer
          </button>
          <button 
            onClick={() => handleScrollTo('sec-arsenal')} 
            className="text-slate-400 hover:text-orange-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            🔫 Arsenal
          </button>
          <button 
            onClick={() => handleScrollTo('sec-seasons')} 
            className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            🌱 Weather
          </button>
          <button 
            onClick={() => handleScrollTo('sec-records')} 
            className="text-slate-400 hover:text-yellow-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            🏆 Trophies
          </button>
          <button 
            onClick={() => handleScrollTo('sec-lore')} 
            className="text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            📖 Archives
          </button>
        </nav>

        {/* High Score Banner badge */}
        <div className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg flex items-center gap-2 text-xs font-mono">
          <Trophy className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-[10px] text-slate-400">BEST RUN: <strong className="text-slate-100">WAVE {highNight}</strong></span>
        </div>
      </div>

      {/* HERO / BRIEFING SECTION */}
      <section id="sec-hero" className="max-w-4xl w-full text-center relative z-10 flex flex-col items-center py-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-2"
        >
          <span className="text-[10px] uppercase tracking-[0.4em] text-red-500 font-mono font-bold block mb-1">
            ⚠️ POST-APOCALYPTIC BIO-DEFENSE SANDBOX
          </span>
          <h1 className="text-6xl md:text-8xl font-sans font-black tracking-tighter text-slate-100 uppercase filter drop-shadow-[0_10px_25px_rgba(239,68,68,0.25)] select-none">
            LAST <span className="text-red-600">STAND</span>
          </h1>
          <p className="mt-4 text-slate-300 font-sans text-sm max-w-xl mx-auto leading-relaxed">
            Construct barricades, hire desperate soldiers, and extract from Wave 15. The surrounding atmosphere shifts through extreme seasonal cycles. Survive or perish.
          </p>
        </motion.div>

        {/* Quick scroll indicators */}
        <div className="flex gap-2.5 mt-4 mb-6">
          <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest flex items-center gap-1 animate-pulse">
            🔴 LIVE FREQUENCY BROADCAST ACTIVE
          </span>
        </div>

        {/* Action Button */}
        <motion.button
          onClick={() => onStartGame(difficulty, isHardcore, isSurvivalMode, outfitColor, headgear as any)}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          className="relative px-14 py-4 bg-red-600 hover:bg-red-500 text-white font-sans font-black text-xl rounded border border-red-700 hover:border-red-500 shadow-[0_0_25px_rgba(220,38,38,0.5)] hover:shadow-[0_0_40px_rgba(220,38,38,0.7)] cursor-pointer transition-all flex items-center gap-3 mb-6"
          id="btn-start-game"
        >
          <Play className="w-5 h-5 fill-current text-white animate-pulse" />
          START SURVIVAL MISSION
        </motion.button>

        <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
          Scroll down or use the dashboard to configure parameters <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
        </p>
      </section>

      {/* SECTION 2: GEAR & RULES CUSTOMIZER */}
      <section id="sec-gear" className="w-full max-w-4xl px-4 py-8 border-t border-slate-900">
        <div className="flex flex-col md:flex-row items-start gap-3 mb-6">
          <div className="bg-sky-500/10 p-2 rounded-lg text-sky-400">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-slate-100 font-mono">
              [01] Tactical Customizer & Rules
            </h2>
            <p className="text-xs text-slate-400">Adjust the simulation rules, difficulty tiers, and soldier loadout appearance.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
          
          {/* Rules Panel */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-5 rounded-xl text-left">
            <h3 className="text-xs font-mono font-bold text-red-400 mb-4 border-b border-slate-800 pb-2 uppercase tracking-wider flex items-center gap-1.5">
              ⚠️ MISSION SPECIFICATIONS
            </h3>
            
            {/* Difficulty choices */}
            <div className="mb-5">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide block mb-2">
                Combat Difficulty Rating:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {['easy', 'normal', 'hard'].map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setDifficulty(d as any);
                      playSound('repair');
                    }}
                    className={`py-2 px-3 rounded font-mono text-[11px] font-bold border transition-all cursor-pointer ${
                      difficulty === d
                        ? 'bg-red-500/15 text-red-400 border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.25)]'
                        : 'bg-slate-950/40 text-slate-500 border-slate-850 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {d === 'easy' ? '🟢 RECRUIT' : d === 'normal' ? '🟡 VETERAN' : '🔴 NIGHTMARE'}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-4 pt-2 border-t border-slate-800/60">
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isHardcore}
                  onChange={(e) => {
                    setIsHardcore(e.target.checked);
                    playSound('repair');
                  }}
                  className="mt-1 w-4.5 h-4.5 text-red-600 bg-slate-950 border-slate-800 rounded focus:ring-red-500 focus:ring-2 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-mono font-bold text-slate-200 group-hover:text-white transition-colors flex items-center gap-1.5">
                    💀 HARDCORE MODE (PERMA-DEATH)
                  </span>
                  <span className="block text-[10px] text-slate-400 leading-normal mt-0.5">
                    No checkpoints. One death means total operation failure.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isSurvivalMode}
                  onChange={(e) => {
                    setIsSurvivalMode(e.target.checked);
                    playSound('repair');
                  }}
                  className="mt-1 w-4.5 h-4.5 text-amber-500 bg-slate-950 border-slate-800 rounded focus:ring-amber-500 focus:ring-2 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-mono font-bold text-slate-200 group-hover:text-white transition-colors flex items-center gap-1.5">
                    🥫 SURVIVAL INDICES (HUNGER & THIRST)
                  </span>
                  <span className="block text-[10px] text-slate-400 leading-normal mt-0.5">
                    Adds critical hunger/thirst metabolism timers. You must scavenge canned goods and water.
                  </span>
                </div>
              </label>

            </div>
          </div>

          {/* Character Visualizer */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-5 rounded-xl text-left flex flex-col sm:flex-row gap-5">
            
            {/* Live SVG model preview */}
            <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0 mx-auto">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Model Preview</span>
              <div className="w-28 h-28 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-center relative overflow-hidden shadow-inner">
                
                {/* scanning lasers for decoration */}
                <div className="absolute inset-x-0 h-0.5 bg-sky-500/10 top-1/2 animate-bounce" />

                <svg width="72" height="72" viewBox="0 0 80 80" className="relative drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                  {/* Body representing outfit color */}
                  <circle cx="40" cy="40" r="22" fill={outfitColor} stroke="#1e293b" strokeWidth="2.5" />
                  {/* Head */}
                  <circle cx="40" cy="40" r="10" fill="#fef08a" stroke="#1e293b" strokeWidth="1.5" />
                  {/* Hands */}
                  <circle cx="60" cy="33" r="4.5" fill="#fef08a" stroke="#1e293b" strokeWidth="1" />
                  <circle cx="60" cy="47" r="4.5" fill="#fef08a" stroke="#1e293b" strokeWidth="1" />
                  {/* Pistol barrel */}
                  <rect x="52" y="38" width="14" height="4" fill="#475569" rx="1" />

                  {/* Headgears */}
                  {headgear === 'bandana' && (
                    <>
                      <path d="M 31 38 Q 40 34 49 38 Q 45 42 35 42 Z" fill="#ef4444" />
                      <path d="M 31 38 L 26 36 L 28 42 Z" fill="#ef4444" />
                    </>
                  )}
                  {headgear === 'helmet' && (
                    <path d="M 30 38 Q 40 26 50 38 Q 40 37 30 38 Z" fill="#475569" stroke="#334155" strokeWidth="1.5" />
                  )}
                  {headgear === 'hood' && (
                    <circle cx="40" cy="40" r="12" fill="none" stroke="#eab308" strokeWidth="3.5" opacity="0.9" />
                  )}
                  {headgear === 'cap' && (
                    <>
                      <path d="M 30 38 Q 40 28 50 38 Z" fill="#1d4ed8" />
                      <path d="M 45 36 L 56 36 L 54 40 L 45 40 Z" fill="#1e40af" />
                    </>
                  )}
                </svg>
              </div>
            </div>

            {/* Customizer Selection Options */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-mono font-bold text-sky-400 mb-3 uppercase tracking-wide flex items-center gap-1">
                  ⚔️ ARMOR REQUISITIONS
                </h3>
                
                {/* Outfit Suit Selector */}
                <div className="mb-4">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1.5 font-semibold">
                    Armor Suit Coating:
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {outfitColors.map((col) => (
                      <button
                        key={col.hex}
                        disabled={col.locked}
                        onClick={() => {
                          setOutfitColor(col.hex);
                          playSound('repair');
                        }}
                        title={col.locked ? 'Locked: Complete rescue extraction on Wave 10!' : col.name}
                        className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer relative flex items-center justify-center ${
                          outfitColor === col.hex ? 'scale-110 border-sky-400 ring-2 ring-sky-500/30' : 'border-slate-800 hover:border-slate-600 hover:scale-105'
                        } ${col.locked ? 'opacity-25 cursor-not-allowed' : ''}`}
                        style={{ backgroundColor: col.hex }}
                      >
                        {col.locked && <span className="text-[10px] select-none text-white font-bold">🔒</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Headgears Selector */}
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1.5 font-semibold">
                    Helmet / Headgear Slot:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {headgears.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          setHeadgear(g.id as any);
                          playSound('repair');
                        }}
                        className={`px-2 py-1.5 rounded text-[10px] font-mono border transition-all cursor-pointer font-bold ${
                          headgear === g.id
                            ? 'bg-sky-500/15 text-sky-400 border-sky-500/80 shadow-[0_0_6px_rgba(56,189,248,0.2)]'
                            : 'bg-slate-950/40 text-slate-400 border-slate-850 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        {g.label.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Quick settings panel trigger button */}
        <div className="mt-5 text-center">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-[11px] text-sky-400 hover:text-sky-300 font-mono inline-flex items-center gap-1.5 bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 px-5 py-2 rounded-lg cursor-pointer transition-colors"
          >
            {showSettings ? '🙈 HIDE VIDEO & COGNITIVE CONTROLS' : '⚙️ ADJUST ACCESSABILITY & CAMERA SETTINGS'}
          </button>

          {showSettings && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-4 bg-slate-900/90 border border-slate-800 rounded-xl text-left space-y-4 max-w-2xl mx-auto shadow-xl"
            >
              <h4 className="text-xs font-mono text-sky-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-1.5 flex items-center gap-1">
                ♿ OPTICAL & ASSISTIVE PREFERENCES
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px]">
                {/* UI Scale selection */}
                <div className="bg-slate-950/40 p-2.5 rounded border border-slate-850">
                  <span className="text-slate-300 font-mono font-bold block mb-1">Meters HUD Scale size:</span>
                  <p className="text-[10px] text-slate-500 mb-2 leading-tight">Magnifies system alerts, health labels, and radar.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUiScale('normal')}
                      className={`flex-1 py-1 px-2 rounded border font-mono text-[10px] cursor-pointer font-semibold ${uiScale === 'normal' ? 'bg-sky-500/20 text-sky-400 border-sky-500' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                    >
                      STANDARD
                    </button>
                    <button
                      onClick={() => setUiScale('large')}
                      className={`flex-1 py-1 px-2 rounded border font-mono text-[10px] cursor-pointer font-semibold ${uiScale === 'large' ? 'bg-sky-500/20 text-sky-400 border-sky-500' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                    >
                      MAGNIFIED HUD
                    </button>
                  </div>
                </div>

                {/* Colorblindness palette */}
                <div className="bg-slate-950/40 p-2.5 rounded border border-slate-850">
                  <span className="text-slate-300 font-mono font-bold block mb-1">Colorblindness compensation:</span>
                  <p className="text-[10px] text-slate-500 mb-2 leading-tight">Alters danger zoning colors and health grids.</p>
                  <div className="flex gap-1.5">
                    {['normal', 'protanopia', 'tritanopia'].map((m) => (
                      <button
                        key={m}
                        onClick={() => setColorblindMode(m as any)}
                        className={`flex-1 py-1 rounded border font-mono text-[9px] cursor-pointer uppercase font-bold ${colorblindMode === m ? 'bg-sky-500/20 text-sky-400 border-sky-500' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                      >
                        {m === 'normal' ? 'OFF' : m === 'protanopia' ? 'PROTAN' : 'TRITAN'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-slate-800/60 text-[11px]">
                {/* Camera Shake */}
                <label className="flex items-center gap-3 cursor-pointer bg-slate-950/30 p-2 rounded border border-slate-850/45 hover:bg-slate-950/50">
                  <input
                    type="checkbox"
                    checked={screenShakeEnabled}
                    onChange={(e) => setScreenShakeEnabled(e.target.checked)}
                    className="w-4 h-4 bg-slate-950 border-slate-800 text-sky-500 rounded focus:ring-sky-500 focus:ring-2 cursor-pointer"
                  />
                  <div>
                    <span className="text-slate-200 font-mono font-semibold block">Explosion Screen Shake</span>
                    <span className="text-[9px] text-slate-500 leading-none">Shakes camera during landmines or boss leaps.</span>
                  </div>
                </label>

                {/* Blood Vignette */}
                <label className="flex items-center gap-3 cursor-pointer bg-slate-950/30 p-2 rounded border border-slate-850/45 hover:bg-slate-950/50">
                  <input
                    type="checkbox"
                    checked={flashEffectsEnabled}
                    onChange={(e) => setFlashEffectsEnabled(e.target.checked)}
                    className="w-4 h-4 bg-slate-950 border-slate-800 text-sky-500 rounded focus:ring-sky-500 focus:ring-2 cursor-pointer"
                  />
                  <div>
                    <span className="text-slate-200 font-mono font-semibold block">Crimson Pain Vignette</span>
                    <span className="text-[9px] text-slate-500 leading-none">Flashes red boundaries when damaged by zombies.</span>
                  </div>
                </label>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* SECTION 3: TACTICAL WEAPON ARSENAL INTERACTIVE */}
      <section id="sec-arsenal" className="w-full max-w-4xl px-4 py-8 border-t border-slate-900">
        <div className="flex flex-col md:flex-row items-start gap-3 mb-6">
          <div className="bg-orange-500/10 p-2 rounded-lg text-orange-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-slate-100 font-mono">
              [02] Tactical Weapon Arsenal Showcase
            </h2>
            <p className="text-xs text-slate-400">Review firearms specifications, ammo constraints, and test-fire muzzle reactions live.</p>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* Weapon Selector Side Tab */}
          <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-800 p-3 space-y-2">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-2 px-1">Available Arsenals:</span>
            {WEAPONS_CATALOG.map((weapon) => {
              const isSelected = selectedWeaponId === weapon.id;
              return (
                <button
                  key={weapon.id}
                  onClick={() => {
                    setSelectedWeaponId(weapon.id);
                    playSound('empty_click');
                  }}
                  className={`w-full text-left p-3 rounded-lg border font-mono transition-all cursor-pointer flex items-center justify-between ${
                    isSelected 
                      ? 'bg-orange-500/10 border-orange-500/60 text-orange-400 shadow-md' 
                      : 'bg-slate-950/20 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">{weapon.name}</span>
                    <span className="text-[9px] text-slate-500">{weapon.category}</span>
                  </div>
                  {isSelected && <span className="w-2 h-2 bg-orange-400 rounded-full animate-ping" />}
                </button>
              );
            })}
          </div>

          {/* Interactive Specifications Panel */}
          <div className="md:col-span-8 p-5 flex flex-col justify-between">
            <div>
              
              {/* Category, ID & Core Specs Header */}
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-400 font-bold border border-slate-850">
                  {currentWeapon.category.toUpperCase()} — {currentWeapon.ammoType}
                </span>
                <span className="text-xs text-slate-500 font-mono">CALIBRE SPECIFICATION</span>
              </div>

              <h3 className="text-2xl font-black font-sans text-slate-100 flex items-center gap-2">
                {currentWeapon.name}
              </h3>
              
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {currentWeapon.desc}
              </p>

              {/* STATS PROGRESS BARS */}
              <div className="mt-5 space-y-3">
                
                {/* Damage Stat */}
                <div>
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span className="text-slate-400">🔥 STOPPING DAMAGE:</span>
                    <strong className="text-orange-400">{currentWeapon.damage} HP per round</strong>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                    <div 
                      className="h-full bg-orange-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, (currentWeapon.damage / 60) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Fire Rate Stat */}
                <div>
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span className="text-slate-400">⚡ FIRING INTERVAL:</span>
                    <strong className="text-yellow-400">{currentWeapon.fireRate}</strong>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                    <div 
                      className="h-full bg-yellow-500 transition-all duration-300"
                      style={{ 
                        width: `${
                          currentWeapon.id === 'rifle' ? 95 
                          : currentWeapon.id === 'pistol' ? 70 
                          : currentWeapon.id === 'melee_axe' ? 50 
                          : 25
                        }%` 
                      }}
                    />
                  </div>
                </div>

                {/* Reload Stat */}
                <div>
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span className="text-slate-400">🔄 RELOADING TIMING:</span>
                    <strong className="text-sky-400">{currentWeapon.reload}</strong>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                    <div 
                      className="h-full bg-sky-500 transition-all duration-300"
                      style={{ 
                        width: `${
                          currentWeapon.id === 'melee_axe' ? 100 
                          : currentWeapon.id === 'pistol' ? 80 
                          : currentWeapon.id === 'rifle' ? 60 
                          : 40
                        }%` 
                      }}
                    />
                  </div>
                </div>

                {/* Magazine capacity Stat */}
                <div>
                  <div className="flex justify-between text-[11px] font-mono mb-1">
                    <span className="text-slate-400">🔋 MAGAZINE SIZE:</span>
                    <strong className="text-emerald-400">{currentWeapon.magazine}</strong>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ 
                        width: `${
                          currentWeapon.id === 'melee_axe' ? 0 
                          : currentWeapon.id === 'rifle' ? 95 
                          : currentWeapon.id === 'pistol' ? 50 
                          : 25
                        }%` 
                      }}
                    />
                  </div>
                </div>

              </div>

              {/* Pros & Cons pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800/50 text-[11px] font-mono">
                <div className="bg-emerald-950/20 border border-emerald-900/30 p-2 rounded-lg">
                  <span className="text-emerald-400 font-bold block mb-0.5">👍 OPERATION PRO:</span>
                  <p className="text-slate-300 text-[10px] leading-tight">{currentWeapon.pros}</p>
                </div>
                <div className="bg-red-950/20 border border-red-900/30 p-2 rounded-lg">
                  <span className="text-red-400 font-bold block mb-0.5">👎 STRATEGIC CON:</span>
                  <p className="text-slate-300 text-[10px] leading-tight">{currentWeapon.cons}</p>
                </div>
              </div>

            </div>

            {/* INTERACTIVE WEAPON PREVIEW BOARD */}
            <div className="mt-5 bg-slate-950 border border-slate-850 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center font-mono text-xl">
                  {selectedWeaponId === 'pistol' ? '🔫' : selectedWeaponId === 'melee_axe' ? '🪓' : selectedWeaponId === 'shotgun' ? '💥' : '🔥'}
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-500 font-mono block">SIMULATION OUTLET</span>
                  <span className="text-xs font-mono font-bold text-slate-200">Test barrel ignition feedback</span>
                </div>
              </div>

              {/* Muzzle simulation sparks playground box */}
              <div className="flex-1 max-w-[150px] h-12 relative bg-slate-900 rounded border border-slate-850/80 hidden sm:block">
                {simulationSparks.map(spark => (
                  <div
                    key={spark.id}
                    className="absolute bg-amber-400 rounded-full animate-ping"
                    style={{
                      left: `${spark.x}%`,
                      top: `${spark.y}%`,
                      width: `${spark.r}px`,
                      height: `${spark.r}px`,
                      boxShadow: '0 0 8px #f59e0b',
                    }}
                  />
                ))}
                {simulatedShotsCount > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-slate-600">
                    BANG! x{simulatedShotsCount}
                  </div>
                )}
              </div>

              <button
                onClick={handleTestFire}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-200 hover:text-white rounded font-mono text-xs font-bold flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                <Volume2 className="w-4 h-4 text-orange-400" />
                SIMULATE TRIGGER
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 4: SEASONAL FORECASTER & WILDERNESS ENCYCLOPEDIA */}
      <section id="sec-seasons" className="w-full max-w-4xl px-4 py-8 border-t border-slate-900">
        <div className="flex flex-col md:flex-row items-start gap-3 mb-6">
          <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400">
            <Sun className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-slate-100 font-mono">
              [03] Seasonal Environmental Simulator
            </h2>
            <p className="text-xs text-slate-400">Cycles shift automatically every wave. Click to preview the climate hardships you must survive.</p>
          </div>
        </div>

        {/* Forecast interactive grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {[
            { id: 'spring', label: '🌱 SPRINGTIME', themeColor: 'text-emerald-400 border-emerald-900' },
            { id: 'summer', label: '☀️ SUMMER SCORCH', themeColor: 'text-amber-400 border-amber-900' },
            { id: 'autumn', label: '🍂 AUTUMN MIST', themeColor: 'text-orange-400 border-orange-900' },
            { id: 'winter', label: '❄️ WINTER FROST', themeColor: 'text-sky-400 border-sky-900' },
          ].map((s) => {
            const isSelected = previewSeason === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setPreviewSeason(s.id as any);
                  playSound('repair');
                }}
                className={`py-2 px-3 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-slate-900 text-slate-100 border-slate-700 ring-2 ring-emerald-500/30' 
                    : 'bg-slate-950 text-slate-500 border-slate-850 hover:text-slate-300'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic environmental preview container box */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 relative overflow-hidden min-h-[160px] flex flex-col justify-between">
          
          {/* Ambient Particles Layer */}
          <div className="absolute inset-0 pointer-events-none opacity-55">
            {atmosphereParticles.map((p) => {
              let color = 'bg-white';
              if (previewSeason === 'spring') color = 'bg-emerald-400';
              if (previewSeason === 'summer') color = 'bg-amber-400 shadow-[0_0_8px_#f59e0b]';
              if (previewSeason === 'autumn') color = 'bg-orange-500';
              return (
                <div
                  key={p.id}
                  className={`absolute rounded-full transition-transform ${color}`}
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                  }}
                />
              );
            })}
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 text-slate-400 font-mono text-xs">
              <span>METEOROLOGICAL COMPLIANCE STATUS:</span>
              <span className={`font-bold animate-pulse uppercase ${
                previewSeason === 'spring' ? 'text-emerald-400' 
                : previewSeason === 'summer' ? 'text-amber-400' 
                : previewSeason === 'autumn' ? 'text-orange-400' 
                : 'text-sky-400'
              }`}>
                ● PREVIEWING {previewSeason.toUpperCase()} ENVIRONMENT
              </span>
            </div>

            {/* Content per season */}
            {previewSeason === 'spring' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h4 className="text-lg font-bold text-emerald-400 font-sans">🌿 Seeds of Growth — Wave 1 to 3</h4>
                <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
                  The outbreak begins under standard meteorological indices. Soft humidity aids biological cell regeneration. 
                  <strong className="text-emerald-400"> Medkits recover 20% more health values</strong>. Stray cages containing hostage troopers spawn frequently. Use this period to harvest lumber and metal scrap efficiently!
                </p>
              </motion.div>
            )}

            {previewSeason === 'summer' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h4 className="text-lg font-bold text-amber-400 font-sans">☀️ Scorched Greenhouse Cycle — Wave 4 to 6</h4>
                <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
                  Localized thermal heat rises to critical margins. Hot dry air accelerates human metabolism exhaustion. 
                  <strong className="text-amber-400"> Survival Hunger and Thirst parameters deplete 1.5x faster</strong>. Canned foods and groundwater bottles are mandatory. Be sure to check near the Traveling Merchant for supplies before daytime expires.
                </p>
              </motion.div>
            )}

            {previewSeason === 'autumn' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h4 className="text-lg font-bold text-orange-400 font-sans">🍂 Misty Foliage Infection — Wave 7 to 9</h4>
                <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
                  A heavy orange airborne fog settles over the marshlands, blocking sunlight. 
                  <strong className="text-orange-400"> Player sight radius is severely restricted</strong>. mutated crawler and toxic acid spitters gain 15% swiftness. You must build high-intensity floodlighting or Tesla Traps to protect base perimeters.
                </p>
              </motion.div>
            )}

            {previewSeason === 'winter' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h4 className="text-lg font-bold text-sky-400 font-sans">❄️ Frozen Necrotic Blizzard — Wave 10+</h4>
                <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
                  Arctic temperature winds freeze standard physical muscles. 
                  <strong className="text-sky-400"> Human stamina recoveries are delayed by 75%</strong>. Standing away from the central core for more than 15 seconds will trigger critical freeze damage. Keep your soldier near the radioactive heat of the Base Core!
                </p>
              </motion.div>
            )}
          </div>

          {/* Quick Base fortifications items catalog list */}
          <div className="mt-5 pt-3 border-t border-slate-800/80 relative z-10 text-left">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-2 font-bold">Tactical Base Fortification Items:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-slate-300">
              <div className="bg-slate-950 px-2 py-1.5 rounded border border-slate-850">
                <span className="text-slate-100 font-bold block">🪵 WOOD WALL</span>
                <span>Blocks pathing (Cost: 4 Wood)</span>
              </div>
              <div className="bg-slate-950 px-2 py-1.5 rounded border border-slate-850">
                <span className="text-red-400 font-bold block">⚙️ IRON SPIKES</span>
                <span>Damages walking zombies (5 Scrap)</span>
              </div>
              <div className="bg-slate-950 px-2 py-1.5 rounded border border-slate-850">
                <span className="text-amber-400 font-bold block">📡 AUTO TURRET</span>
                <span>Shoots lasers automatically (12 Scrap)</span>
              </div>
              <div className="bg-slate-950 px-2 py-1.5 rounded border border-slate-850">
                <span className="text-sky-400 font-bold block">⚡ TESLA FENCE</span>
                <span>Electrocutes cluster groups (10 Scrap)</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 5: RECORDS, BEST STATS & ACHIEVEMENTS */}
      <section id="sec-records" className="w-full max-w-4xl px-4 py-8 border-t border-slate-900">
        <div className="flex flex-col md:flex-row items-start gap-3 mb-6">
          <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-500">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-slate-100 font-mono">
              [04] Military Dossier & Records
            </h2>
            <p className="text-xs text-slate-400">Review your historical survival records, high scores, and achievement unlock codes.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full text-left">
          
          {/* Dossier statistics */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-red-400 mb-3 border-b border-slate-800 pb-2">
                🏅 HISTORICAL PERFORMANCE INDEX
              </h3>
              <div className="space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-mono">HIGHEST WAVE ENDURED:</span>
                  <span className="text-slate-100 font-mono text-xl font-black text-amber-400">WAVE {highNight}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-mono">TOTAL ZOMBIE SLAIN:</span>
                  <span className="text-slate-100 font-mono text-xl font-black text-red-500">{highKills} INFECTIONS</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-mono">RESCUE HELICOPTER STATUS:</span>
                  <span className="text-slate-100 font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-950 text-sky-400 border border-slate-850">
                    {parseInt(highNight) >= 10 ? '🚁 STANDBY FOR WAVE 15' : '🔒 INSUFFICIENT FREQUENCY'}
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-500 font-mono mt-4 pt-3 border-t border-slate-850">
              Records are persisted inside client-side LocalStorage state metrics. Clearing browser cookies wipes campaign files.
            </p>
          </div>

          {/* Badges Matrix */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-5 rounded-xl text-left">
            <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-red-400 mb-4 border-b border-slate-800 pb-2">
              🏆 BATTLE UNLOCK CODES
            </h3>
            
            <div className="space-y-4 text-xs">
              
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <span className={`font-bold font-mono block ${unlockedFirstBlood ? 'text-emerald-400' : 'text-slate-500'}`}>
                    🩸 FIRST BLOOD {unlockedFirstBlood && '✓'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                    Kill 10 total zombies. Gives <strong className="text-slate-200">+5 starter scrap</strong> metal.
                  </span>
                </div>
                <div className="text-lg">{unlockedFirstBlood ? '⭐' : '🔒'}</div>
              </div>

              <div className="flex items-start justify-between gap-4 border-t border-slate-850 pt-3">
                <div className="flex-1">
                  <span className={`font-bold font-mono block ${unlockedArchitect ? 'text-emerald-400' : 'text-slate-500'}`}>
                    🛠️ BASE ARCHITECT {unlockedArchitect && '✓'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                    Survive at least 1 wave cycle. Gives <strong className="text-slate-200">+10 starting lumber</strong> logs.
                  </span>
                </div>
                <div className="text-lg">{unlockedArchitect ? '⭐' : '🔒'}</div>
              </div>

              <div className="flex items-start justify-between gap-4 border-t border-slate-850 pt-3">
                <div className="flex-1">
                  <span className={`font-bold font-mono block ${unlockedTrueSurvivor ? 'text-emerald-400' : 'text-slate-500'}`}>
                    🏆 TRUE SURVIVOR {unlockedTrueSurvivor && '✓'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                    Survive until Wave 5. Upgrades starting Pistol fire velocity.
                  </span>
                </div>
                <div className="text-lg">{unlockedTrueSurvivor ? '⭐' : '🔒'}</div>
              </div>

              <div className="flex items-start justify-between gap-4 border-t border-slate-850 pt-3">
                <div className="flex-1">
                  <span className={`font-bold font-mono block ${unlockedMasterEscapist ? 'text-emerald-400' : 'text-slate-500'}`}>
                    🚁 MASTER ESCAPIST {unlockedMasterEscapist && '✓'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                    Successfully complete Wave 10 rescue. Unlocks <strong className="text-amber-400">Golden Champion Suit</strong> skin!
                  </span>
                </div>
                <div className="text-lg">{unlockedMasterEscapist ? '⭐' : '🔒'}</div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* SECTION 6: LORE DIARIES RECORDINGS ARCHIVES (DECRYPTER) */}
      <section id="sec-lore" className="w-full max-w-4xl px-4 py-8 border-t border-slate-900">
        <div className="flex flex-col md:flex-row items-start gap-3 mb-6">
          <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-slate-100 font-mono">
              [05] Apocalypse Recording Logs
            </h2>
            <p className="text-xs text-slate-400">Decipher frequency chips recovered from hidden coordinates across the wilderness during runs.</p>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <span className="text-xs font-mono text-slate-400">
              UNLOCKED PAGES: <strong className="text-blue-400">{unlockedLogIds.length} / 4</strong>
            </span>
            <span className="text-[10px] font-mono text-slate-500">COLLECT PAGES IN-GAME TO ACCESS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LORE_DATABASE.map((log) => {
              const isUnlocked = unlockedLogIds.includes(log.id);
              const isReading = readingLogId === log.id;
              
              return (
                <div
                  key={log.id}
                  className={`border rounded-lg p-3 text-left transition-all ${
                    isUnlocked 
                      ? 'bg-slate-950/40 border-slate-800 hover:border-blue-500/50 cursor-pointer' 
                      : 'bg-slate-950/20 border-slate-900 opacity-60'
                  }`}
                  onClick={() => {
                    if (isUnlocked) {
                      setReadingLogId(isReading ? null : log.id);
                      playSound('repair');
                    }
                  }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className={`text-[11px] font-mono font-bold ${isUnlocked ? 'text-blue-400' : 'text-slate-500'}`}>
                      {isUnlocked ? '📓 DECRYPTED TRANSMISSION' : '🔒 ENCRYPTED FREQUENCY'}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">{log.date}</span>
                  </div>

                  <h4 className="text-sm font-bold font-sans mt-1 text-slate-100">
                    {isUnlocked ? log.title : 'Lost Frequency Log Page'}
                  </h4>

                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                    {isUnlocked ? log.preview : 'Found on scattered coordinates across the map wilderness.'}
                  </p>

                  {isUnlocked && (
                    <span className="text-[9px] font-mono text-blue-400 mt-2 block hover:underline">
                      {isReading ? '✕ Close Log View' : '📖 Read decoded text...'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* ACTIVE READING DIARY SLIDE-OUT CONTAINER */}
          <AnimatePresence>
            {readingLogId && (() => {
              const activeLog = LORE_DATABASE.find(l => l.id === readingLogId);
              if (!activeLog) return null;
              return (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-5 bg-amber-50 rounded-xl border border-amber-300 text-amber-950 font-serif shadow-inner text-left text-sm leading-relaxed whitespace-pre-line"
                >
                  <div className="flex justify-between items-start border-b border-amber-200 pb-2 mb-3">
                    <span className="text-[10px] font-mono text-amber-700 font-bold uppercase tracking-widest">APOCALYPSE FREQUENCY RECORDING</span>
                    <button 
                      onClick={() => setReadingLogId(null)}
                      className="text-amber-800 hover:text-black font-sans text-xs font-bold"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <h3 className="text-base font-bold font-sans text-amber-900 mb-2">{activeLog.title}</h3>
                  <p className="text-amber-900/90 leading-relaxed font-medium">
                    {activeLog.text}
                  </p>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      </section>

      {/* FOOTER BRUTALIST ACCENTS */}
      <footer className="mt-12 text-center text-slate-600 font-mono text-[11px] tracking-wide max-w-lg px-4 border-t border-slate-900/60 pt-6">
        <span>© Sector-9 Sandbox Survival Terminal Command.</span>
        <span className="block mt-1">Deploy, Build defenses, Command allies, Extract Wave 15. All rights reserved.</span>
      </footer>

    </div>
  );
}

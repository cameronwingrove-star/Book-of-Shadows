import { LucideIcon } from 'lucide-react';

export type TileType = 'property' | 'portal' | 'nexus' | 'fate' | 'shrine' | 'drain' | 'void' | 'battle' | 'quest' | 'rescue' | 'trial' | 'potion' | 'shield' | 'raid' | 'heist';

export interface TileData {
  id: number;
  name: string;
  type: TileType;
  manaCost?: number;
  essenceYield?: number;
  color?: string;
  enchantmentLevel?: number;
  icon?: string;
  image?: string; // High-res location image
  enemyPower?: number; // For battles
  reward?: number; // For quests
}

export interface BattleState {
  enemyName: string;
  enemyHealth: number;
  maxEnemyHealth: number;
  enemyImage?: string;
  playerHealth: number;
  maxPlayerHealth: number;
  isActive: boolean;
  log: string[];
  damageDealt?: number | null;
  damageTaken?: number | null;
  isConquerBattle?: boolean;
  tileId?: number;
  battleType?: 'combat' | 'rescue' | 'trial';
  nexusBuffs?: {
    magicBoost?: number; // turns remaining
    shield?: number; // turns remaining
  };
  nexusInteractions?: {
    scryingUsedCount?: number;
    grimoireUsedCount?: number;
    altarsUsedCount?: number;
  };
  isResolvingAction?: boolean;
}

export interface DailyQuest {
  id: string;
  description: string;
  target: number;
  current: number;
  rewardEssence: number;
  rewardGems: number;
  isCompleted: boolean;
}

export interface PuzzleStep {
  id: string;
  description: string;
  image?: string;
  options: { label: string; outcome: 'next' | 'fail' | 'success'; }[];
}

export interface Puzzle {
  id: string;
  title: string;
  steps: PuzzleStep[];
  currentStepIndex: number;
}

export interface QuestState {
  id: string;
  title: string;
  description: string;
  options: { label: string; outcome: () => void; style?: 'primary' | 'secondary' | 'danger' }[];
  isActive: boolean;
  image?: string;
}

export type Element = 'Fire' | 'Water' | 'Earth' | 'Air' | 'None';

export interface Spell {
  id: string;
  name: string;
  description: string;
  manaCost: number;
  effect: 'damage' | 'heal' | 'shield' | 'freeze';
  power: number;
  icon: string;
  element: Element;
}

export interface CharmedCharacter {
  id: string;
  name: string;
  avatar: string;
  battleSprite: string; // Action sprite for battle
  powerName: string;
  specialSpellId: string;
  description: string;
  passiveName: string;
  passiveDescription: string;
}

export interface CoopRescue {
  id: string;
  inviterId: string;
  inviterName: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  createdAt: number;
  bossHealth: number;
  maxBossHealth: number;
  log: string[];
}

export interface PvPChallenge {
  id: string;
  inviterId: string;
  inviterName: string;
  inviterCharacterId: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  winnerId?: string;
  createdAt: number;
  // Battle state for sync
  battleState?: {
    inviterHealth: number;
    inviteeHealth: number;
    turnId: string;
    log: string[];
    lastAction?: 'attack' | 'spell' | 'focus';
    lastDamage?: number;
  }
}

export interface BuildNode {
  id: string;
  name: string;
  description: string;
  cost: number;
  level: number;
  maxLevel: number;
  icon: string;
  x: number; // percentage from left
  y: number; // percentage from top
}

export interface World {
  id: string;
  name: string;
  description: string;
  image: string;
  nodes: BuildNode[];
  requiredLevel: number;
}

export interface GameCard {
  id: string;
  title: string;
  content: string;
  type: 'chance' | 'chest';
  action: (state: GameState, setState: (update: (prev: GameState) => GameState) => void) => void;
}

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  cost: number;
  reqs: string[];
  icon: string;
  gridRow: number;
  gridCol: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  points: number;
  unlockedAt?: number;
}

export interface GameSettings {
  volume: number;
  musicEnabled: boolean;
  notificationsEnabled: boolean;
  difficulty: 'easy' | 'normal' | 'hard';
  animationSpeed: 'slow' | 'normal' | 'fast';
  theme: 'dark' | 'light' | 'gothic';
  enableKeyboardShortcuts: boolean;
}

export interface GameState {
  characterId: string;
  mana: number;
  gems: number;
  xp: number;
  level: number;
  floor: number;
  position: number;
  scrollsRemaining: number;
  bookScrolls: number;
  lastCast: [number, number] | null;
  sanctuariesOwned: number[];
  buildingUpgrades: { [tileId: number]: number };
  visitedTile: TileData | null;
  isCasting: boolean;
  chronicle: string[];
  lastDailyReward?: number;
  lastLogin?: number;
  currentStreak: number;
  dailyRaidsCount?: number;
  dailyRaidedUids?: string[];
  lastRaidDateString?: string;
  activeSpellId?: string;
  unlockedSpellIds: string[];
  hasSeenTutorial?: boolean;
  tutorialPhase?: number;
  seenStoryIds: string[];
  potions: number;
  currentWorldId: string;
  worldProgress: Record<string, Record<string, number>>; // worldId -> nodeId -> level
  nodeHealth?: Record<string, Record<string, number>>; // worldId -> nodeId -> health (0-100)
  skillPoints?: number;
  unlockedSkills?: string[];
  health: number;
  maxHealthCache?: number;
  inventory?: string[];
  equippedRelicId?: string;
  activePuzzle: Puzzle | null;
  settings: GameSettings;
  achievements: Achievement[];
  specialPoints: number;
  dailyQuests: DailyQuest[];
  shields: number;
  shieldedNodes?: Record<string, string[]>; // worldId -> nodeId[]
}

export interface TutorialStep {
  id: string;
  targetId: string; // DOM element ID to highlight
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface Relic {
  id: string;
  name: string;
  description: string;
  effect: 'dodge' | 'essence' | 'damage' | 'health';
  power: number;
  image: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  level: number;
  floor: number;
  characterId: string;
  lastSeen?: number;
}

export const BOARD_SIZE = 24;

export const BOARD_CONFIG: TileData[] = [
  { id: 0, name: 'Halliwell Manor', type: 'portal', icon: 'Home', image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&q=80&w=400' },
  { id: 1, name: 'Quake Cafe', type: 'property', manaCost: 100, essenceYield: 15, color: 'bg-amber-600', image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=400' },
  { id: 2, name: 'Book of Shadows Fate', type: 'fate', icon: 'Sparkles', image: 'https://images.unsplash.com/photo-1516483585012-709564006c7a?auto=format&fit=crop&q=80&w=400' },
  { id: 3, name: 'Buckland’s Auction', type: 'property', manaCost: 120, essenceYield: 18, color: 'bg-amber-600', image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=400' },
  { id: 4, name: 'Grimlock Duel', type: 'battle', icon: 'Skull', enemyPower: 120, image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400' },
  { id: 5, name: 'P3 Nightclub', type: 'property', manaCost: 150, essenceYield: 25, color: 'bg-purple-600', image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=400' },
  { id: 6, name: 'Rescue Mission: Manor Gates', type: 'rescue', icon: 'Heart', image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=400' },
  { id: 7, name: 'San Francisco Police', type: 'property', manaCost: 200, essenceYield: 30, color: 'bg-blue-600', image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=400' },
  { id: 8, name: 'Astral Scrying (Heist)', type: 'heist', icon: 'Eye', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400' },
  { id: 9, name: 'Golden Gate Bridge', type: 'property', manaCost: 220, essenceYield: 35, color: 'bg-orange-600', image: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&q=80&w=400' },
  { id: 10, name: 'Alcatraz Island', type: 'property', manaCost: 240, essenceYield: 40, color: 'bg-slate-600', image: 'https://images.unsplash.com/photo-1520110120281-9b63a949646b?auto=format&fit=crop&q=80&w=400' },
  { id: 11, name: 'Nexus of Shadows', type: 'nexus', icon: 'Zap', image: 'https://images.unsplash.com/photo-1518111925345-562778a87677?auto=format&fit=crop&q=80&w=400' },
  { id: 12, name: 'The Source Citadel', type: 'property', manaCost: 300, essenceYield: 50, color: 'bg-red-700', image: 'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?auto=format&fit=crop&q=80&w=400' },
  { id: 13, name: 'Halliwell Legacy Chest', type: 'quest', icon: 'Sparkles', image: 'https://images.unsplash.com/photo-1516483585012-709564006c7a?auto=format&fit=crop&q=80&w=400' },
  { id: 14, name: 'Bay Mirror Office', type: 'property', manaCost: 320, essenceYield: 55, color: 'bg-indigo-600', image: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=400' },
  { id: 15, name: 'Demon Wasteland', type: 'property', manaCost: 350, essenceYield: 65, color: 'bg-red-900', image: 'https://images.unsplash.com/photo-1502481851512-e9e2529bbbf9?auto=format&fit=crop&q=80&w=400' },
  { id: 16, name: 'Underworld Demolition (Raid)', type: 'raid', icon: 'Swords', image: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&q=80&w=400' },
  { id: 17, name: 'The Elders Realm', type: 'property', manaCost: 400, essenceYield: 80, color: 'bg-sky-400', image: 'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?auto=format&fit=crop&q=80&w=400' },
  { id: 18, name: 'Prophecy Arch', type: 'quest', icon: 'Eye', image: 'https://images.unsplash.com/photo-1524169358666-79f22534bc6e?auto=format&fit=crop&q=80&w=400' },
  { id: 19, name: 'Magic School', type: 'property', manaCost: 450, essenceYield: 90, color: 'bg-yellow-600', image: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&q=80&w=400' },
  { id: 20, name: 'Power Strip', type: 'drain', icon: 'ZapOff', image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&q=80&w=400' },
  { id: 21, name: 'The Ice Palace', type: 'property', manaCost: 550, essenceYield: 120, color: 'bg-cyan-500', image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&q=80&w=400' },
  { id: 22, name: 'Angelic Aegis', type: 'shield', icon: 'Shield', image: 'https://images.unsplash.com/photo-1550226891-ef816aed4ca8?auto=format&fit=crop&q=80&w=400' },
  { id: 23, name: 'Sanctum Sanctorum', type: 'property', manaCost: 600, essenceYield: 150, color: 'bg-rose-500', image: 'https://images.unsplash.com/photo-1464817739973-0128fe72a500?auto=format&fit=crop&q=80&w=400' },
];


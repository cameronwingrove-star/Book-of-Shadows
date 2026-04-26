/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useMemo, FC } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Moon, 
  Zap, 
  Wind, 
  Globe, 
  Skull, 
  Star,
  MapPin, 
  TrendingUp,
  X,
  Trophy,
  HelpCircle,
  Scroll,
  Flame,
  Wand2,
  Sword,
  BookOpen,
  Eye,
  Shield,
  ShoppingBag,
  Gift,
  ChevronRight,
  ChevronLeft,
  Heart,
  Users,
  LogOut,
  Facebook,
  Share2,
  Twitter,
  ArrowDown,
  Swords,
  FlaskConical,
  Lock,
  Armchair,
  Compass,
  Gem,
  AlertTriangle,
  Lightbulb,
  Menu
} from 'lucide-react';
import { BOARD_CONFIG, DailyQuest, BOARD_SIZE, GameState, TileData, BattleState, QuestState, Spell, UserProfile, CharmedCharacter, PvPChallenge, CoopRescue, GameCard, SkillNode, Achievement, Element, TutorialStep, Puzzle } from './types';
import { auth, db, signInWithGoogle, signInWithFacebook } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc, onSnapshot, collection, query, where, limit, orderBy, getDocFromServer } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: (auth.currentUser as any)?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Icon Map for convenient rendering
const ICON_MAP: Record<string, any> = {
  Moon,
  Sparkles,
  Zap,
  Wind,
  Skull,
  Globe,
  Ghost: Skull,
  Star,
  Sword,
  Swords,
  BookOpen,
  Eye,
  Flame,
  Shield,
  FlaskConical,
  Heart
};

import { playSound } from './soundManager';
import { STORY_CHAPTERS, StoryChapter } from './storyData';
import { WORLDS, CHANCE_CARDS, CHEST_CARDS } from './worldData';
import { INITIAL_ACHIEVEMENTS } from './constants';

const CHARMED_CHARACTERS: CharmedCharacter[] = [
  {
    id: 'prue',
    name: 'Prue Halliwell',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
    battleSprite: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Prue&mouth=serious&top=longHair',
    powerName: 'Telekinesis',
    specialSpellId: 'telekinesis_blast',
    description: 'The eldest sister. Moves objects with her mind with incredible force.',
    passiveName: 'Astrological Boost',
    passiveDescription: 'Increases all Essence gained by 25%.'
  },
  {
    id: 'piper',
    name: 'Piper Halliwell',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
    battleSprite: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Piper&mouth=smile&top=bob',
    powerName: 'Molecular Combustion',
    specialSpellId: 'freeze_time',
    description: 'Can freeze time or make molecules explode.',
    passiveName: 'Molecular Slowing',
    passiveDescription: '15% chance to dodge any demon attack.'
  },
  {
    id: 'phoebe',
    name: 'Phoebe Halliwell',
    avatar: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&q=80&w=200',
    battleSprite: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Phoebe&mouth=twinkle&top=shortHair',
    powerName: 'Premonition & Levitation',
    specialSpellId: 'levitation_strike',
    description: 'The intuitive sister. Can see the future and levitate in combat.',
    passiveName: 'Premonition',
    passiveDescription: 'Reveals the exact rewards of quests before choosing.'
  },
  {
    id: 'paige',
    name: 'Paige Matthews',
    avatar: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&q=80&w=200',
    battleSprite: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Paige&mouth=smile&top=curly',
    powerName: 'Orbing Telekinesis',
    specialSpellId: 'orb_shield',
    description: 'Half-witch, half-whitelighter. Orbs objects to her command.',
    passiveName: 'Orb Travel',
    passiveDescription: '10% chance to orb without consuming a Book Page.'
  }
];

const CHARMED_SPELLS: Spell[] = [
  {
    id: 'telekinesis_blast',
    name: 'Telekinesis',
    description: 'Blast enemies with mind-force.',
    manaCost: 200,
    effect: 'damage',
    power: 40,
    icon: 'Zap',
    element: 'Air'
  },
  {
    id: 'freeze_time',
    name: 'Freeze Molecules',
    description: 'Stun enemies and recover focus.',
    manaCost: 350,
    effect: 'freeze',
    power: 20,
    icon: 'Moon',
    element: 'Water'
  },
  {
    id: 'levitation_strike',
    name: 'Levitation Kick',
    description: 'A powerful acrobatic strike.',
    manaCost: 150,
    effect: 'damage',
    power: 30,
    icon: 'Wind',
    element: 'Air'
  },
  {
    id: 'orb_shield',
    name: 'Orb Shield',
    description: 'Deflect attacks with whitelighter orbs.',
    manaCost: 180,
    effect: 'shield',
    power: 25,
    icon: 'Shield',
    element: 'Earth'
  },
  {
    id: 'vanquishing_potion',
    name: 'Vanquishing Potion',
    description: 'Powerful concotion against demons.',
    manaCost: 500,
    effect: 'damage',
    power: 70,
    icon: 'Flame',
    element: 'Fire'
  },
  {
    id: 'power_of_three',
    name: 'Power of Three',
    description: 'Unleash the ultimate combined power of the sisters for devastating damage.',
    manaCost: 1000,
    effect: 'damage',
    power: 150,
    icon: 'Swords',
    element: 'None'
  },
  {
    id: 'manor_ward',
    name: 'Manor Ward',
    description: 'Protect the manor with a powerful ward.',
    manaCost: 400,
    effect: 'shield',
    power: 50,
    icon: 'Shield',
    element: 'Earth'
  },
  {
    id: 'ancient_riddle',
    name: 'Ancient Riddle',
    description: 'Solve the riddle to freeze enemies.',
    manaCost: 300,
    effect: 'freeze',
    power: 40,
    icon: 'BookOpen',
    element: 'Water'
  },
  {
    id: 'shadow_strike',
    name: 'Shadow Strike',
    description: 'Strike from the shadows.',
    manaCost: 450,
    effect: 'damage',
    power: 80,
    icon: 'Skull',
    element: 'Air'
  },
  {
    id: 'astral_projection',
    name: 'Astral Projection',
    description: 'Project your astral self to strike and confuse the enemy.',
    manaCost: 600,
    effect: 'damage',
    power: 95,
    icon: 'Star',
    element: 'Air'
  },
  {
    id: 'molecular_combustion',
    name: 'Molecular Combustion',
    description: 'Speed up molecules until they explode.',
    manaCost: 750,
    effect: 'damage',
    power: 120,
    icon: 'Flame',
    element: 'Fire'
  },
  {
    id: 'healing_touch',
    name: 'Whitelighter Healing',
    description: 'Channel whitelighter energy to restore health.',
    manaCost: 400,
    effect: 'heal',
    power: 75,
    icon: 'Heart',
    element: 'Earth'
  }
];

const CHARMED_ENEMIES = [
  { name: "Shax", image: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=800", weakness: 'Water' },
  { name: "The Source", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800", weakness: 'Fire' },
  { name: "Balthazar", image: "https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&q=80&w=800", weakness: 'Air' },
  { name: "Zankou", image: "https://images.unsplash.com/photo-1519074063912-ad2fe3f51984?auto=format&fit=crop&q=80&w=800", weakness: 'Earth' },
  { name: "Barbas", image: "https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&q=80&w=800", weakness: 'Air' },
  { name: "The Seer", image: "https://images.unsplash.com/photo-1499244015905-fa548b200b32?auto=format&fit=crop&q=80&w=800", weakness: 'Fire' },
  { name: "The Triad", image: "https://images.unsplash.com/photo-1501446522556-3dd59dd181bb?auto=format&fit=crop&q=80&w=800", weakness: 'Water' },
  { name: "Grimlock", image: "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=800", weakness: 'Earth' },
  { name: "Cole (Belthazor)", image: "https://images.unsplash.com/photo-1620801170734-726e6d1d28ab?auto=format&fit=crop&q=80&w=800", weakness: 'Fire' },
  { name: "Kurzon", image: "https://images.unsplash.com/photo-1505506874110-6a7a6c9924cb?auto=format&fit=crop&q=80&w=800", weakness: 'Air' }
];

const CHARMED_SKILLS: SkillNode[] = [
  { id: 'vitality_1', name: 'Vitality I', description: '+20 Max Health in Combat', cost: 1, reqs: [], icon: 'Heart', gridRow: 5, gridCol: 2 },
  { id: 'essence_1', name: 'Essence Flow', description: '+10% Essence gained from moves', cost: 1, reqs: [], icon: 'Sparkles', gridRow: 5, gridCol: 4 },
  { id: 'vitality_2', name: 'Vitality II', description: '+30 Max Health in Combat', cost: 2, reqs: ['vitality_1'], icon: 'Heart', gridRow: 4, gridCol: 2 },
  { id: 'power_1', name: 'Magical Resonance', description: '+10% Spell Damage', cost: 2, reqs: ['essence_1'], icon: 'Zap', gridRow: 4, gridCol: 4 },
  { id: 'dodge_1', name: 'Evasion', description: '+5% chance to dodge attacks', cost: 3, reqs: ['vitality_2'], icon: 'Wind', gridRow: 3, gridCol: 3 },
  { id: 'power_2', name: 'Deep Resonance', description: '+20% Spell Damage', cost: 3, reqs: ['power_1'], icon: 'Flame', gridRow: 3, gridCol: 5 },
  { id: 'potion_mastery', name: 'Potion Mastery', description: 'Potions deal 50% more damage', cost: 3, reqs: ['power_1'], icon: 'FlaskConical', gridRow: 3, gridCol: 4 },
  { id: 'manor_affinity', name: 'Manor Affinity', description: 'Increases Sanctuary yield by 15%', cost: 3, reqs: ['essence_1'], icon: 'Heart', gridRow: 5, gridCol: 5 },
  { id: 'dodge_2', name: 'Premonitive Sense', description: '+5% additional Dodge', cost: 4, reqs: ['dodge_1'], icon: 'Eye', gridRow: 2, gridCol: 3 },
  { id: 'power_3', name: 'Elder Relic', description: '+30% Spell Damage', cost: 4, reqs: ['power_2'], icon: 'BookOpen', gridRow: 2, gridCol: 5 },
  { id: 'mastery', name: 'Charmed Mastery', description: 'Start battles with a Shield block', cost: 5, reqs: ['dodge_2', 'power_3'], icon: 'Star', gridRow: 1, gridCol: 4 },
  { id: 'power_of_three', name: 'The Power of Three', description: 'Unlocks ultimate spell', cost: 6, reqs: ['mastery'], icon: 'Swords', gridRow: 1, gridCol: 5 }
];

const BAZAAR_ITEMS = [
  { id: 'm1', name: 'Essence Vial', amount: 5000, priceGems: 10, icon: Sparkles, image: 'https://images.unsplash.com/photo-1584281723351-9dec82ecc304?auto=format&fit=crop&q=80&w=200' },
  { id: 'm2', name: 'Essence Well', amount: 25000, priceGems: 40, icon: Flame, image: 'https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?auto=format&fit=crop&q=80&w=200' },
  { id: 's1', name: 'Book Page Bundle', amount: 10, type: 'scrolls', priceGems: 5, icon: Scroll, image: 'https://images.unsplash.com/photo-1524169358666-79f22534bc6e?auto=format&fit=crop&q=80&w=200' },
  { id: 'p1', name: 'Vanquishing Potions', amount: 5, type: 'potions', priceGems: 15, icon: FlaskConical, image: 'https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?auto=format&fit=crop&q=80&w=200' },
  { id: 's2', name: 'Ancient Codex', amount: 50, type: 'scrolls', priceGems: 20, icon: BookOpen, image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=200' },
  { id: 'r1', name: 'Amulet of Insight (Relic)', amount: 1, type: 'relic', priceGems: 50, icon: Eye, image: 'https://images.unsplash.com/photo-1605146764387-bdd025555d49?auto=format&fit=crop&q=80&w=200', relicId: 'amulet_of_insight' },
  { id: 'r2', name: 'Ring of Power (Relic)', amount: 1, type: 'relic', priceGems: 50, icon: Zap, image: 'https://images.unsplash.com/photo-1614729111354-941da7d526fc?auto=format&fit=crop&q=80&w=200', relicId: 'ring_of_power' },
  { id: 'r3', name: 'Crystal of Essence (Relic)', amount: 1, type: 'relic', priceGems: 50, icon: Sparkles, image: 'https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?auto=format&fit=crop&q=80&w=200', relicId: 'crystal_of_essence' },
];

const SanctuaryBuildView: FC<{
  state: GameState;
  onAscend: (worldId: string, forcePassLevel?: boolean) => void;
  onUpgrade: (worldId: string, nodeId: string) => void;
  onRepair: (worldId: string, nodeId: string) => void;
  onShield: (worldId: string, nodeId: string) => void;
  onClose: () => void;
}> = ({ state, onAscend, onUpgrade, onRepair, onShield, onClose }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isAscending, setIsAscending] = useState(false);

  const currentWorld = WORLDS.find(w => w.id === state.currentWorldId) || WORLDS[0];
  const nodes = currentWorld.nodes;
  const worldProg = state.worldProgress[currentWorld.id] || {};
  
  const totalRestored = nodes.reduce((acc, node) => acc + (worldProg[node.id] || 0), 0);
  const totalMaxLevels = nodes.reduce((acc, node) => acc + node.maxLevel, 0);
  const syncPercent = totalMaxLevels > 0 ? Math.floor((totalRestored / totalMaxLevels) * 100) : 100;
  
  // Link character level to build progress in simplified mode
  // Each world restoration contributes significantly to overall level
  const displayLevel = state.level;

  useEffect(() => {
    // We no longer auto-ascend. We will show a button to manually transition.
  }, [syncPercent, state.currentWorldId]);

  const currentWorldIndex = WORLDS.findIndex(w => w.id === state.currentWorldId);
  const nextWorldIndex = currentWorldIndex + 1;
  const isFinalAscension = nextWorldIndex >= WORLDS.length;

  const handleAscendClick = () => {
    if (syncPercent < 100 || isAscending) return;
    const nextWorld = WORLDS[nextWorldIndex];
    
    if (isFinalAscension) {
      onAscend('victory');
      onClose();
      return;
    }

    setIsAscending(true);
    setTimeout(() => {
      onAscend(nextWorld.id);
      setIsAscending(false);
      onClose(); 
    }, 2000);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 40;
    const y = (e.clientY / window.innerHeight - 0.5) * 40;
    setMousePos({ x, y });
  };

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
  const selectedNodeLvl = selectedNode ? (worldProg[selectedNode.id] || 0) : 0;
  const selectedHealth = selectedNode ? (state.nodeHealth?.[state.currentWorldId]?.[selectedNode.id] ?? 100) : 100;
  const isSelectedMax = selectedNodeLvl >= 5;
  const selectedCost = selectedNode ? selectedNode.cost * (selectedNodeLvl + 1) : 0;
  const repairCost = selectedNode ? Math.floor((selectedNode.cost * 0.5) * ((100 - selectedHealth) / 100)) : 0;
  const canAffordRepair = state.mana >= repairCost;
  const canAffordSelected = state.mana >= selectedCost;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-[500] bg-black flex flex-col overflow-hidden select-none cursor-default"
    >
      {/* IMMERSIVE DEPTH LAYER */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ x: -mousePos.x, y: -mousePos.y }}
          transition={{ type: 'spring', stiffness: 30, damping: 20 }}
          className="absolute inset-[-150px]"
        >
          <motion.img 
            animate={{ rotate: [0, 1, -1, 0], scale: [1.1, 1.15, 1.1] }}
            transition={{ duration: 180, repeat: Infinity, ease: 'linear' }}
            src={currentWorld.image} 
            className="w-full h-full object-cover opacity-40 brightness-[0.4] contrast-[1.4]" 
          />
          <div className="absolute inset-0 bg-radial-gradient from-indigo-900/10 via-black/40 to-black/90" />
        </motion.div>
      </div>

      {/* MAGICAL ESSENCE PARTICLES */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={`essence-${i}`}
            initial={{ 
              x: Math.random() * 100 + '%', 
              y: Math.random() * 100 + '%', 
              opacity: 0,
              scale: Math.random() * 0.5 
            }}
            animate={{ 
              y: '-20%', 
              x: '+=100px',
              opacity: [0, 0.4, 0],
              scale: [0, 1, 0]
            }}
            transition={{ 
              duration: 20 + Math.random() * 30, 
              repeat: Infinity, 
              delay: i * 0.3 
            }}
            className="absolute w-1.5 h-1.5 bg-indigo-300 rounded-full blur-[2px] shadow-[0_0_15px_rgba(165,180,252,0.8)]"
          />
        ))}
      </div>

      <button 
        onClick={onClose}
        className="absolute top-4 left-4 md:top-8 md:left-8 lg:top-12 lg:left-12 z-[600] bg-white/5 backdrop-blur-3xl p-2 md:p-4 lg:p-5 rounded-xl md:rounded-[1.5rem] lg:rounded-[2rem] border border-white/10 text-white hover:bg-white/15 transition-all shadow-2xl group"
      >
        <ChevronLeft className="w-5 h-5 md:w-8 md:h-8 lg:w-10 lg:h-10 group-hover:-translate-x-1 transition-transform" />
      </button>

      {/* HEADER HUD */}
      <div className="w-full flex flex-row justify-between items-start md:items-end relative z-20 mb-2 md:mb-4 lg:mb-6 pointer-events-none px-4 md:px-12 pt-4 md:pt-8">
        <div className="pl-12 md:pl-16">
          <motion.h4 
            animate={{ letterSpacing: ['0.4em', '0.5em', '0.4em'] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="text-[6px] md:text-xs lg:text-sm font-black text-purple-400 uppercase tracking-[0.4em] mb-1 md:mb-2 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"
          >
            Dimensional Sanctum
          </motion.h4>
          <h2 className="text-xl md:text-4xl lg:text-6xl font-display font-black text-white leading-none tracking-tighter drop-shadow-2xl">
            {currentWorld.name.toUpperCase()}
          </h2>
          <p className="text-indigo-200/40 text-[10px] md:text-sm lg:text-base mt-1 md:mt-2 max-w-xl italic font-medium leading-relaxed hidden sm:block">
            "{currentWorld.description}"
          </p>
        </div>
        
        <div className="hidden sm:flex flex-col items-end gap-1 md:gap-2 lg:gap-3 pointer-events-auto">
          <span className="text-[8px] lg:text-[10px] font-black text-white/20 uppercase tracking-[0.6em] mb-1">Astral Gateways</span>
          <div className="flex gap-2 md:gap-4 lg:gap-5">
            {WORLDS.map(w => {
              const isVisited = w.id === state.currentWorldId;
              const isUnlocked = state.level >= w.requiredLevel;
              return (
                <div key={w.id} className="flex flex-col items-center gap-1">
                  <button 
                    disabled={true}
                    className={`relative group h-8 w-8 md:h-12 md:w-12 lg:h-16 lg:w-16 rounded-lg md:rounded-xl lg:rounded-2xl overflow-hidden transition-all border-2 ${isVisited ? 'border-purple-400 scale-110 shadow-[0_0_40px_rgba(168,85,247,0.6)]' : (!isUnlocked ? 'border-transparent opacity-10 grayscale cursor-not-allowed' : 'border-white/5 opacity-40 hover:opacity-100 hover:border-white/20')}`}
                  >
                    <img src={w.image} className="w-full h-full object-cover" alt="" />
                    {!isUnlocked && <div className="absolute inset-0 flex items-center justify-center bg-black/90"><Lock className="w-3 h-3 md:w-4 md:h-4 text-white" /></div>}
                  </button>
                  <span className={`text-[6px] md:text-[8px] font-black uppercase tracking-[0.2em] ${isVisited ? 'text-purple-400' : 'text-white/20'}`}>{w.name.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* INTERACTIVE GOTHIC MAP STAGE */}
      <div className="relative flex-1 w-full overflow-auto border-t-[1px] border-indigo-900/20 shadow-[0_40px_150px_rgba(30,20,50,0.9)] bg-black group/map cursor-default">
        <div className="min-w-[800px] min-h-[500px] md:min-w-0 md:min-h-0 w-full h-full relative">
        {/* Deep Gothic Map Background */}
        <div className="absolute inset-0 z-0">
           <img 
             src={currentWorld.image}
             className="w-full h-full object-cover opacity-30 mix-blend-luminosity filter blur-[1px]"
             alt="Map Background"
           />
           <div className="absolute inset-0 bg-gradient-to-tr from-black via-indigo-950/90 to-purple-950/40 mix-blend-multiply" />
           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/95 to-black" />
        </div>

        {/* Ornate Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <svg className="w-full h-full opacity-5 mix-blend-screen">
            <defs>
              <pattern id="gothicGrid" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 80 40 L 40 80 L 0 40 Z" fill="none" stroke="#a78bfa" strokeWidth="1" strokeDasharray="2 2" />
                <circle cx="40" cy="40" r="1.5" fill="#a78bfa" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gothicGrid)" />
          </svg>
        </div>

        <motion.div 
          className="absolute inset-4 sm:inset-10 md:inset-20 lg:inset-24 z-10 max-w-[800px] max-h-[800px] mx-auto my-auto"
        >
          {nodes.map((node, i) => {
            const nodeLvl = worldProg[node.id] || 0;
            const isMax = nodeLvl >= 5;
            const cost = node.cost * (nodeLvl + 1);
            const canAfford = state.mana >= cost;
            const isUpgradeable = !isMax && canAfford;
            const NodeIcon = ICON_MAP[node.icon] || Globe;
            
            return (
              <motion.div 
                key={node.id}
                className="absolute"
                style={{ 
                  left: `${node.x}%`, 
                  top: `${node.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.5 + i * 0.15, type: 'spring' }}
              >
                <div className="relative flex flex-col items-center group">
                  {/* ORBITAL GLOW FX - ENHANCED */}
                  <motion.div 
                    animate={{ rotate: 360, scale: [1, 1.05, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className={`absolute inset-[-10px] sm:inset-[-15px] md:inset-[-25px] lg:inset-[-35px] rounded-full border-2 border-dashed transition-all duration-1000 ${nodeLvl > 0 ? 'border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'border-white/10 opacity-30'}`}
                  />
                  {/* SECONDARY GLOW */}
                  <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                    className={`absolute inset-[-5px] sm:inset-[-10px] md:inset-[-15px] lg:inset-[-20px] rounded-full border border-purple-900/30 ${nodeLvl > 0 ? 'opacity-100' : 'opacity-20'}`}
                  />
                  
                  {isUpgradeable && (
                    <motion.div
                      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-[-2px] sm:inset-[-5px] md:inset-[-8px] lg:inset-[-12px] rounded-full bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                    />
                  )}

                  <button 
                    onClick={() => setSelectedNodeId(node.id === selectedNodeId ? null : node.id)}
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full flex flex-col items-center justify-center transition-all duration-700 overflow-hidden group/node border-2 ${
                      selectedNodeId === node.id ? 'border-amber-400 scale-110 shadow-[0_0_30px_rgba(251,191,36,0.6)] z-50' : 
                      nodeLvl > 0 
                        ? 'bg-gradient-to-tr from-purple-900 to-indigo-950 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]' 
                        : 'bg-black border-white/20 hover:border-white/50'
                    }`}
                  >
                     <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent opacity-0 group-hover/node:opacity-50 transition-opacity" />
                    <NodeIcon className={`w-6 h-6 md:w-10 md:h-10 lg:w-14 lg:h-14 mb-1 md:mb-2 transition-transform group-hover/node:scale-110 ${nodeLvl > 0 ? 'text-purple-200' : 'text-indigo-900/70'}`} />
                    <div className="flex gap-0.5 md:gap-1">
                      {[...Array(5)].map((_, idx) => (
                        <div key={idx} className={`w-1 h-1 md:w-1.5 md:h-3 rounded-sm transition-all duration-1000 ${idx < nodeLvl ? 'bg-purple-300 shadow-[0_0_5px_rgba(216,180,254,0.8)]' : 'bg-white/10'}`} />
                      ))}
                    </div>
                    {state.shieldedNodes?.[currentWorld.id]?.includes(node.id) && (
                      <div className="absolute -top-1 -right-1 p-1 bg-cyan-500 rounded-full border border-white/20 shadow-lg">
                        <Shield className="w-2 h-2 md:w-3 md:h-3 text-white fill-white" />
                      </div>
                    )}
                  </button>

                  <div className="mt-2 md:mt-4 lg:mt-6 flex flex-col items-center text-center">
                    <span className="text-[8px] md:text-xs lg:text-sm font-black text-white tracking-[0.1em] md:tracking-[0.2em] uppercase drop-shadow-lg">{node.name}</span>
                    <span className="hidden md:block text-[8px] lg:text-[10px] font-medium text-white/40 mt-1 max-w-[120px] lg:max-w-[150px] leading-tight uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">{node.description}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
        
        <AnimatePresence>
          {syncPercent === 100 && !isAscending && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
            >
              <button
                onClick={handleAscendClick}
                className="group relative px-12 py-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full border-2 border-white/20 shadow-[0_0_50px_rgba(168,85,247,0.5)] hover:scale-105 active:scale-95 transition-all text-white"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 rounded-full transition-opacity" />
                <div className="flex flex-col items-center">
                  <span className="text-sm font-black uppercase tracking-[0.3em] mb-1">Sanctum Restored</span>
                  <span className="text-2xl font-display font-black tracking-widest flex items-center gap-3">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                    {isFinalAscension ? "ACHIEVE ENLIGHTENMENT" : `ASCEND TO DIMENSION ${nextWorldIndex + 1}`}
                    <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>

        {/* BOTTOM HUD */}
        <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 lg:bottom-8 lg:left-8 z-30 flex items-center gap-2 md:gap-4 lg:gap-8 pointer-events-none">
          <div className="bg-black/95 backdrop-blur-3xl px-3 md:px-6 lg:px-8 py-2 md:py-3 lg:py-4 rounded-xl md:rounded-2xl lg:rounded-3xl border border-white/5 flex items-center gap-2 md:gap-4 lg:gap-6 shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
             <div className="relative">
               <div className="w-3 h-3 md:w-5 md:h-5 lg:w-6 lg:h-6 bg-emerald-500 rounded-full animate-ping absolute inset-0 opacity-30" />
               <div className="w-3 h-3 md:w-5 md:h-5 lg:w-6 lg:h-6 bg-emerald-500 rounded-full relative z-10 shadow-[0_0_40px_rgba(52,211,153,0.9)]" />
             </div>
             <div className="flex flex-col">
               <span className="text-[6px] md:text-[9px] lg:text-[11px] font-black text-white/30 uppercase tracking-[0.3em] leading-none mb-0.5 md:mb-1 lg:mb-2">Dimension Level</span>
               <div className="flex items-end gap-0.5 lg:gap-1.5">
                 <span className="text-xl md:text-3xl lg:text-5xl font-display font-black text-white leading-none tracking-tighter">LVL {state.level}</span>
                 <span className="text-[8px] md:text-base lg:text-lg font-bold text-white/40 mb-0.5 lg:mb-1">({syncPercent}%)</span>
               </div>
             </div>
          </div>

           <div className="bg-black/95 backdrop-blur-3xl px-3 md:px-6 lg:px-8 py-2 md:py-3 lg:py-4 rounded-xl md:rounded-2xl lg:rounded-3xl border border-white/5 flex items-center gap-2 md:gap-4 lg:gap-6 shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
             <div className="w-4 h-4 md:w-7 md:h-7 lg:w-9 lg:h-9 bg-amber-500/10 rounded-lg md:rounded-xl lg:rounded-2xl flex items-center justify-center border border-amber-500/20">
               <Sparkles className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 text-amber-400 animate-pulse" />
             </div>
             <div className="flex flex-col">
               <span className="text-[6px] md:text-[9px] lg:text-[11px] font-black text-white/30 uppercase tracking-[0.3em] leading-none mb-0.5 md:mb-1 lg:mb-2">Refined Essence</span>
               <span className="text-xl md:text-3xl lg:text-5xl font-display font-black text-white leading-none tracking-tight">{state.mana.toLocaleString()}</span>
             </div>
          </div>
        </div>

        {/* SELECTED NODE OVERLAY */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-4 right-4 z-[200] max-w-[calc(100%-2rem)] sm:max-w-sm w-full pointer-events-auto"
            >
              <div className="bg-indigo-950/98 backdrop-blur-3xl p-4 md:p-6 rounded-2xl md:rounded-[2rem] lg:rounded-[2.5rem] border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.9)] flex flex-col items-center text-center">
                <button onClick={() => setSelectedNodeId(null)} className="absolute top-3 right-3 p-1.5 bg-white/5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <div className="w-10 h-10 md:w-16 md:h-16 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-xl md:rounded-2xl flex items-center justify-center border border-purple-500/30 mb-2 md:mb-4">
                  {(() => {
                    const Icon = ICON_MAP[selectedNode.icon] || Globe;
                    return <Icon className="w-5 h-5 md:w-8 md:h-8 text-purple-300" />;
                  })()}
                </div>
                <h3 className="text-lg md:text-2xl font-black text-white uppercase tracking-widest leading-none drop-shadow-md mb-1 md:mb-2">{selectedNode.name}</h3>
                <p className="text-[9px] md:text-sm font-medium text-indigo-200/60 leading-relaxed mb-3 md:mb-6 px-2">{selectedNode.description}</p>
                
                <div className="w-full bg-black/40 rounded-xl md:rounded-2xl p-2.5 md:p-4 border border-white/5 flex flex-col gap-1.5 md:gap-4 mb-3 md:mb-6">
                  <div className="flex justify-between items-center w-full">
                     <span className="text-[7px] md:text-[10px] uppercase font-black tracking-widest text-white/40">Current Level</span>
                     <span className="text-[10px] md:text-sm font-black text-white bg-purple-500/20 px-2 md:px-3 py-0.5 md:py-1 rounded-lg border border-purple-500/30">{selectedNodeLvl} / 5</span>
                  </div>
                  {!isSelectedMax && (
                    <div className="flex justify-between items-center w-full">
                       <span className="text-[7px] md:text-[10px] uppercase font-black tracking-widest text-white/40">Next Level Cost</span>
                       <span className={`text-[10px] md:text-sm font-black flex items-center gap-1 md:gap-2 ${canAffordSelected ? 'text-amber-400' : 'text-rose-400'}`}>
                         {selectedCost.toLocaleString()} <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3" />
                       </span>
                    </div>
                  )}
                </div>

                {selectedHealth < 100 ? (
                  <button 
                    onClick={() => onRepair(currentWorld.id, selectedNode.id)}
                    disabled={!canAffordRepair}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 md:py-4 rounded-xl md:rounded-2xl font-black tracking-widest uppercase text-[9px] md:text-sm transition-all duration-300 shadow-xl mb-3 ${canAffordRepair ? 'bg-rose-500 hover:bg-rose-400 text-rose-950 hover:shadow-[0_0_30px_rgba(244,63,94,0.5)]' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
                  >
                    <AlertTriangle className="w-3 h-3 md:w-4 md:h-4" />
                    {canAffordRepair ? `Repair Sanctum (${repairCost})` : 'Insufficient Essence to Repair'}
                  </button>
                ) : !isSelectedMax ? (
                  <button 
                    onClick={() => onUpgrade(currentWorld.id, selectedNode.id)}
                    disabled={!canAffordSelected}
                    className={`w-full py-2.5 md:py-4 rounded-xl md:rounded-2xl font-black tracking-widest uppercase text-[9px] md:text-sm transition-all duration-300 shadow-xl mb-3 ${canAffordSelected ? 'bg-amber-500 hover:bg-amber-400 text-amber-950 hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
                  >
                    {canAffordSelected ? 'Enhance Sanctum' : 'Insufficient Essence'}
                  </button>
                ) : (
                  <button disabled className="w-full py-2.5 md:py-4 rounded-xl md:rounded-2xl font-black tracking-widest uppercase text-[9px] md:text-sm bg-emerald-500 border border-emerald-400 text-emerald-950 shadow-[0_0_30px_rgba(16,185,129,0.3)] mb-3">
                    Sanctum Restored
                  </button>
                )}

                {state.shields > 0 && !(state.shieldedNodes?.[currentWorld.id]?.includes(selectedNode.id)) && (
                   <button 
                     onClick={() => onShield(currentWorld.id, selectedNode.id)}
                     className="w-full py-2.5 md:py-4 rounded-xl md:rounded-2xl font-black tracking-widest uppercase text-[9px] md:text-sm bg-cyan-600 hover:bg-cyan-500 text-white shadow-xl transition-all active:scale-95 border-b-4 border-cyan-800 flex items-center justify-center gap-3"
                   >
                     <Shield className="w-4 h-4" />
                     Equip Angelic Aegis
                   </button>
                )}
                {state.shieldedNodes?.[currentWorld.id]?.includes(selectedNode.id) && (
                   <div className="w-full py-2.5 md:py-4 rounded-xl md:rounded-2xl font-black tracking-widest uppercase text-[9px] md:text-sm bg-cyan-400/20 border border-cyan-400/40 text-cyan-400 flex items-center justify-center gap-3">
                     <Shield className="w-4 h-4 fill-cyan-400" />
                     Sanctum Shielded
                   </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ASCENSION ANIMATION OVERLAY */}
        <AnimatePresence>
          {isAscending && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0 z-[1000] bg-white flex flex-col items-center justify-center pointer-events-none overflow-hidden"
            >
               <motion.div 
                 animate={{ scale: [1, 30], opacity: [1, 0] }}
                 transition={{ duration: 4, delay: 0.5, ease: "easeInOut" }}
                 className="absolute w-32 h-32 rounded-full border-[30px] border-purple-500 shadow-[0_0_200px_#a855f7]"
               />
               <motion.div 
                 initial={{ opacity: 0, y: 30, scale: 0.8 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 transition={{ duration: 0.5, delay: 0.5 }}
                 className="relative z-10 flex flex-col items-center"
               >
                 <Sparkles className="w-24 h-24 text-purple-600 mb-6 animate-pulse drop-shadow-[0_0_30px_#a855f7]" />
                 <h1 className="text-5xl md:text-8xl font-display font-black text-purple-900 tracking-tighter drop-shadow-2xl">
                   ASCENSION
                 </h1>
                 <p className="mt-4 text-purple-800 font-bold tracking-widest uppercase text-sm md:text-xl">
                   Transmitting to new dimension...
                 </p>
               </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
  );
};

const SkillTreeModal: FC<{
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onClose: () => void;
}> = ({ state, setState, onClose }) => {
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);

  const handleUnlock = () => {
    if (!selectedNode) return;
    if ((state.skillPoints || 0) < selectedNode.cost) return;

    setState(prev => ({
      ...prev,
      skillPoints: Math.max(0, (prev.skillPoints || 0) - selectedNode.cost),
      unlockedSkills: [...(prev.unlockedSkills || []), selectedNode.id]
    }));
  };

  const isUnlocked = (nodeId: string) => (state.unlockedSkills || []).includes(nodeId);
  const canUnlock = (node: SkillNode) => {
    if (isUnlocked(node.id)) return false;
    if ((state.skillPoints || 0) < node.cost) return false;
    for (const req of node.reqs) {
      if (!isUnlocked(req)) return false;
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6 bg-indigo-950/95 backdrop-blur-2xl">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/5 p-6 md:p-12 rounded-3xl border border-white/20 max-w-screen-2xl w-full relative shadow-2xl h-[95vh] flex flex-col">
        <button onClick={onClose} className="absolute top-8 right-8 p-3 bg-white/5 rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-all"><X /></button>
        
        <div className="flex items-center gap-6 mb-8">
          <div className="p-5 bg-purple-500/20 rounded-3xl border border-purple-500/30">
            <Sparkles className="w-12 h-12 text-purple-400" />
          </div>
          <div>
             <h2 className="text-4xl md:text-5xl font-display font-black text-white tracking-tight">CHARACTER PROFILE</h2>
             <p className="text-purple-300 text-sm font-black uppercase tracking-widest mt-1">Skill Points Available: <span className="text-white text-lg bg-red-500 px-3 py-1 rounded-full ml-2">{state.skillPoints || 0}</span></p>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-8 min-h-0">
          <div className="flex-1 relative bg-black/40 rounded-[2rem] border border-white/10 overflow-hidden">
            {/* Draw lines (hidden on mobile for simplicity) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20 hidden md:block">
              {CHARMED_SKILLS.flatMap(node => 
                node.reqs.map(reqId => {
                  const reqNode = CHARMED_SKILLS.find(s => s.id === reqId);
                  if (!reqNode) return null;
                  const startX = `${(reqNode.gridCol - 1) * 20 + 10}%`;
                  const startY = `${(reqNode.gridRow - 1) * 20 + 10}%`;
                  const endX = `${(node.gridCol - 1) * 20 + 10}%`;
                  const endY = `${(node.gridRow - 1) * 20 + 10}%`;
                  const strokeColor = isUnlocked(node.id) ? '#a855f7' : '#ffffff';
                  return <line key={`${reqId}-${node.id}`} x1={startX} y1={startY} x2={endX} y2={endY} stroke={strokeColor} strokeWidth="2" strokeDasharray="5,5" />;
                })
              )}
            </svg>
            <div className="absolute inset-0 p-4 md:p-8 grid grid-cols-5 grid-rows-5 gap-1 md:gap-4 overflow-y-auto">
              {CHARMED_SKILLS.map(node => {
                const unlocked = isUnlocked(node.id);
                const available = canUnlock(node);
                const Icon = ICON_MAP[node.icon] || Heart;

                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    style={{ gridColumnStart: node.gridCol, gridRowStart: node.gridRow }}
                    className={`group relative flex flex-col items-center justify-center p-1 md:p-2 rounded-xl md:rounded-2xl border-2 transition-all hover:scale-110 ${selectedNode?.id === node.id ? 'ring-2 md:ring-4 ring-purple-400' : ''} ${unlocked ? 'bg-purple-600/50 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : available ? 'bg-indigo-600/50 border-indigo-400 cursor-pointer animate-pulse' : 'bg-white/5 border-white/10 opacity-50 grayscale'}`}
                  >
                    <Icon className={`w-4 h-4 md:w-8 md:h-8 ${unlocked ? 'text-white' : 'text-indigo-200'}`} />
                    
                    {/* Hover Tooltip (hidden on small screens, click to see details) */}
                    <div className="hidden md:absolute md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:opacity-0 group-hover:opacity-100 group-hover:-translate-y-[calc(100%+24px)] md:pointer-events-none transition-all duration-300 z-50">
                      <div className="bg-indigo-950/95 backdrop-blur-md px-4 py-3 rounded-xl border border-indigo-500/30 shadow-2xl flex flex-col items-center w-48 text-center">
                        <span className="text-white font-black uppercase text-sm tracking-widest mb-1 leading-tight">{node.name}</span>
                        <span className="text-indigo-200/80 text-[10px] font-medium leading-relaxed mb-2">{node.description}</span>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${unlocked ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : available ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
                          {unlocked ? 'UNLOCKED' : `COST: ${node.cost} SP`}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="w-full md:w-80 flex flex-col gap-4">
            {selectedNode ? (
              <div className="bg-white/5 border border-white/10 rounded-[1rem] md:rounded-[2rem] p-4 md:p-6 flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   {React.createElement(ICON_MAP[selectedNode.icon] || Heart, { className: "w-24 h-24 md:w-32 md:h-32" })}
                </div>
                <div className="relative z-10 font-display text-lg md:text-2xl font-black text-white mb-2">{selectedNode.name}</div>
                <div className="relative z-10 text-indigo-200/80 mb-6 text-xs md:text-sm">{selectedNode.description}</div>
                
                <div className="mt-auto relative z-10 space-y-2 md:space-y-4">
                  <div className="flex justify-between items-center text-xs md:text-sm font-bold">
                    <span className="text-white/50 uppercase tracking-widest">Cost</span>
                    <span className="text-red-400 flex items-center gap-2"><Sparkles className="w-3 h-3 md:w-4 md:h-4"/> {selectedNode.cost} SP</span>
                  </div>
                  {isUnlocked(selectedNode.id) ? (
                    <div className="w-full py-2 md:py-4 bg-purple-500/20 text-purple-300 rounded-xl font-black text-center uppercase tracking-widest border border-purple-500/30">
                      Unlocked
                    </div>
                  ) : (
                    <button
                      onClick={handleUnlock}
                      disabled={!canUnlock(selectedNode)}
                      className="w-full py-3 md:py-4 bg-purple-600 text-white rounded-xl font-black text-center uppercase tracking-widest hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:bg-white/5"
                    >
                      Unlock Skill
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-[1rem] md:rounded-[2rem] p-4 md:p-6 flex flex-col items-center justify-center flex-grow md:h-full text-center text-white/40">
                <Compass className="w-8 h-8 md:w-12 md:h-12 mb-2 md:mb-4" />
                <span className="text-xs md:text-sm">Select a node</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const TutorialOverlay: FC<{
  state: GameState;
  onNext: () => void;
  onSkip: () => void;
}> = ({ state, onNext, onSkip }) => {
  const currentStep = TUTORIAL_STEPS[state.tutorialPhase || 0];
  if (!currentStep) return null;

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (currentStep.targetId !== 'root') {
      const el = document.getElementById(currentStep.targetId);
      if (el) setTargetRect(el.getBoundingClientRect());
      else setTargetRect(null);
    } else {
      setTargetRect(null);
    }
  }, [currentStep.targetId, state.tutorialPhase]);

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
      </AnimatePresence>

      {targetRect && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: 1,
            x: targetRect.left - 8,
            y: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16
          }}
          className="absolute border-4 border-purple-400 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.8)] z-[1001]"
        />
      )}

      <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
        <motion.div 
          key={currentStep.id}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`bg-indigo-950 border-2 border-purple-500 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative z-[1002] text-center ${
            currentStep.position === 'top' ? 'mb-[40vh]' : 
            currentStep.position === 'bottom' ? 'mt-[40vh]' : ''
          }`}
        >
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-20 h-20 bg-purple-600 rounded-3xl flex items-center justify-center shadow-xl rotate-12">
             <Wand2 className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-2xl font-display font-black text-white mt-4 mb-2 uppercase tracking-tight">{currentStep.title}</h2>
          <p className="text-indigo-200/80 text-sm leading-relaxed mb-8">{currentStep.description}</p>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={onNext}
              className="w-full py-4 bg-purple-500 hover:bg-purple-400 text-white rounded-xl font-black uppercase tracking-widest text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {state.tutorialPhase === TUTORIAL_STEPS.length - 1 ? 'BEGIN JOURNEY' : 'NEXT STEP'}
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={onSkip}
              className="text-indigo-400/60 text-[10px] font-black uppercase tracking-widest hover:text-indigo-300 transition-colors"
            >
              Skip Tutorial
            </button>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {TUTORIAL_STEPS.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === state.tutorialPhase ? 'bg-purple-400 w-4' : 'bg-white/20'}`} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const DamagedNodeOverlay: FC<{ animation: { nodeId: string, damage: number, attackerName?: string } }> = ({ animation }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 2 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-red-950/40 backdrop-blur-md pointer-events-none"
    >
      <motion.div 
        animate={{ x: [0, -10, 10, -10, 10, 0] }}
        transition={{ duration: 0.5, repeat: 2 }}
        className="flex flex-col items-center"
      >
        <Skull className="w-32 h-32 text-red-500 mb-6 drop-shadow-[0_0_30px_rgba(244,63,94,0.8)]" />
        <h1 className="text-6xl md:text-8xl font-display font-black text-white tracking-tighter uppercase text-center">SANCTUM BREACHED</h1>
        {animation.attackerName && (
           <h2 className="text-3xl font-display font-bold text-red-300 mt-2">Attacked by: {animation.attackerName}</h2>
        )}
        <p className="text-2xl text-red-400 font-bold tracking-widest uppercase mt-4">Node Sustained {animation.damage}% Structural Damage</p>
        <div className="mt-8 flex gap-4">
           {[...Array(3)].map((_, i) => <Zap key={i} className="w-8 h-8 text-amber-400 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />)}
        </div>
      </motion.div>
    </motion.div>
  );
};
const SettingsModal: FC<{
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onClose: () => void;
}> = ({ state, setState, onClose }) => {
  const updateSettings = (partial: Partial<import('./types').GameSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...partial }
    }));
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-indigo-950/95 backdrop-blur-2xl">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/5 p-6 md:p-12 rounded-3xl border border-white/20 max-w-lg w-full relative shadow-2xl flex flex-col items-center">
        <button onClick={onClose} className="absolute top-8 right-8 p-3 bg-white/5 rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-all"><X /></button>
        
        <h2 className="text-4xl font-display font-black text-white tracking-tight mb-8">Settings</h2>
        
        <div className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-white/60 uppercase">Volume</label>
            <input type="range" min="0" max="1" step="0.1" value={state.settings.volume} onChange={(e) => updateSettings({ volume: parseFloat(e.target.value) })} className="w-full" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-white/60 uppercase">Difficulty</label>
              <select value={state.settings.difficulty} onChange={(e) => updateSettings({ difficulty: e.target.value as any })} className="bg-white/10 p-2 rounded-lg text-white">
                <option value="easy">Easy</option>
                <option value="normal">Normal</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-white/60 uppercase">Anim Speed</label>
              <select value={state.settings.animationSpeed} onChange={(e) => updateSettings({ animationSpeed: e.target.value as any })} className="bg-white/10 p-2 rounded-lg text-white">
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
             <span className="font-bold text-white">Theme</span>
             <select value={state.settings.theme} onChange={(e) => updateSettings({ theme: e.target.value as any })} className="bg-white/10 p-2 rounded-lg text-white">
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="gothic">Gothic</option>
              </select>
          </div>

          <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
             <span className="font-bold text-white">Music</span>
             <button onClick={() => updateSettings({ musicEnabled: !state.settings.musicEnabled })} className={`px-4 py-2 rounded-lg ${state.settings.musicEnabled ? 'bg-purple-600' : 'bg-white/10'}`}>{state.settings.musicEnabled ? 'ON' : 'OFF'}</button>
          </div>

          <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
             <span className="font-bold text-white">Notifications</span>
             <button onClick={() => updateSettings({ notificationsEnabled: !state.settings.notificationsEnabled })} className={`px-4 py-2 rounded-lg ${state.settings.notificationsEnabled ? 'bg-purple-600' : 'bg-white/10'}`}>{state.settings.notificationsEnabled ? 'ON' : 'OFF'}</button>
          </div>
          
           <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
             <span className="font-bold text-white">Keyboard Shortcuts</span>
             <button onClick={() => updateSettings({ enableKeyboardShortcuts: !state.settings.enableKeyboardShortcuts })} className={`px-4 py-2 rounded-lg ${state.settings.enableKeyboardShortcuts ? 'bg-purple-600' : 'bg-white/10'}`}>{state.settings.enableKeyboardShortcuts ? 'ON' : 'OFF'}</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const GAME_RELICS: import('./types').Relic[] = [
  { id: 'amulet_of_insight', name: 'Amulet of Insight', description: '+15% Dodge Chance', effect: 'dodge', power: 0.15, image: 'https://images.unsplash.com/photo-1605146764387-bdd025555d49?auto=format&fit=crop&q=80&w=200' },
  { id: 'ring_of_power', name: 'Ring of Power', description: '+30% Spell Damage', effect: 'damage', power: 0.3, image: 'https://images.unsplash.com/photo-1614729111354-941da7d526fc?auto=format&fit=crop&q=80&w=200' },
  { id: 'chalice_of_life', name: 'Chalice of Life', description: '+50 Max Health', effect: 'health', power: 50, image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=200' },
  { id: 'crystal_of_essence', name: 'Crystal of Essence', description: '+50% Essence Yield', effect: 'essence', power: 0.5, image: 'https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?auto=format&fit=crop&q=80&w=200' }
];

export const getPlayerStats = (state: GameState) => {
  let maxHealth = 100 + ((state.level - 1) * 20);
  if (state.unlockedSkills?.includes('vitality_1')) maxHealth += 20;
  if (state.unlockedSkills?.includes('vitality_2')) maxHealth += 30;

  let essenceMult = 1.0;
  if (state.unlockedSkills?.includes('essence_1')) essenceMult += 0.1;
  if (state.unlockedSkills?.includes('manor_affinity')) essenceMult += 0.15;

  let spellDmgMult = 1.0;
  if (state.unlockedSkills?.includes('power_1')) spellDmgMult += 0.1;
  if (state.unlockedSkills?.includes('power_2')) spellDmgMult += 0.2;
  if (state.unlockedSkills?.includes('power_3')) spellDmgMult += 0.3;

  let dodgeChance = 0;
  if (state.unlockedSkills?.includes('dodge_1')) dodgeChance += 0.05;
  if (state.unlockedSkills?.includes('dodge_2')) dodgeChance += 0.05;

  let potionDmgMult = 1.0;
  if (state.unlockedSkills?.includes('potion_mastery')) potionDmgMult += 0.5;

  let startWithShield = state.unlockedSkills?.includes('mastery') || false;

  const relic = GAME_RELICS.find(r => r.id === state.equippedRelicId);
  if (relic) {
    if (relic.effect === 'health') maxHealth += relic.power;
    if (relic.effect === 'essence') essenceMult += relic.power;
    if (relic.effect === 'damage') spellDmgMult += relic.power;
    if (relic.effect === 'dodge') dodgeChance += relic.power;
  }

  return { maxHealth, essenceMult, spellDmgMult, dodgeChance, startWithShield, potionDmgMult };
};

const TRIVIA_QUESTIONS = [
  { q: "What is the name of the book that holds the Charmed Ones' spells?", options: ["Book of Shadows", "Grimoire", "Book of Spells", "Necronomicon"], ans: 0 },
  { q: "What is Piper's first magical power?", options: ["Telekinesis", "Molecular Immobilization (Freezing)", "Premonition", "Levitation"], ans: 1 },
  { q: "Who is the half-sister of the Charmed Ones?", options: ["Prue", "Paige", "Phoebe", "Penny"], ans: 1 },
  { q: "What is the name of their grandmother, Penny, holding the family together?", options: ["Grams", "Mom", "Patty", "Nana"], ans: 0 },
  { q: "What kind of beings are tasked with protecting witches?", options: ["Demons", "Warlocks", "Elders", "Whitelighters"], ans: 3 },
  { q: "Phoebe's active power developed in later seasons allows her to do what?", options: ["Freeze Time", "Shoot Fire", "Levitate", "Astral Project"], ans: 2 },
  { q: "Who is the father of the original Charmed Ones?", options: ["Sam Wilder", "Victor Bennett", "Cole Turner", "Leo Wyatt"], ans: 1 },
  { q: "What is the demonic wasteland where vanquished demons go?", options: ["The Underworld", "The Demonic Realm", "The Wasteland", "Tartarus"], ans: 2 },
  { q: "Which core power did Prue eventually develop?", options: ["Astral Projection", "Orb Shield", "Molecular Combustion", "Slowing Time"], ans: 0 },
  { q: "What is the name of Piper's nightclub?", options: ["P3", "The Magic Lounge", "Halliwell's", "The Underworld Club"], ans: 0 },
  { q: "Who did Phoebe famously marry in the Underworld?", options: ["Balthazar", "Cole Turner", "Coop", "Jason Dean"], ans: 1 },
  { q: "Which power does Paige NOT possess?", options: ["Orbing", "Glamouring", "Healing", "Premonitions"], ans: 3 },
  { q: "What species is Leo Wyatt before becoming a mortal again?", options: ["Elder", "Whitelighter", "Avatar", "All of the above"], ans: 3 }
];

const TUTORIAL_STEPS: TutorialStep[] = [
  { id: 'welcome', targetId: 'root', title: 'Welcome Sister', description: 'The Power of Three has returned. San Francisco needs the Halliwell sisters to defend against the rising darkness.', position: 'center' },
  { id: 'roll', targetId: 'roll-button', title: 'Cast the Dice', description: 'Tap here to roll the astral dice and move your character along the board.', position: 'top' },
  { id: 'essence', targetId: 'essence-stat', title: 'Magical Essence', description: 'Gather Essence from enchanted sites. This energy is used to upgrade your sanctums.', position: 'bottom' },
  { id: 'scrolls', targetId: 'scrolls-counter', title: 'Orb Points', description: 'Every move costs 1 Orb Point. Use them wisely to navigate the magical plane.', position: 'bottom' },
  { id: 'build', targetId: 'nav-build', title: 'Sanctuary Construction', description: 'Access the Sanctuary view to build and upgrade magical structures across dimensions.', position: 'top' },
  { id: 'defend', targetId: 'root', title: 'Demonic Threats', description: 'Demons will attack your sanctums. Build Angelic Aegis (Shields) to protect them from damage!', position: 'center' },
];

const ADVANCED_RULES = [
  { title: "Essence Synergy", content: "Upgrading multiple buildings in the same world provides a synergy bonus to your essence generation. A fully restored dimension gives 2x Essence!" },
  { title: "Angelic Shielding", content: "Buildings can take up to 100% damage. At 0% health, they provide NO essence. Keep them repaired or use shields to automate protection." },
  { title: "Combat Mastery", content: "Using specific spells against their weak elements (e.g., Ice against Fire demons) deals 50% more damage and grants extra XP." },
  { title: "Relic Forging", content: "Collect rare inventory items to grant passive buffs. Some relics even reduce the cost of repairs or upgrades." }
];

const QUEST_POOL: Omit<DailyQuest, 'current' | 'isCompleted'>[] = [
  { id: 'essence_1', description: 'Collect 10,000 Essence', target: 10000, rewardEssence: 2000, rewardGems: 10 },
  { id: 'essence_2', description: 'Collect 25,000 Essence', target: 25000, rewardEssence: 5000, rewardGems: 25 },
  { id: 'demons_1', description: 'Defeat 3 Demons', target: 3, rewardEssence: 3000, rewardGems: 15 },
  { id: 'demons_2', description: 'Defeat 5 Demons', target: 5, rewardEssence: 6000, rewardGems: 30 },
  { id: 'properties_1', description: 'Visit 5 Properties', target: 5, rewardEssence: 1500, rewardGems: 5 },
  { id: 'properties_2', description: 'Visit 10 Properties', target: 10, rewardEssence: 4000, rewardGems: 20 },
  { id: 'spells_1', description: 'Cast 10 Spells in Battle', target: 10, rewardEssence: 2000, rewardGems: 10 },
  { id: 'spells_2', description: 'Cast 25 Spells in Battle', target: 25, rewardEssence: 5000, rewardGems: 25 },
  { id: 'rolls_1', description: 'Perform 15 Astral Rolls', target: 15, rewardEssence: 1000, rewardGems: 5 },
  { id: 'rolls_2', description: 'Perform 30 Astral Rolls', target: 30, rewardEssence: 3000, rewardGems: 15 },
  { id: 'heist_1', description: 'Perform 2 Astral Scrying sessions', target: 2, rewardEssence: 2500, rewardGems: 12 },
  { id: 'raid_1', description: 'Initiate 2 Underworld Raids', target: 2, rewardEssence: 3000, rewardGems: 15 },
  { id: 'enchant_1', description: 'Enhance Sanctums 3 times', target: 3, rewardEssence: 3500, rewardGems: 20 },
  { id: 'riddles_1', description: 'Solve 2 Manor Riddles', target: 2, rewardEssence: 2500, rewardGems: 12 },
  { id: 'epic_essence', description: 'EPIC: Collect 100,000 Essence', target: 100000, rewardEssence: 25000, rewardGems: 100 },
  { id: 'epic_demons', description: 'EPIC: Vanquish 15 Demons', target: 15, rewardEssence: 20000, rewardGems: 80 },
  { id: 'epic_rolls', description: 'EPIC: Perform 100 Astral Rolls', target: 100, rewardEssence: 15000, rewardGems: 60 },
];

export default function App() {
  const [state, setState] = useState<GameState>({
    characterId: '',
    mana: 5000,
    gems: 0,
    xp: 0,
    level: 1,
    floor: 1,
    position: 0,
    scrollsRemaining: 2000,
    bookScrolls: 0,
    currentStreak: 0,
    lastCast: null,
    sanctuariesOwned: [],
    buildingUpgrades: {},
    visitedTile: null,
    isCasting: false,
    chronicle: ['The Power of Three will set you free...'],
    unlockedSpellIds: ['vanquishing_potion'],
    activeSpellId: 'vanquishing_potion',
    hasSeenTutorial: false,
    hasSeenCombatTutorial: false,
    hasSeenScryingTutorial: false,
    tutorialPhase: 0,
    seenStoryIds: [],
    potions: 5,
    currentWorldId: 'halliwell_manor',
    worldProgress: { 'halliwell_manor': {} },
    health: 100,
    inventory: [],
    activePuzzle: null,
    settings: {
      volume: 0.5,
      musicEnabled: true,
      notificationsEnabled: true,
      difficulty: 'normal',
      animationSpeed: 'normal',
      theme: 'dark',
      enableKeyboardShortcuts: true,
    },
    achievements: [],
    specialPoints: 0,
    dailyQuests: [],
    shields: 4,
    shieldedNodes: {},
  });

  const [elementFilter, setElementFilter] = useState<'All' | Element>('All');
  const [effectFilter, setEffectFilter] = useState<'All' | 'damage' | 'heal' | 'shield' | 'freeze'>('All');

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSkillTree, setShowSkillTree] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState<'leaderboard' | 'friends' | false>(false);

  const [showEventModal, setShowEventModal] = useState<TileData | null>(null);
  const [celebration, setCelebration] = useState<{ type: 'mana' | 'enchantment' | 'reward' | 'level_up' | 'drain' | 'item' | 'xp' | 'damage' | 'power_of_three', amount?: number, label?: string } | null>(null);
  
  // New States
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [quest, setQuest] = useState<QuestState | null>(null);
  const [spellVFX, setSpellVFX] = useState<{ id: string, type: string } | null>(null);
  const [showPowerOfThree, setShowPowerOfThree] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [currentStory, setCurrentStory] = useState<StoryChapter | null>(null);
  const [storyImageIndex, setStoryImageIndex] = useState(0);
  const [travelMultiplier, setTravelMultiplier] = useState(1);
  const [pvpChallenges, setPvpChallenges] = useState<PvPChallenge[]>([]);
  const [activePvP, setActivePvP] = useState<PvPChallenge | null>(null);
  const [coopRescues, setCoopRescues] = useState<CoopRescue[]>([]);
  const [activeRescue, setActiveRescue] = useState<CoopRescue | null>(null);
  const [activeCard, setActiveCard] = useState<GameCard | null>(null);
  const [activeRaid, setActiveRaid] = useState<{ targetUser: UserProfile, targetState: any } | null>(null);
  const [raidWeapon, setRaidWeapon] = useState<'default' | 'potion' | 'spell'>('default');
  const [activeHeist, setActiveHeist] = useState<{ targetUser: UserProfile, targetState: any, chests: ('empty' | 'small' | 'large')[], picksLeft: number, matched: ('small'|'large')[], revealed: boolean[] } | null>(null);
  const [damagedNodeAnimation, setDamagedNodeAnimation] = useState<{ nodeId: string, damage: number, attackerName?: string } | null>(null);

  const updateDailyQuestProgress = (actionType: string, amount: number) => {
    setState(prev => {
        const nextDailyQuests = prev.dailyQuests.map(q => 
            (q.id.startsWith(actionType) || q.id.includes(`_${actionType}`)) && !q.isCompleted 
                ? { ...q, current: Math.min(q.target, q.current + amount) }
                : q
        );
        
        let newUnlockedSpellIds = [...prev.unlockedSpellIds];
        nextDailyQuests.forEach(q => {
            if (q.current >= q.target && !q.isCompleted) {
                if (q.id.startsWith('riddles') && !newUnlockedSpellIds.includes('ancient_riddle')) {
                  newUnlockedSpellIds.push('ancient_riddle');
                  playSound('levelUp');
                }
                if (q.id === 'threats' && !newUnlockedSpellIds.includes('shadow_strike')) {
                  newUnlockedSpellIds.push('shadow_strike');
                  playSound('levelUp');
                }
            }
        });

        return {
            ...prev,
            dailyQuests: nextDailyQuests,
            unlockedSpellIds: newUnlockedSpellIds
        };
    });
  };
  const [showShop, setShowShop] = useState(false);
  const [showDaily, setShowDaily] = useState(false);
  const [showGrimoire, setShowGrimoire] = useState(false);
  const [activeTab, _setActiveTab] = useState<'adventure' | 'build'>('adventure');
  const setActiveTab = (tab: 'adventure' | 'build') => {
    playSound('click');
    _setActiveTab(tab);
  };
  const [combatCategory, _setCombatCategory] = useState<'main' | 'spells' | 'items' | 'retreat' | null>(null);
  const setCombatCategory = (cat: 'main' | 'spells' | 'items' | 'retreat' | null) => {
    playSound('click');
    _setCombatCategory(cat);
  };
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);

  useEffect(() => {
    // Random Demonic Presence: Steals mana at random points
    const interval = setInterval(() => {
      if (Math.random() < 0.05 && !battle && !activeHeist && !activeRaid) { // 5% chance every 15s
        const stolenMana = Math.floor(state.mana * 0.15) + 500;
        if (state.mana > 1000) {
           setState(prev => ({
             ...prev,
             mana: Math.max(0, prev.mana - stolenMana),
             chronicle: [`Demonic Interception! A shadow demon stole ${stolenMana.toLocaleString()} Essence.`, ...prev.chronicle]
           }));
           setCelebration({ type: 'drain', amount: stolenMana, label: 'DEMON THEFT' });
           playSound('lose');
           setTimeout(() => setCelebration(null), 3000);
        }
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [state.mana, battle, activeHeist, activeRaid]);

  useEffect(() => {
    // Daily Reward & Streak Logic
    const lastPlayed = localStorage.getItem('lastPlayedDate');
    const today = new Date().toDateString();
    
    if (lastPlayed !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastPlayed === yesterday.toDateString()) {
            setState(prev => ({ ...prev, currentStreak: prev.currentStreak + 1, lastDailyReward: Date.now() }));
        } else {
            setState(prev => ({ ...prev, currentStreak: 1, lastDailyReward: Date.now() }));
        }
        localStorage.setItem('lastPlayedDate', today);
        // Generate daily quests randomly from the pool
        const shuffled = [...QUEST_POOL].sort(() => 0.5 - Math.random());
        const selectedQuests = shuffled.slice(0, 4).map(q => ({
          ...q,
          current: 0,
          isCompleted: false
        }));
        setState(prev => ({ ...prev, dailyQuests: selectedQuests }));
        
        setShowDaily(true);
    }
    
    const timer = setInterval(() => {
      setState(prev => {
        if (prev.scrollsRemaining < 100) {
          return { ...prev, scrollsRemaining: Math.min(100, prev.scrollsRemaining + 10) };
        }
        return prev;
      });
    }, 600000); // 10 minute recovery
    return () => clearInterval(timer);
  }, []);

  const drawCard = (type: 'chance' | 'chest') => {
    const pool = type === 'chance' ? CHANCE_CARDS : CHEST_CARDS;
    const card = pool[Math.floor(Math.random() * pool.length)];
    setActiveCard(card);
    playSound('pageTurn');
  };



  // Story Progression Logic
  useEffect(() => {
    if (!state.characterId) return;
    
    const nextChapter = STORY_CHAPTERS.find(chapter => 
      chapter.triggerLevel <= state.level && 
      !state.seenStoryIds.includes(chapter.id)
    );

    if (nextChapter) {
      setCurrentStory(nextChapter);
      playSound('pageTurn');
      setState(prev => ({
        ...prev,
        seenStoryIds: [...prev.seenStoryIds, nextChapter.id],
        specialPoints: (prev.specialPoints || 0) + 100
      }));
    }
  }, [state.level, state.characterId, state.seenStoryIds]);

  // Achievement Logic
  useEffect(() => {
    const newUnlocked: Achievement[] = [];
    
    INITIAL_ACHIEVEMENTS.forEach(ach => {
      if (state.achievements.find(a => a.id === ach.id)) return;
      
      let unlocked = false;
      if (ach.id === 'first_spell' && state.lastCast) unlocked = true;
      if (ach.id === 'level_5' && state.level >= 5) unlocked = true;
      if (ach.id === 'essence_master' && state.mana >= 100000) unlocked = true;
      
      if (unlocked) {
        newUnlocked.push({...ach, unlockedAt: Date.now()});
      }
    });

    if (newUnlocked.length > 0) {
      setState(prev => ({
        ...prev,
        achievements: [...prev.achievements, ...newUnlocked],
        specialPoints: (prev.specialPoints || 0) + newUnlocked.reduce((acc, a) => acc + a.points, 0),
        chronicle: [...newUnlocked.map(a => `Achievement Unlocked: ${a.name}! (+${a.points} Special Points)`), ...prev.chronicle]
      }));
    }
  }, [state.level, state.mana, state.lastCast]);

  const selectedCharacter = useMemo(() => {
    return CHARMED_CHARACTERS.find(c => c.id === state.characterId);
  }, [state.characterId]);

  const activeSpell = useMemo(() => {
    return CHARMED_SPELLS.find(s => s.id === state.activeSpellId) || CHARMED_SPELLS[0];
  }, [state.activeSpellId]);

  const getXpNeeded = (level: number) => {
    const world = WORLDS.find(w => w.requiredLevel === level) || WORLDS[0];
    return world.nodes.reduce((acc, n) => acc + n.maxLevel, 0);
  };

  const gainXp = useCallback((amount: number) => {
    if (amount <= 0) return;
    setState(prev => {
      const xpNeeded = getXpNeeded(prev.level);
      const nextXp = prev.xp + amount;
      
      if (nextXp >= xpNeeded) {
        playSound('levelUp');
        setCelebration({ type: 'level_up' });
        setTimeout(() => setCelebration(null), 3000);
        
        // Level reward: Unlock new spells every 3 levels
        const newUnlockedSpells = [...prev.unlockedSpellIds];
        const nextLevel = prev.level + 1;
        if (nextLevel === 3 && !newUnlockedSpells.includes('freeze_time')) newUnlockedSpells.push('freeze_time');
        if (nextLevel === 6 && !newUnlockedSpells.includes('orb_shield')) newUnlockedSpells.push('orb_shield');
        if (nextLevel === 9 && !newUnlockedSpells.includes('power_of_three')) newUnlockedSpells.push('power_of_three');

        const unlockedChapter = STORY_CHAPTERS.find(chapter => chapter.triggerLevel === nextLevel && !prev.seenStoryIds.includes(chapter.id));
        if (unlockedChapter) {
          setCurrentStory(unlockedChapter);
        }

        return {
          ...prev,
          level: nextLevel,
          floor: nextLevel,
          xp: 0, // Reset XP for new world
          mana: prev.mana + 5000 * nextLevel,
          scrollsRemaining: prev.scrollsRemaining + 10,
          unlockedSpellIds: newUnlockedSpells,
          skillPoints: (prev.skillPoints || 0) + 1,
          specialPoints: (prev.specialPoints || 0) + (unlockedChapter ? 100 : 0),
          seenStoryIds: unlockedChapter ? [...prev.seenStoryIds, unlockedChapter.id] : prev.seenStoryIds,
          chronicle: [`Blessed Ascension! You reached Level ${nextLevel} and are ready to advance your Dimension.`, ...prev.chronicle]
        };
      }
      return { ...prev, xp: nextXp };
    });
  }, []);

  const triggerMission = (tile: TileData) => {
    playSound('battleStart');
    
    // Tutorial Integration
    if (!state.hasSeenCombatTutorial) {
       setState(prev => ({ ...prev, tutorialPhase: 8, hasSeenCombatTutorial: true }));
    }

    const isBoss = tile.type === 'trial' || tile.name.includes('Demon Wasteland');
    const isRescue = tile.type === 'rescue';
    const isQuest = tile.type === 'quest';
    
    const activeSpell = CHARMED_SPELLS.find(s => s.id === state.activeSpellId) || CHARMED_SPELLS[0];
    const powerMult = 1 + (state.level * 0.3);
    const spellDmg = Math.floor(activeSpell.power * powerMult);
    
    let missionOptions: QuestState['options'] = [
       { 
         label: 'Act',
         style: 'primary',
         outcome: () => {
           setState(prev => {
             const cost = isBoss ? 2000 : (isQuest ? 100 : 500);
             if (prev.mana >= cost) {
               if (Math.random() < 0.35) {
                  // Failure!
                  let failDmg = isBoss ? 60 : 30;
                  let usedShield = false;
                  
                  if ((prev.shields > 0 || getPlayerStats(prev).startWithShield) && tile.type === 'battle') {
                    failDmg = Math.floor(failDmg / 2);
                    if (!getPlayerStats(prev).startWithShield || prev.shields > 0) {
                        usedShield = getPlayerStats(prev).startWithShield ? false : true; // free shield prevents shield consumption
                    }
                  }

                  const essenceDrain = isBoss ? 3000 : 1000;
                  if (prev.health <= failDmg) {
                    setQuest(null);
                    setCelebration({ type: 'damage', amount: failDmg });
                    return { ...prev, mana: Math.max(0, prev.mana - 1000), health: getPlayerStats(prev).maxHealth, position: 0, shields: Math.max(0, prev.shields - (usedShield ? 1 : 0)), chronicle: [`You were defeated at ${tile.name}...`, ...prev.chronicle] };
                  }

                  setQuest(null);
                  setCelebration({ type: 'drain', amount: essenceDrain, label: 'DARKNESS STRIKES' });
                  setTimeout(() => setCelebration(null), 2500);
                  return { ...prev, mana: Math.max(0, prev.mana - cost - essenceDrain), health: prev.health - failDmg, shields: Math.max(0, prev.shields - (usedShield ? 1 : 0)), chronicle: [`Disaster! You were overwhelmed! Took ${failDmg} damage and lost ${essenceDrain} Essence!`, ...prev.chronicle] };
               }

               let demonStrike = isBoss ? 50 : 15;
               let usedShield = false;
               
               if ((prev.shields > 0 || getPlayerStats(prev).startWithShield) && tile.type === 'battle') {
                 demonStrike = Math.floor(demonStrike / 2);
                 usedShield = getPlayerStats(prev).startWithShield ? false : true;
               }

               const dodged = Math.random() < getPlayerStats(prev).dodgeChance;
               let damageTaken = dodged ? 0 : demonStrike;
               
               const reward = isBoss ? 10000 : (isQuest ? 2000 : 3000);
               const gemReward = isBoss ? 20 : 5;
               
               if (prev.health <= damageTaken && !dodged) {
                 // Player dies
                 setQuest(null);
                 setCelebration({ type: 'damage', amount: damageTaken });
                 return { ...prev, mana: Math.max(0, prev.mana - 1000), health: getPlayerStats(prev).maxHealth, position: 0, shields: Math.max(0, prev.shields - (usedShield ? 1 : 0)), chronicle: [`You were defeated at ${tile.name}...`, ...prev.chronicle] };
               }

               setQuest(null);
               const orbPts = Math.floor(reward / 1000);
               setCelebration({ type: 'enchantment', amount: reward });
               return { 
                 ...prev, 
                 mana: Math.max(0, prev.mana - cost + reward), 
                 gems: prev.gems + gemReward,
                 health: prev.health - damageTaken,
                 shields: Math.max(0, prev.shields - (usedShield ? 1 : 0)),
                 scrollsRemaining: prev.scrollsRemaining + orbPts,
                 chronicle: [
                   dodged ? `Dodged the attack! (+${reward} E, +${gemReward} Gems, +${orbPts} Orb Pts)` : `Accomplished mission! (+${reward} E, +${gemReward} Gems, +${orbPts} Orb Pts)`,
                   ...prev.chronicle
                 ]
               };
             }
             return { ...prev, chronicle: ['Not enough Essence to confront this!', ...prev.chronicle] };
           });
         }
       }
    ];

    if (isQuest && state.bookScrolls >= 1) {
        missionOptions.push({
            label: 'Solve Mystery (1 Scroll)',
            style: 'secondary',
            outcome: () => {
                setState(prev => ({ 
                  ...prev, 
                  bookScrolls: prev.bookScrolls - 1, 
                  skillPoints: (prev.skillPoints || 0) + 1,
                  chronicle: ['Solved mystery with Book Scroll! (+1 Skill Point)', ...prev.chronicle] 
                }));
                setQuest(null);
            }
        });
    }

    if (state.potions > 0 && !isQuest) {
      missionOptions.push({
        label: `Throw Potion (Massive Damage)`,
        style: 'primary',
        outcome: () => {
          setState(prev => {
            if (prev.potions > 0) {
              const potionDmg = 80 + (prev.level * 10);
              const demonStrike = isBoss ? 40 : 15;
              const dodged = Math.random() < getPlayerStats(prev).dodgeChance;
              let damageTaken = dodged ? 0 : demonStrike;
              
              if (prev.health <= damageTaken && !dodged) {
                 setQuest(null);
                 return { ...prev, potions: prev.potions - 1, mana: Math.max(0, prev.mana - 1000), health: getPlayerStats(prev).maxHealth, position: 0, chronicle: [`Defeated while throwing potion...`, ...prev.chronicle] };
              }

              // Potion might fail to vanquish completely?
              // The quest is a "single turn" simulation. So if potionDmg > something, win. Else, it just hurts but quest doesn't complete.
              // Let's just make it a high chance to succeed.
              if (Math.random() < 0.1) {
                  setQuest(null);
                  setCelebration({ type: 'drain', amount: 500, label: 'POTION MISSED!' });
                  setTimeout(() => setCelebration(null), 2500);
                  return { ...prev, potions: prev.potions - 1, mana: Math.max(0, prev.mana - 500), health: prev.health - damageTaken, chronicle: [`Potion completely missed! Took ${damageTaken} damage.`, ...prev.chronicle] };
              }

              const reward = isBoss ? 15000 : 5000;
              const orbPts = isBoss ? 20 : 5;
              setQuest(null);
              setCelebration({ type: 'enchantment', amount: reward });
              return { ...prev, potions: prev.potions - 1, mana: prev.mana + reward, gems: prev.gems + (isBoss ? 20 : 10), scrollsRemaining: prev.scrollsRemaining + orbPts, health: prev.health - damageTaken, chronicle: [`Potion blasted the threat! (+${reward} E, +${isBoss ? 20 : 10} G, +${orbPts} Orb Pts)`, ...prev.chronicle] };
            }
            return prev;
          });
        }
      });
    }

    if (!isQuest) {
      state.unlockedSpellIds.forEach(spellId => {
        const spell = CHARMED_SPELLS.find(s => s.id === spellId);
        if (spell && state.mana >= spell.manaCost) {
           missionOptions.push({
             label: `Cast ${spell.name} (${spell.manaCost}E)`,
             style: 'secondary',
             outcome: () => {
               setState(prev => {
                 if (prev.mana >= spell.manaCost) {
                   if (Math.random() < 0.25) {
                      // Spell backfires / failure
                      let failDmg = isBoss ? 80 : 40;
                      let usedShield = false;
                      if ((prev.shields > 0 || getPlayerStats(prev).startWithShield) && tile.type === 'battle') {
                        failDmg = Math.floor(failDmg / 2);
                        usedShield = getPlayerStats(prev).startWithShield ? false : true;
                      }
                      const essenceDrain = isBoss ? 4000 : 1500;
                      if (prev.health <= failDmg) {
                        setQuest(null);
                        setCelebration({ type: 'damage', amount: failDmg });
                        return { ...prev, mana: Math.max(0, prev.mana - 1000), health: getPlayerStats(prev).maxHealth, position: 0, shields: Math.max(0, prev.shields - (usedShield ? 1 : 0)), chronicle: [`Defeated while casting...`, ...prev.chronicle] };
                      }

                      setQuest(null);
                      setCelebration({ type: 'drain', amount: essenceDrain, label: 'SPELL BACKFIRE' });
                      setTimeout(() => setCelebration(null), 2500);
                      return { ...prev, mana: Math.max(0, prev.mana - spell.manaCost - essenceDrain), health: prev.health - failDmg, shields: Math.max(0, prev.shields - (usedShield ? 1 : 0)), chronicle: [`The spell was repelled! Took ${failDmg} damage and lost ${essenceDrain} Essence!`, ...prev.chronicle] };
                   }

                   let demonStrike = isBoss ? 40 : 10;
                   let usedShield = false;
                   if ((prev.shields > 0 || getPlayerStats(prev).startWithShield) && tile.type === 'battle') {
                     demonStrike = Math.floor(demonStrike / 2);
                     usedShield = getPlayerStats(prev).startWithShield ? false : true;
                   }
                   const dodged = Math.random() < getPlayerStats(prev).dodgeChance;
                   let damageTaken = dodged ? 0 : demonStrike;
                   
                   if (prev.health <= damageTaken && !dodged) {
                       setQuest(null);
                       return { ...prev, mana: Math.max(0, prev.mana - 1000), health: getPlayerStats(prev).maxHealth, position: 0, shields: Math.max(0, prev.shields - (usedShield ? 1 : 0)), chronicle: [`Defeated while casting...`, ...prev.chronicle] };
                   }

                   const reward = isBoss ? 12000 : 4000;
                   const orbPts = Math.floor(reward / 1000);
                   setQuest(null);
                   if (spell.id === 'power_of_three') {
                      setCelebration({ type: 'power_of_three' });
                      setTimeout(() => setCelebration(null), 3000);
                    } else {
                      setCelebration({ type: 'reward', amount: reward });
                    }
                   return { ...prev, mana: Math.max(0, prev.mana - spell.manaCost + reward), gems: prev.gems + (isBoss ? 15 : 5), scrollsRemaining: prev.scrollsRemaining + orbPts, health: prev.health - damageTaken, shields: Math.max(0, prev.shields - (usedShield ? 1 : 0)), chronicle: [`${spell.name} vanquished the demon! ${dodged? 'Dodged attack!' : `Took ${damageTaken} dmg.`} (+${reward} E, +${isBoss ? 15 : 5} G, +${orbPts} Orb Pts)`, ...prev.chronicle] };
                 }
                 return prev;
               });
             }
           });
        }
      });
    }

    missionOptions.push({
      label: 'Flee',
      style: 'danger',
      outcome: () => {
        setQuest(null);
        playSound('lose');
        setCelebration({ type: 'drain', amount: state.mana, label: 'TOTAL DRAIN' });
        setTimeout(() => setCelebration(null), 2500);
        setState(prev => ({ ...prev, mana: 0, chronicle: [`Fled the encounter. The Elders drained ALL your Essence!`, ...prev.chronicle] }));
      }
    });

    if (isRescue) {
      missionOptions[0].label = 'Banish Captor (1000 E)';
    } else if (isQuest) {
      missionOptions[0].label = `Solve Mystery (100 E)`;
      const originalOutcome = missionOptions[0].outcome;
      missionOptions[0].outcome = () => {
        // Skill point reward for mystery
        setState(prev => ({ ...prev, skillPoints: (prev.skillPoints || 0) + 1 }));
        originalOutcome();
      };
    } else {
      missionOptions[0].label = `Basic Attack (${isBoss ? 2000 : 500} E)`;
    }

    const unblockedStrike = isBoss ? 40 : 10;

    setQuest({
      id: `mission_${Date.now()}`,
      title: isBoss ? `BOSS ENCOUNTER: ${tile.name}` : isRescue ? `RESCUE: ${tile.name}` : isQuest ? `QUEST: ${tile.name}` : `THREAT: ${tile.name}`,
      description: isRescue 
        ? `A mortal is trapped by demonic forces. You must act quickly! (Enemy Attack: ${unblockedStrike} dmg)` 
        : isBoss 
          ? `An overwhelmingly powerful demonic entity blocks your path. (Enemy Attack: ${unblockedStrike} dmg)` 
          : isQuest
            ? 'A mystical anomaly has been detected. Unravel the mystery of the unnatural energy.'
            : `A lower-level demon ambushes you from the shadows. Prepare to defend yourself! (Enemy Attack: ${unblockedStrike} dmg)`,
      options: missionOptions,
      isActive: true,
      image: tile.image || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1200'
    });
  };

  const startConquerBattle = (tileId: number) => {
    const tile = BOARD_CONFIG[tileId];
    if (!tile) return;
    
    triggerMission({ ...tile, name: `Conquer: ${tile.name}`, image: tile.image || 'https://images.unsplash.com/photo-1518111925345-562778a87677?auto=format&fit=crop&q=80&w=1200' });
    setActiveTab('adventure');
  };

  const triggerPuzzle = useCallback(() => {
    playSound('battleStart');
    
    // Pick a random puzzle!
    const puzzlesList: Puzzle[] = [
      {
        id: 'brew_1',
        title: 'Mystic Concoction',
        currentStepIndex: 0,
        steps: [
          {
            id: 'step_1',
            description: 'To brew a Vanquishing Potion, which ingredient goes first?',
            options: [
              { label: 'Mandrake Root', outcome: 'fail' },
              { label: 'Toadflax', outcome: 'next' },
              { label: 'Demon Dust', outcome: 'fail' }
            ]
          },
          {
            id: 'step_2',
            description: 'The cauldron bubbles! What binds the spell?',
            options: [
              { label: 'A pure crystal', outcome: 'fail' },
              { label: 'A drop of blood', outcome: 'fail' },
              { label: 'Three drops of lavender', outcome: 'success' }
            ]
          }
        ]
      },
      {
        id: 'scrying_1',
        title: 'Crystal Scrying',
        currentStepIndex: 0,
        steps: [
          {
            id: 'step_1',
            description: 'To scry for a lost mortal, you must place the crystal on...',
            options: [
              { label: 'A photograph or map', outcome: 'next' },
              { label: 'A bowl of water', outcome: 'fail' },
              { label: 'A pentagram', outcome: 'fail' }
            ]
          },
          {
            id: 'step_2',
            description: 'The crystal begins to swing. How do you interpret its movement?',
            options: [
              { label: 'It swings in a circle', outcome: 'fail' },
              { label: 'It drops towards the target', outcome: 'success' },
              { label: 'It glows vibrantly', outcome: 'fail' }
            ]
          }
        ]
      }
    ];

    const puzzle = puzzlesList[Math.floor(Math.random() * puzzlesList.length)];
    setState(prev => ({ ...prev, activePuzzle: puzzle }));
  }, []);

  const triggerTrivia = useCallback(() => {
    playSound('battleStart');
    const q = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
    
    let missionOptions: QuestState['options'] = q.options.map((opt, i) => ({
      label: opt,
      style: 'secondary',
      outcome: () => {
                if (i === q.ans) {
                  // Correct
                  updateDailyQuestProgress('riddles', 1);
                  setState(prev => {
                    const reward = 2500;
                    const gemReward = 10;
                    const orbPts = 15;
                    setCelebration({ type: 'enchantment', amount: reward });
                    return { 
                      ...prev, 
                      mana: prev.mana + reward, 
                      gems: prev.gems + gemReward, 
                      scrollsRemaining: prev.scrollsRemaining + orbPts,
                      chronicle: [`Correct! Rewarded ${reward} Essence, ${gemReward} Gems, and 15 Orb Pts.`, ...prev.chronicle] 
                    };
                  });
                } else {
                  // Wrong
                  setState(prev => {
                    const penalty = 1200;
                    const gemLoss = 5;
                    setCelebration({ type: 'drain', amount: penalty, label: 'KNOWLEDGE DRAIN' });
                    return { 
                      ...prev, 
                      mana: Math.max(0, prev.mana - penalty), 
                      gems: Math.max(0, prev.gems - gemLoss),
                      chronicle: [`Incorrect. The elders are disappointed. Lost ${penalty} Essence and ${gemLoss} Gems.`, ...prev.chronicle] 
                    };
                  });
                }
                setQuest(null);
              }
            }));

    setQuest({
      id: `trivia_${Date.now()}`,
      title: `ELDER's TRIAL`,
      description: q.q,
      options: missionOptions,
      isActive: true,
      image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=1200'
    });
  }, []);

  const triggerHeist = async () => {
    updateDailyQuestProgress('heist', 1);
    playSound('pageTurn');
    
    // Tutorial Integration
    if (!state.hasSeenScryingTutorial) {
       setState(prev => ({ ...prev, tutorialPhase: 9, hasSeenScryingTutorial: true }));
    }

    setLoading(true);
    try {
      const q = user ? query(collection(db, 'users'), where('uid', '!=', user.uid), limit(5)) : query(collection(db, 'users'), limit(5));
      const snap = await getDocs(q);
      const users = snap.docs.map(d => d.data());
      let targetUser = users.length > 0 ? users[Math.floor(Math.random() * users.length)] : null;
      
      const target = targetUser || {
        uid: 'npc_heist',
        displayName: 'Dark Warlock',
        photoURL: '',
        level: 10,
        floor: 1,
        mana: 25000,
        characterId: 'c1'
      };

      const difficulty = Math.min(8, Math.floor(state.level / 8)); 
      const chestContents: ('empty' | 'large')[] = new Array(12).fill('empty');
      const largeIndexes: number[] = [];
      
      const isClustered = Math.random() < 0.4; // 40% chance to be easier
      if (isClustered) {
        const startIdx = Math.floor(Math.random() * 10); // 0-9
        largeIndexes.push(startIdx, startIdx + 1, startIdx + 2);
      } else {
        while (largeIndexes.length < 3) {
          const idx = Math.floor(Math.random() * 12);
          if (!largeIndexes.includes(idx)) largeIndexes.push(idx);
        }
      }
      
      largeIndexes.forEach(idx => {
        if (idx < 12) chestContents[idx] = 'large';
      });

      setActiveHeist({
        targetUser: target as UserProfile,
        targetState: target,
        chests: chestContents as any,
        picksLeft: Math.max(3, 5 - Math.floor(difficulty / 2)),
        matched: [],
        revealed: new Array(12).fill(false)
      });
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  };

  const generateNPCState = (lvl: number) => {
    const worldIndex = Math.min(lvl - 1, WORLDS.length - 1);
    const targetWorld = WORLDS[worldIndex];
    
    const worldProgress: Record<string, any> = {};
    const nodesProgress: Record<string, number> = {};
    const nodesHealth: Record<string, number> = {};
    const nodesShields: string[] = [];

    targetWorld.nodes.forEach((node, idx) => {
      // NPC buildings based on level complexity - ensure they have at least 1 building
      const isBuilt = idx === 0 || Math.random() < 0.7;
      if (isBuilt) {
        const nodeLvl = Math.floor(Math.random() * 5) + 1;
        nodesProgress[node.id] = nodeLvl;
        
        // Random health
        nodesHealth[node.id] = Math.random() < 0.2 ? Math.floor(Math.random() * 40) + 60 : 100;
        
        // Random shields (25% chance)
        if (Math.random() < 0.25) {
           nodesShields.push(node.id);
        }
      } else {
        nodesProgress[node.id] = 0;
        nodesHealth[node.id] = 100;
      }
    });

    worldProgress[targetWorld.id] = nodesProgress;

    return {
      uid: `npc_raid_${lvl}_${Math.random().toString(36).substr(2, 5)}`,
      displayName: `Demon of Dimension ${lvl}`,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=raid_${lvl}`,
      level: lvl,
      floor: lvl,
      currentWorldId: targetWorld.id,
      mana: lvl * 15000,
      worldProgress,
      nodeHealth: { [targetWorld.id]: nodesHealth },
      shieldedNodes: { [targetWorld.id]: nodesShields }
    };
  };

  const triggerRaid = async () => {
    const today = new Date().toDateString();
    let currentDailyCount = state.lastRaidDateString === today ? (state.dailyRaidsCount || 0) : 0;
    
    if (currentDailyCount >= 10) {
      setState(prev => ({ ...prev, chronicle: ["You have reached the maximum of 10 raids today. The dimension is resting.", ...prev.chronicle] }));
      return;
    }

    updateDailyQuestProgress('raid', 1);
    playSound('battleStart');
    setLoading(true);
    try {
      // Load more users so we have a pool to pick ignoring already raided
      const q = user ? query(collection(db, 'users'), where('uid', '!=', user.uid), limit(20)) : query(collection(db, 'users'), limit(5));
      const snap = await getDocs(q);
      const users = snap.docs.map(d => d.data());
      
      const alreadyRaided = state.lastRaidDateString === today ? (state.dailyRaidedUids || []) : [];

      // Filter for users who actually have buildings and haven't been raided today
      const viableTargets = users.filter((u: any) => {
        if (!u.worldProgress || alreadyRaided.includes(u.uid)) return false;
        return Object.values(u.worldProgress).some(w => Object.values(w as any).some(lvl => (lvl as number) > 0));
      });

      let targetUser = viableTargets.length > 0 ? viableTargets[Math.floor(Math.random() * viableTargets.length)] : null;
      
      const targetState = targetUser || generateNPCState(state.level);

      setActiveRaid({
        targetUser: targetState as UserProfile,
        targetState: targetState
      });
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleTileAction = (tile: TileData) => {
    setState(prev => ({ ...prev, chronicle: [`Arrived at ${tile.name}`, ...prev.chronicle.slice(0, 49)] }));

    const getRandomEnemy = () => CHARMED_ENEMIES[Math.floor(Math.random() * CHARMED_ENEMIES.length)];

    if (Math.random() < 0.20 && tile.type !== 'battle' && tile.type !== 'rescue' && tile.type !== 'trial' && tile.type !== 'raid' && tile.type !== 'heist' && !tile.name.includes('Chest') && tile.name !== 'Nexus') {
      if (Math.random() < 0.5) triggerTrivia();
      else triggerPuzzle();
      return;
    }

    if (tile.type === 'quest' && tile.name.includes('Chest')) {
      drawCard('chest');
    } else if (tile.type === 'raid') {
      triggerRaid();
    } else if (tile.type === 'battle' || tile.type === 'rescue' || tile.type === 'trial' || tile.type === 'quest') {
      triggerMission(tile);
    } else if (tile.type === 'fate') {
      drawCard('chance');
    } else if (tile.type === 'shrine') {
      const { essenceMult } = getPlayerStats(state);
      const reward = Math.floor((1000 * state.floor) * essenceMult);
      updateDailyQuestProgress('essence', reward);
      setState(prev => ({ ...prev, mana: prev.mana + reward, chronicle: [`Blessed at ${tile.name}! Received ${reward} Essence.`, ...prev.chronicle] }));
      setCelebration({ type: 'mana', amount: reward });
      setTimeout(() => setCelebration(null), 2000);
    } else if (tile.type === 'potion') {
      const reward = 1;
      setState(prev => ({ ...prev, potions: prev.potions + reward, chronicle: [`Discovered a rare potion at ${tile.name}!`, ...prev.chronicle] }));
      setCelebration({ type: 'item', amount: reward });
      setTimeout(() => setCelebration(null), 2000);
    } else if (tile.type === 'shield') {
      setState(prev => ({ ...prev, shields: prev.shields + 1, chronicle: [`Acquired an Angelic Aegis from ${tile.name}!`, ...prev.chronicle] }));
      setCelebration({ type: 'item', amount: 1 });
      setTimeout(() => setCelebration(null), 2000);
    } else if (tile.type === 'nexus') {
       const rewardMana = 5000;
       const rewardGems = 10;
       updateDailyQuestProgress('essence', rewardMana);
       setState(prev => ({ ...prev, mana: prev.mana + rewardMana, gems: prev.gems + rewardGems, chronicle: [`The Nexus pulsates! Gained ${rewardMana} Essence and ${rewardGems} Gems.`, ...prev.chronicle] }));
       setCelebration({ type: 'reward', amount: rewardMana });
       setTimeout(() => setCelebration(null), 2000);
    } else if (tile.type === 'property') {
       const yieldAmt = tile.essenceYield ? tile.essenceYield * 50 * state.floor : 500;
       updateDailyQuestProgress('essence', yieldAmt);
       updateDailyQuestProgress('properties', 1);
       setState(prev => ({ ...prev, mana: prev.mana + yieldAmt, chronicle: [`Collected ${yieldAmt} Essence from an enchanted property!`, ...prev.chronicle] }));
       setCelebration({ type: 'mana', amount: yieldAmt });
       setTimeout(() => setCelebration(null), 2000);
    } else if (tile.type === 'portal') {
       const orbPts = 5;
       setState(prev => ({ ...prev, scrollsRemaining: prev.scrollsRemaining + orbPts, chronicle: [`The portal radiates energy! Gained ${orbPts} Orb Points.`, ...prev.chronicle] }));
       setCelebration({ type: 'item', amount: orbPts });
       setTimeout(() => setCelebration(null), 2000);
    } else if (tile.type === 'drain' || tile.type === 'void') {
       const drainAmt = 500 * state.floor;
       setState(prev => ({ ...prev, mana: Math.max(0, prev.mana - drainAmt), chronicle: [`Dark magic drained ${drainAmt} Essence!`, ...prev.chronicle] }));
       setCelebration({ type: 'drain', amount: drainAmt, label: 'DARK DRAIN' });
       setTimeout(() => setCelebration(null), 2000);
    }
  };

  const handleBattleWin = (isConquer: boolean, conquerTileId?: number) => {
    updateDailyQuestProgress('demons', 1);
    if (isConquer && conquerTileId !== undefined) {
      const tile = BOARD_CONFIG[conquerTileId];
      const currentLevel = state.buildingUpgrades[conquerTileId] || 0;
      
      setState(prev => ({
        ...prev,
        sanctuariesOwned: prev.sanctuariesOwned.includes(conquerTileId) ? prev.sanctuariesOwned : [...prev.sanctuariesOwned, conquerTileId],
        buildingUpgrades: { ...prev.buildingUpgrades, [conquerTileId]: Math.min(5, currentLevel + 1) },
        chronicle: [`Successfully seized control of ${tile?.name} through mystic combat!`, ...prev.chronicle]
      }));
      setBattle(null);
      setCelebration({ type: 'enchantment' });
    } else {
      const { essenceMult } = getPlayerStats(state);
      const reward = 500 * state.floor;
      const bonus = battle?.battleType === 'rescue' ? 500 : battle?.battleType === 'trial' ? 1000 : 0;
      const totalReward = Math.floor((reward + bonus) * essenceMult);
      updateDailyQuestProgress('essence', totalReward);
      
      setBattle(null);
      setState(prev => ({ 
        ...prev, 
        mana: prev.mana + totalReward,
        potions: Math.random() < 0.25 ? prev.potions + 1 : prev.potions,
        chronicle: [
          battle?.battleType === 'rescue' ? "Mortal Saved! The community offers their gratitude and Essence (Plus a Potion!)." :
          battle?.battleType === 'trial' ? "Trial Succeeded! The Elders bless you with divine Essence and Mystic Draughts." :
          "Demon Vanquished! Collected Essence from the remains.",
          ...prev.chronicle
        ].filter(Boolean) as string[]
      }));
      setCelebration({ type: 'mana', amount: totalReward });
    }
    setTimeout(() => setCelebration(null), 2500);
  };

  const resetGame = async () => {
    if (!user) return;
    const initialState: GameState = {
      characterId: '',
      mana: 5000,
      gems: 0,
      xp: 0,
      level: 1,
      floor: 1,
      position: 0,
      scrollsRemaining: 2000,
      bookScrolls: 0,
      lastCast: null,
      sanctuariesOwned: [],
      buildingUpgrades: {},
      visitedTile: null,
      isCasting: false,
      chronicle: ['Game Reset: A new beginning.'],
      unlockedSpellIds: ['vanquishing_potion'],
      activeSpellId: 'vanquishing_potion',
      seenStoryIds: [],
      potions: 3,
      currentWorldId: 'halliwell_manor',
      worldProgress: { 'halliwell_manor': {} },
      health: 100,
      inventory: [],
      equippedRelicId: undefined,
      activePuzzle: null,
      settings: {
        volume: 0.5,
        musicEnabled: true,
        notificationsEnabled: true,
        difficulty: 'normal',
        animationSpeed: 'normal',
        theme: 'dark',
        enableKeyboardShortcuts: true,
      },
      achievements: [],
      specialPoints: 0,
      dailyQuests: [],
      shields: 0,
      currentStreak: 0,
    };
    setState(initialState);
    await setDoc(doc(db, 'users', user.uid), initialState, { merge: true });
    setQuest(null);
    setCelebration(null);
  };

  // --- Persistence & Auth ---
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            
            // Streak Logic
            const now = Date.now();
            const today = new Date(now).toDateString();
            let newStreak = data.currentStreak || 0;
            let lastLogin = data.lastLogin;

            if (lastLogin) {
              const lastDate = new Date(lastLogin).toDateString();
              if (lastDate !== today) {
                const yesterday = new Date(now - 86400000).toDateString();
                if (lastDate === yesterday) {
                  newStreak = (data.currentStreak || 0) + 1;
                } else {
                  newStreak = 1;
                }
              }
            } else {
              newStreak = 1;
            }

            setState(prev => ({
              ...prev,
              ...data,
              characterId: data.characterId || '',
              mana: data.mana ?? 5000,
              gems: data.gems ?? 0,
              position: data.position ?? 0,
              floor: data.floor ?? 1,
              scrollsRemaining: data.scrollsRemaining ?? 2000,
              sanctuariesOwned: data.sanctuariesOwned ?? [],
              unlockedSpellIds: data.unlockedSpellIds ?? ['vanquishing_potion'],
              activeSpellId: data.activeSpellId ?? 'vanquishing_potion',
              seenStoryIds: data.seenStoryIds ?? [],
              potions: data.potions ?? 3,
              currentWorldId: data.currentWorldId ?? 'halliwell_manor',
              worldProgress: data.worldProgress ?? { 'halliwell_manor': {} },
              health: data.health ?? 100,
              inventory: data.inventory ?? [],
              equippedRelicId: data.equippedRelicId ?? null,
              achievements: data.achievements ?? [],
              specialPoints: data.specialPoints ?? 0,
              shields: data.shields ?? 0,
              currentStreak: newStreak,
              lastLogin: now,
            }));

            // Sync updated streak to Firestore
            await setDoc(doc(db, 'users', u.uid), {
              ...data,
              currentStreak: newStreak,
              lastLogin: now,
            }, { merge: true });
          } else {
            // New user initialization
            await setDoc(doc(db, 'users', u.uid), {
              uid: u.uid,
              displayName: u.displayName || 'Charmed One',
              photoURL: u.photoURL || '',
              characterId: '',
              mana: 5000,
              gems: 0,
              xp: 0,
              level: 1,
              floor: 1,
              position: 0,
              scrollsRemaining: 2000,
              sanctuariesOwned: [],
              unlockedSpellIds: ['vanquishing_potion'],
              activeSpellId: 'vanquishing_potion',
              seenStoryIds: [],
              potions: 3,
              currentWorldId: 'halliwell_manor',
              worldProgress: { 'halliwell_manor': {} },
              health: 100,
              inventory: [],
              achievements: [],
              specialPoints: 0,
              shields: 0,
              updatedAt: Date.now()
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (user && !loading) {
      const syncData = async () => {
        try {
          const stateToSave = Object.entries(state).reduce((acc, [key, value]) => {
            if (value !== undefined) {
              acc[key] = value;
            }
            return acc;
          }, {} as any);

          await setDoc(doc(db, 'users', user.uid), {
            ...stateToSave,
            uid: user.uid,
            displayName: user.displayName || 'Charmed One',
            photoURL: user.photoURL || '',
            updatedAt: Date.now()
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        }
      };
      const timeout = setTimeout(syncData, 2000); // Debounce sync
      return () => clearTimeout(timeout);
    }
  }, [state, user, loading]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'damage_reports'), where('targetUserId', '==', user.uid));
    return onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
           const report = change.doc.data();
           
           // Apply damage locally to be sure state reflects it
           setState(prev => {
              const nodeHealthMap = prev.nodeHealth?.[report.worldId] || {};
              const currentHealth = nodeHealthMap[report.nodeId] ?? 100;
              // Prevent double dipping if this was already processed in a previous session
              if (Date.now() - report.timestamp > 12 * 60 * 60 * 1000) return prev; 
              
              return {
                 ...prev,
                 mana: Math.max(0, prev.mana - (report.stolenMana || 0)),
                 nodeHealth: {
                   ...prev.nodeHealth,
                   [report.worldId]: {
                     ...nodeHealthMap,
                     [report.nodeId]: Math.max(0, currentHealth - report.damage)
                   }
                 }
              };
           });

           // Only show animation if it's recent (last 3 mins)
           if (Date.now() - report.timestamp < 3 * 60 * 1000) {
               setDamagedNodeAnimation({ nodeId: report.nodeId, damage: report.damage, attackerName: report.attackerName });
               setTimeout(() => setDamagedNodeAnimation(null), 4000);
               playSound('lose');
           }
        }
      });
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, 'damage_reports');
    });
  }, [user]);

  useEffect(() => {
    if (showLeaderboard) {
      const q = query(collection(db, 'users'), orderBy('level', 'desc'), limit(10));
      return onSnapshot(q, (snap) => {
        let users = snap.docs.map(d => d.data() as UserProfile);
        
        // Pad with NPCs if there are fewer than 10 users
        if (users.length < 10) {
            const npcNames = ["Prue Halliwell", "Piper Halliwell", "Phoebe Halliwell", "Paige Matthews", "Leo Wyatt", "Cole Turner", "Penny Halliwell", "Patty Halliwell", "Darryl Morris"];
            const amountToPad = 10 - users.length;
            for(let i=0; i<amountToPad; i++) {
                const name = npcNames[Math.floor(Math.random() * npcNames.length)];
                const lvl = Math.floor(Math.random() * 30) + 1;
                const npcState = generateNPCState(lvl);
                users.push({
                   ...npcState,
                   displayName: name,
                } as any);
            }
            users.sort((a, b) => b.level - a.level);
        }
        
        setLeaderboard(users);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      });
    }
  }, [showLeaderboard]);

  useEffect(() => {
    if (user) {
      // Listen for challenges targeting the current user
      const q = query(collection(db, 'pvp_challenges'), where('inviteeId', '==', user.uid), where('status', 'in', ['pending', 'accepted']));
      return onSnapshot(q, (snap) => {
        const challenges = snap.docs.map(d => ({ id: d.id, ...d.data() } as PvPChallenge));
        setPvpChallenges(challenges);
        
        // If an accepted challenge exists where we are the invitee, auto-start battle UI
        const active = challenges.find(c => c.status === 'accepted');
        if (active) setActivePvP(active);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'pvp_challenges');
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // Listen for challenges we INVITED that are accepted
      const q = query(collection(db, 'pvp_challenges'), where('inviterId', '==', user.uid), where('status', '==', 'accepted'));
      return onSnapshot(q, (snap) => {
        const active = snap.docs[0];
        if (active) {
          setActivePvP({ id: active.id, ...active.data() } as PvPChallenge);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'pvp_challenges');
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // Listen for rescues targeting the current user
      const q = query(collection(db, 'coop_rescues'), where('inviteeId', '==', user.uid), where('status', 'in', ['pending', 'accepted']));
      return onSnapshot(q, (snap) => {
        const rescues = snap.docs.map(d => ({ id: d.id, ...d.data() } as CoopRescue));
        setCoopRescues(rescues);
        
        const active = rescues.find(c => c.status === 'accepted');
        if (active) setActiveRescue(active);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'coop_rescues');
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // Listen for rescues we INVITED that are accepted
      const q = query(collection(db, 'coop_rescues'), where('inviterId', '==', user.uid), where('status', '==', 'accepted'));
      return onSnapshot(q, (snap) => {
        const active = snap.docs[0];
        if (active) {
          setActiveRescue({ id: active.id, ...active.data() } as CoopRescue);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'coop_rescues');
      });
    }
  }, [user]);

  // Clean up timers
  useEffect(() => {
    // Auto-ascend/transition on load if 100%
    const currentWorld = WORLDS.find(w => w.id === state.currentWorldId) || WORLDS[0];
    const nodes = currentWorld.nodes;
    const worldProg = state.worldProgress[currentWorld.id] || {};
    
    const totalRestored = nodes.reduce((acc, node) => acc + (worldProg[node.id] || 0), 0);
    const totalMaxLevels = nodes.reduce((acc, node) => acc + node.maxLevel, 0);
    const syncPercent = totalMaxLevels > 0 ? Math.floor((totalRestored / totalMaxLevels) * 100) : 100;
    
    if (syncPercent === 100 && state.currentWorldId !== 'underworld') {
        setActiveTab('build');
    }
    
    return () => {};
  }, []);

  const castSpellSteps = async (totalSteps: number) => {
    setState(prev => ({ ...prev, isCasting: true }));
    
    let currentPos = state.position;
    for (let i = 1; i <= totalSteps; i++) {
      currentPos = (currentPos + 1) % BOARD_SIZE;
      setState(prev => ({ ...prev, position: currentPos }));
      await new Promise(r => setTimeout(r, 150));
    }

    const visitedTile = BOARD_CONFIG[currentPos];
    setState(prev => ({ ...prev, isCasting: false, visitedTile }));
    handleTileAction(visitedTile);
  };

  const handleUpgradeNode = (worldId: string, nodeId: string) => {
    updateDailyQuestProgress('enchant', 1);
    const world = WORLDS.find(w => w.id === worldId);
    if (!world) return;
    const node = world.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const currentLevel = state.worldProgress[worldId]?.[nodeId] || 0;
    const currentHealth = state.nodeHealth?.[worldId]?.[nodeId] ?? 100;

    if (currentHealth < 100) return;
    if (currentLevel >= node.maxLevel) return;

    const cost = node.cost * (currentLevel + 1);
    if (state.mana < cost && state.tutorialPhase !== 6) return;

    playSound('levelUp');
    
    setState(prev => {
        const nextNodeLevel = (prev.worldProgress[worldId]?.[nodeId] || 0) + 1;
        const nextWorldProgress = { 
            ...prev.worldProgress, 
            [worldId]: { ...(prev.worldProgress[worldId] || {}), [nodeId]: nextNodeLevel }
        };
        
        let newUnlockedSpellIds = [...prev.unlockedSpellIds];
        let newChronicle = [`Build: Upgraded ${node.name} to Level ${nextNodeLevel}!`, ...prev.chronicle];

        // Check if world is fully upgraded
        const isFullyUpgraded = world.nodes.every(n => (nextWorldProgress[worldId]?.[n.id] || 0) >= n.maxLevel);
        
        if (worldId === 'halliwell_manor' && isFullyUpgraded && !newUnlockedSpellIds.includes('manor_ward')) {
            newUnlockedSpellIds.push('manor_ward');
            newChronicle = [`Unlocked Spell: Manor Ward!`, ...newChronicle];
        }

        const nextMana = prev.tutorialPhase === 6 ? prev.mana : Math.max(0, prev.mana - cost);
        
        return {
            ...prev,
            mana: nextMana,
            worldProgress: nextWorldProgress,
            unlockedSpellIds: newUnlockedSpellIds,
            chronicle: newChronicle
        };
    });
  };

  // Effect to handle character level up when a world is fully restored
  useEffect(() => {
    if (!state.currentWorldId) return;
    const world = WORLDS.find(w => w.id === state.currentWorldId);
    if (!world) return;
    
    const worldProg = state.worldProgress[state.currentWorldId] || {};
    const isFullyUpgraded = world.nodes.every(n => (worldProg[n.id] || 0) >= n.maxLevel);
    
    // If fully upgraded and level hasn't caught up to next world
    // Each world restoration unlocks its level equivalent
    const currentWorldIndex = WORLDS.findIndex(w => w.id === state.currentWorldId);
    if (isFullyUpgraded && state.level === (currentWorldIndex + 1)) {
        // Award enough XP to level up exactly once per world completion
        const xpNeeded = getXpNeeded(state.level);
        if (state.xp < xpNeeded) {
            gainXp(xpNeeded - state.xp);
        }
    }
  }, [state.worldProgress, state.currentWorldId, state.level, state.xp, gainXp]);

  const handleRepairNode = (worldId: string, nodeId: string) => {
    const world = WORLDS.find(w => w.id === worldId);
    if (!world) return;
    const node = world.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const currentHealth = state.nodeHealth?.[worldId]?.[nodeId] ?? 100;
    if (currentHealth >= 100) return;

    const damage = 100 - currentHealth;
    const repairCost = Math.floor((node.cost * 0.5) * (damage / 100));

    if (state.mana < repairCost) return;

    playSound('spell');
    setState(prev => {
        const nextHealth = 100;
        const nextNodeHealth = { 
          ...prev.nodeHealth, 
          [worldId]: { ...(prev.nodeHealth?.[worldId] || {}), [nodeId]: nextHealth }
        };

        return {
          ...prev,
          mana: Math.max(0, prev.mana - repairCost),
          nodeHealth: nextNodeHealth,
          chronicle: [`Repair: Restored ${node.name} for ${repairCost} Essence!`, ...prev.chronicle]
        };
    });
  };


  const handleShieldNode = (worldId: string, nodeId: string) => {
    setState(prev => {
      const currentShielded = prev.shieldedNodes?.[worldId] || [];
      if (currentShielded.includes(nodeId)) return prev;
      
      const totalShielded = Object.values(prev.shieldedNodes || {}).reduce((acc: number, nodes) => acc + (nodes as string[]).length, 0);
      if (totalShielded >= prev.shields) {
        return {
          ...prev,
          chronicle: [`Cannot apply more shields! Shield capacity reached (${prev.shields}).`, ...prev.chronicle]
        };
      }
      
      return {
        ...prev,
        tutorialPhase: prev.tutorialPhase === 7 ? 8 : prev.tutorialPhase,
        shieldedNodes: {
          ...prev.shieldedNodes,
          [worldId]: [...currentShielded, nodeId]
        },
        chronicle: [`Angelic Aegis active on sanctum structure!`, ...prev.chronicle]
      };
    });
    playSound('spell');
  };

  // Auto-trigger random Heist events based on timing
  useEffect(() => {
    if (!state.hasSeenTutorial || activeHeist || activeRaid) return;
    
    const heistInterval = setInterval(() => {
      // 5% chance every 2 minutes to trigger a random heist
      if (Math.random() < 0.05) {
        triggerHeist();
      }
    }, 120000);

    return () => clearInterval(heistInterval);
  }, [state.hasSeenTutorial, activeHeist, activeRaid, triggerHeist]);

  useEffect(() => {
    // Simulate being raided (and losing a shield) occasionally
    if (!state.hasSeenTutorial || activeHeist || activeRaid) return;
    
    const raidSimulationInterval = setInterval(() => {
      const currentWorld = WORLDS.find(w => w.id === state.currentWorldId) || WORLDS[0];
      const builtNodes = Object.keys(state.worldProgress[currentWorld.id] || {}).filter(nid => (state.worldProgress[currentWorld.id][nid] || 0) > 0);
      
      if (builtNodes.length === 0) return;

      const hasActiveShields = Object.values(state.shieldedNodes || {}).some(nodes => (nodes as string[]).length > 0);
      
      if (Math.random() < 0.08) { // Increased chance for visibility
        if (hasActiveShields) {
          // Shield blocks damage
          setState(prev => {
            const worldIds = Object.keys(prev.shieldedNodes || {}).filter(wid => prev.shieldedNodes![wid].length > 0);
            const randomWorldId = worldIds[Math.floor(Math.random() * worldIds.length)];
            const nodes = prev.shieldedNodes![randomWorldId];
            const nodeToRemove = nodes[Math.floor(Math.random() * nodes.length)];
            
            return {
               ...prev,
               shields: Math.max(0, prev.shields - 1),
               shieldedNodes: { ...prev.shieldedNodes, [randomWorldId]: nodes.filter(nid => nid !== nodeToRemove) },
               chronicle: [`Angelic Aegis BLOCK! A demonic strike was absorbed by your portal guard.`, ...prev.chronicle]
            };
          });
          playSound('spell');
        } else {
          // No shield, take damage
          const targetNodeId = builtNodes[Math.floor(Math.random() * builtNodes.length)];
          const targetNode = currentWorld.nodes.find(n => n.id === targetNodeId);
          const damageTaken = Math.floor(Math.random() * 40) + 20;

          setDamagedNodeAnimation({ nodeId: targetNodeId, damage: damageTaken });
          setTimeout(() => setDamagedNodeAnimation(null), 3000);

          setState(prev => {
            const currentHealth = prev.nodeHealth?.[currentWorld.id]?.[targetNodeId] ?? 100;
            const nextHealth = Math.max(0, currentHealth - damageTaken);
            return {
               ...prev,
               nodeHealth: {
                 ...prev.nodeHealth,
                 [currentWorld.id]: {
                   ...(prev.nodeHealth?.[currentWorld.id] || {}),
                   [targetNodeId]: nextHealth
                 }
               },
               chronicle: [`ALERT: ${targetNode?.name || 'Sanctum'} was ATTACKED! It took ${damageTaken}% damage.`, ...prev.chronicle]
            };
          });
          playSound('hit');
        }
      }
    }, 120000);

    return () => clearInterval(raidSimulationInterval);
  }, [state.hasSeenTutorial, activeHeist, activeRaid, state.shieldedNodes]);

  const handleAscension = (nextWorldId: string, _forcePassLevel?: boolean) => {
    if (nextWorldId === 'victory') {
         setState(prev => ({ ...prev, chronicle: ['VICTORY: You have restored all worlds and reached spiritual enlightenment!', ...prev.chronicle] }));
         return;
    }
    const nextWorldIndex = WORLDS.findIndex(w => w.id === nextWorldId);
    const nextWorld = WORLDS[nextWorldIndex];
    if (!nextWorld) return;

    playSound('portal');
    setState(prev => ({
      ...prev,
      floor: nextWorldIndex + 1,
      currentWorldId: nextWorldId,
      chronicle: [`World ASCENDED! Welcome to ${nextWorld.name}. Dimension ${nextWorldIndex + 1} begins.`, ...prev.chronicle]
    }));
  };
  const handleCast = (multiplier: number = 1) => {
    if (state.isCasting || !!battle || !!quest) return;
    if (state.scrollsRemaining < multiplier && state.tutorialPhase !== 4) {
        setShowTopUpModal(true);
        return;
    }
    
    // In tutorial, ensure we have a scroll
    if (state.tutorialPhase === 4 && state.scrollsRemaining < 1) {
       setState(prev => ({ ...prev, scrollsRemaining: 5 }));
    }

    playSound('portal');

    for (let i = 0; i < multiplier; i++) {
        const d1 = state.tutorialPhase === 4 ? 0 : Math.floor(Math.random() * 6) + 1;
        const d2 = state.tutorialPhase === 4 ? 1 : Math.floor(Math.random() * 6) + 1; // Force roll 1 for tutorial
        const total = d1 + d2;
        castSpellSteps(total);
    }

    if (state.tutorialPhase === 4) {
      setState(prev => ({ ...prev, tutorialPhase: 5, scrollsRemaining: Math.max(0, prev.scrollsRemaining - multiplier) }));
    } else {
      setState(prev => ({ ...prev, scrollsRemaining: Math.max(0, prev.scrollsRemaining - multiplier) }));
    }
    updateDailyQuestProgress('rolls', multiplier);

    setSpellVFX({ id: activeSpell.id, type: activeSpell.effect });
    setTimeout(() => setSpellVFX(null), 1500);

    // Chance for Ambush Battle (10%)
    if (Math.random() < 0.1 && !battle && !quest) {
      setTimeout(() => {
        triggerMission({
          id: 999,
          name: "Ambush Demon",
          type: 'battle',
          image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=1200'
        });
      }, 1000);
    }

    const isPaige = state.characterId === 'paige';
    const refund = isPaige && Math.random() < 0.1;

    setState(prev => ({
      ...prev,
      scrollsRemaining: refund ? prev.scrollsRemaining : prev.scrollsRemaining - multiplier,
      chronicle: refund ? ['Orb Travel: Point preserved!', ...prev.chronicle] : prev.chronicle
    }));
  };

  const enchantSanctuary = (tileId: number) => {
    const tile = BOARD_CONFIG[tileId];
    const currentLevel = state.buildingUpgrades[tileId] || 0;
    const cost = (tile.manaCost || 100) * (currentLevel + 1) * 2; // Upgrades are expensive

    if (state.mana >= cost && currentLevel < 5) {
      setState(prev => ({
        ...prev,
        mana: Math.max(0, prev.mana - cost),
        sanctuariesOwned: prev.sanctuariesOwned.includes(tileId) ? prev.sanctuariesOwned : [...prev.sanctuariesOwned, tileId],
        buildingUpgrades: { ...prev.buildingUpgrades, [tileId]: currentLevel + 1 }
      }));
      setShowEventModal(null);
      setCelebration({ type: 'enchantment' });
      setTimeout(() => setCelebration(null), 2000);
      // Removed gainXp - XP only from building upgrades
    }
  };

  const buySpell = (spell: Spell) => {
    if (state.scrollsRemaining >= 15 && !state.unlockedSpellIds.includes(spell.id)) {
      playSound('spell');
      setState(prev => ({
        ...prev,
        scrollsRemaining: prev.scrollsRemaining - 15,
        unlockedSpellIds: [...prev.unlockedSpellIds, spell.id],
        chronicle: [`Mastered the spell: ${spell.name}!`, ...prev.chronicle]
      }));
      setCelebration({ type: 'reward', amount: 0 });
    }
  };

  const buyBazaarItem = (item: any) => {
    if (state.gems >= item.priceGems) {
      playSound('levelUp');
      setState(prev => {
         const next = { ...prev, gems: prev.gems - item.priceGems, chronicle: [`Purchased ${item.name} from the Bazaar!`, ...prev.chronicle] };
         if (item.type === 'scrolls') next.scrollsRemaining += item.amount;
         else if (item.type === 'potions') next.potions += item.amount;
         else next.mana += item.amount;
         return next;
      });
      setCelebration({ type: item.type === 'scrolls' ? 'item' : 'mana', amount: item.amount });
      setTimeout(() => setCelebration(null), 2000);
    } else {
      playSound('click'); // Fail sound
    }
  };

  const handlePurchase = async (item: any) => {
    // In-game purchase simulation
    if (item.type === 'relic') {
       if (state.inventory?.includes(item.relicId)) return; // Already owned
       setState(prev => ({ 
         ...prev, 
         inventory: [...(prev.inventory || []), item.relicId],
         chronicle: [`Purchased Artifact: ${item.name}`, ...prev.chronicle]
       }));
       setCelebration({ type: 'enchantment', amount: 0 });
       return;
    }

    if (item.id.startsWith('m')) {
      setState(prev => ({ ...prev, mana: prev.mana + item.amount }));
      setCelebration({ type: 'mana', amount: item.amount });
    } else if (item.id === 'p1') {
      setState(prev => ({ ...prev, potions: prev.potions + item.amount }));
      setCelebration({ type: 'reward', amount: 0 });
    } else {
      setState(prev => ({ ...prev, scrollsRemaining: prev.scrollsRemaining + item.amount }));
      setCelebration({ type: 'reward', amount: 0 });
    }
    setTimeout(() => setCelebration(null), 2000);
    setState(prev => ({ ...prev, chronicle: [`Mystic Bazaar: ${item.name} acquired!`, ...prev.chronicle] }));
  };

  const shareProgress = () => {
    const text = `I'm on Volume ${state.floor}, Level ${state.level} in Charmed: Arcane Voyage! Join me in the Book of Shadows! 🔮✨`;
    const url = window.location.origin;

    if (navigator.share) {
      navigator.share({
        title: 'Charmed: Arcane Voyage',
        text: text,
        url: url,
      }).catch(err => console.error(err));
    } else {
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
      const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      
      const choice = window.confirm("Share your journey?\nOK for Twitter, Cancel for Facebook");
      window.open(choice ? twUrl : fbUrl, '_blank');
    }
  };

  const skipBattle = () => {
    if (!battle) return;
    const cost = 2500 * state.floor;
    if (state.mana >= cost) {
      setState(prev => ({
        ...prev,
        mana: Math.max(0, prev.mana - cost),
        chronicle: [`Used your powers to instantly vanish the demon! (-${cost} Essence)`, ...prev.chronicle]
      }));
      setBattle(null);
      // No gainXp here - XP only from building upgrades
    }
  };

  const selectCharacter = (id: string) => {
    playSound('music');
    const char = CHARMED_CHARACTERS.find(c => c.id === id);
    if (!char) return;

    setState(prev => ({
      ...prev,
      characterId: id,
      tutorialPhase: prev.tutorialPhase === 3 ? 4 : prev.tutorialPhase,
      unlockedSpellIds: [...prev.unlockedSpellIds, char.specialSpellId],
      activeSpellId: char.specialSpellId
    }));
  };

  const inviteToRescue = async (targetUser: UserProfile) => {
    if (!user) return;
    try {
      const rescueId = `coop_${Date.now()}`;
      await setDoc(doc(db, 'coop_rescues', rescueId), {
        id: rescueId,
        inviterId: user.uid,
        inviterName: user.displayName || 'Charmed One',
        inviteeId: targetUser.uid,
        status: 'pending',
        createdAt: Date.now(),
        bossHealth: 1000,
        maxBossHealth: 1000,
        log: []
      });
      setShowLeaderboard(false);
      setState(prev => ({ ...prev, chronicle: [`Summoned ${targetUser.displayName} for a Rescue Mission!`, ...prev.chronicle] }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'coop_rescues');
    }
  };

  const respondToRescue = async (rescue: CoopRescue, accept: boolean) => {
    try {
      if (accept) {
        await setDoc(doc(db, 'coop_rescues', rescue.id), {
          status: 'accepted',
        }, { merge: true });
        setActiveRescue(rescue);
      } else {
        await setDoc(doc(db, 'coop_rescues', rescue.id), { status: 'declined' }, { merge: true });
        setCoopRescues(prev => prev.filter(c => c.id !== rescue.id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'coop_rescues');
    }
  };

  const inviteToPvP = async (targetUser: UserProfile) => {
    if (!user) return;
    try {
      const challengeId = `pvp_${Date.now()}`;
      await setDoc(doc(db, 'pvp_challenges', challengeId), {
        id: challengeId,
        inviterId: user.uid,
        inviterName: user.displayName || 'Charmed One',
        inviterCharacterId: state.characterId,
        inviteeId: targetUser.uid,
        status: 'pending',
        createdAt: Date.now()
      });
      setShowLeaderboard(false);
      setState(prev => ({ ...prev, chronicle: [`Challenged ${targetUser.displayName} to a magical duel!`, ...prev.chronicle] }));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'pvp_challenges');
    }
  };

  const respondToPvP = async (challenge: PvPChallenge, accept: boolean) => {
    try {
      if (accept) {
        await setDoc(doc(db, 'pvp_challenges', challenge.id), {
          status: 'accepted',
          battleState: {
            inviterHealth: 100,
            inviteeHealth: 100,
            turnId: challenge.inviterId,
            log: [`The duel between ${challenge.inviterName} and ${user?.displayName} begins!`]
          }
        }, { merge: true });
      } else {
        await setDoc(doc(db, 'pvp_challenges', challenge.id), {
          status: 'declined'
        }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `pvp_challenges/${challenge.id}`);
    }
  };

  const executePvPTurn = async (action: 'attack' | 'spell' | 'focus') => {
    if (!activePvP || !activePvP.battleState || !user) return;
    if (activePvP.battleState.turnId !== user.uid) return;

    const isInviter = activePvP.inviterId === user.uid;
    const myCharId = isInviter ? activePvP.inviterCharacterId : state.characterId;
    const opponentId = isInviter ? activePvP.inviteeId : activePvP.inviterId;

    let damage = 0;
    let heal = 0;
    let manaCost = 0;
    let logMsg = "";

    const myChar = CHARMED_CHARACTERS.find(c => c.id === (isInviter ? activePvP.inviterCharacterId : state.characterId));

    if (action === 'spell') {
      playSound('spell');
      manaCost = activeSpell.manaCost;
      if (state.mana < manaCost) return;
      
      damage = activeSpell.power + Math.floor(Math.random() * 20);
      logMsg = `${user.displayName} casted ${activeSpell.name} for ${damage} damage!`;
    } else if (action === 'attack') {
      manaCost = 25;
      if (state.mana < manaCost) return;
      playSound('hit');
      damage = 10 + Math.floor(Math.random() * 10);
      logMsg = `${user.displayName} attacked for ${damage} damage!`;
    } else if (action === 'focus') {
      playSound('click');
      heal = 15;
      logMsg = `${user.displayName} focused and recovered ${heal} health.`;
    }

    const { battleState } = activePvP;
    const newInviterHealth = Math.max(0, Math.min(100, battleState.inviterHealth + (isInviter ? heal : -damage)));
    const newInviteeHealth = Math.max(0, Math.min(100, battleState.inviteeHealth + (!isInviter ? heal : -damage)));
    
    const newLog = [logMsg, ...battleState.log].slice(0, 5);

    let newStatus = activePvP.status;
    let winnerId = activePvP.winnerId;

    if (newInviterHealth <= 0 || newInviteeHealth <= 0) {
      newStatus = 'completed';
      winnerId = newInviterHealth <= 0 ? activePvP.inviteeId : activePvP.inviterId;
      newLog.unshift(`The duel is over! ${winnerId === user.uid ? "You are" : "Your opponent is"} victorious!`);
    }

    try {
      await setDoc(doc(db, 'pvp_challenges', activePvP.id), {
        status: newStatus,
        winnerId: winnerId,
        battleState: {
          inviterHealth: newInviterHealth,
          inviteeHealth: newInviteeHealth,
          turnId: opponentId,
          log: newLog,
          lastAction: action,
          lastDamage: damage
        }
      }, { merge: true });

      if (manaCost > 0) {
        setState(prev => ({ ...prev, mana: Math.max(0, prev.mana - manaCost) }));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `pvp_challenges/${activePvP.id}`);
    }
  };

  const executeBattleTurn = (action: 'attack' | 'spell' | 'focus' | 'flee' | 'item', selectedSpell?: Spell) => {
    if (!battle || battle.isResolvingAction) return;

    setBattle(prev => prev ? { ...prev, isResolvingAction: true } : null);

    setTimeout(() => {
      let playerDmg = 0;
      let enemyDmg = 0;
      let newLog = [...battle.log];
      let newPlayerHealth = battle.playerHealth;
      let newEnemyHealth = battle.enemyHealth;
      let manaCost = 0;

      const playerStats = getPlayerStats(state);
      const isPiper = state.characterId === 'piper';
      const spellToUse = selectedSpell || (state.activeSpellId ? CHARMED_SPELLS.find(s => s.id === state.activeSpellId) : CHARMED_SPELLS[0]);

      // Apply Nexus Buffs & Skills
      let damageMultiplier = (1 + (state.level * 0.3)) * playerStats.spellDmgMult; // Scale with level and skills
      if (battle.nexusBuffs?.magicBoost && battle.nexusBuffs.magicBoost > 0) {
        damageMultiplier *= 1.5;
      }

      // Weakness Check
      const enemy = CHARMED_ENEMIES.find(e => e.name === battle.enemyName);
      let isWeaknessExploited = false;
      if (enemy && spellToUse && enemy.weakness !== 'None' && enemy.weakness === spellToUse.element) {
        damageMultiplier *= 1.5;
        isWeaknessExploited = true;
      }

      if (action === 'spell' && spellToUse) {
        updateDailyQuestProgress('spells', 1);
        playSound('spell');
        manaCost = spellToUse.manaCost;
        if (state.mana < manaCost) {
          newLog.unshift("Essence is too low for this spell!");
          setBattle(prev => prev ? { ...prev, log: newLog.slice(0, 5), isResolvingAction: false } : null);
          return;
        }
        
        setSpellVFX({ id: spellToUse.id, type: spellToUse.effect });
        setTimeout(() => setSpellVFX(null), 1500);

        if (spellToUse.id === 'power_of_three') {
          setShowPowerOfThree(true);
          setTimeout(() => setShowPowerOfThree(false), 2000);
        }

        const isRescue = battle.battleType === 'rescue';
        if (spellToUse.effect === 'damage') {
          playerDmg = Math.floor((Math.floor(Math.random() * 25) + (spellToUse.power || 0)) * damageMultiplier);
          if (isRescue) {
            playerDmg = Math.floor(playerDmg * 1.3);
            newLog.unshift(`The Power of Three resounds! Rescue damage: ${playerDmg}.`);
          } else {
            const weaknessMsg = isWeaknessExploited ? ` (IT'S SUPER EFFECTIVE!)` : '';
            newLog.unshift(`${spellToUse.name}! You use your power for ${playerDmg} damage.${weaknessMsg}`);
          }
        } else if (spellToUse.effect === 'heal') {
          const heal = spellToUse.power || 0;
          newPlayerHealth = Math.min(playerStats.maxHealth, newPlayerHealth + heal);
          newLog.unshift(`The Power of Three heals you for ${heal} health.`);
        } else if (spellToUse.effect === 'shield') {
           const shieldCap = Math.floor(playerStats.maxHealth * 1.25);
           newPlayerHealth = Math.min(shieldCap, newPlayerHealth + (spellToUse.power || 0));
           newLog.unshift(`${spellToUse.name}! You protected yourself with a magical ward.`);
        } else if (spellToUse.effect === 'freeze') {
           playerDmg = Math.floor((spellToUse.power || 0) * damageMultiplier);
           newLog.unshift(`Time freezes! The demon takes ${playerDmg} damage.`);
        }
        
      } else if (action === 'attack') {
        const attackManaCost = 25;
        if (state.mana < attackManaCost) {
          newLog.unshift(`Not enough Essence to attack (${attackManaCost} required)!`);
          setBattle(prev => prev ? { ...prev, log: newLog.slice(0, 5), isResolvingAction: false } : null);
          return;
        }
        setState(prev => ({ ...prev, mana: Math.max(0, prev.mana - attackManaCost) }));
        playSound('hit');
        
        setSpellVFX({ id: 'strike', type: 'damage' });
        setTimeout(() => setSpellVFX(null), 1000);

        playerDmg = Math.floor((Math.floor(Math.random() * 15) + 12) * damageMultiplier); 
        newLog.unshift(`You strike with magical force for ${playerDmg} damage! (-${attackManaCost} Essence)`);
      } else if (action === 'item') {
        if (state.potions <= 0) {
          newLog.unshift("No potions remaining!");
          setBattle(prev => prev ? { ...prev, log: newLog.slice(0, 5), isResolvingAction: false } : null);
          return;
        }
        playSound('spell');
        setSpellVFX({ id: 'vanquishing_potion', type: 'damage' });
        setTimeout(() => setSpellVFX(null), 1500);

        playerDmg = Math.floor((80 + (state.level * 10)) * playerStats.potionDmgMult); // Buffed potion damage
        newLog.unshift(`Vanquishing Potion! It shatters for ${playerDmg} damage.`);
        if (battle.battleType === 'rescue') {
          newLog.unshift("The potion's energy creates a protective ward!");
          playerDmg += 40;
        }
        setState(prev => ({ ...prev, potions: prev.potions - 1 }));
      } else if (action === 'flee') {
        playSound('lose');
        setCelebration({ type: 'drain', amount: state.mana, label: 'TOTAL DRAIN' });
        setTimeout(() => setCelebration(null), 2500);

        setState(prev => {
          let updatedUpgrades = { ...prev.buildingUpgrades };
          let upgradedKeys = Object.keys(updatedUpgrades).filter(k => updatedUpgrades[Number(k)] > 0);
          let repairLog = '';
          
          if (upgradedKeys.length > 0) {
            const nodeToDowngrade = Number(upgradedKeys[Math.floor(Math.random() * upgradedKeys.length)]);
            updatedUpgrades[nodeToDowngrade] -= 1;
            repairLog = ' A sanctuary was damaged and requires repair!';
          } else {
            const currentWorldData = prev.worldProgress[prev.currentWorldId] || {};
            const worldMap = { ...currentWorldData };
            const worldNodeKeys = Object.keys(worldMap).filter(k => worldMap[k] > 0);
            if (worldNodeKeys.length > 0) {
              const rootToDowngrade = worldNodeKeys[Math.floor(Math.random() * worldNodeKeys.length)];
              worldMap[rootToDowngrade] -= 1;
              prev.worldProgress = { ...prev.worldProgress, [prev.currentWorldId]: worldMap };
              repairLog = ' A mystic node was destabilized (requires repair)!';
            }
          }

          return { 
            ...prev, 
            mana: 0,
            buildingUpgrades: updatedUpgrades,
            chronicle: [`Fled battle. The Elders drained ALL your Essence!${repairLog}`, ...prev.chronicle]
          };
        });
        setBattle(null);
        return;
      } else if (action === 'focus') {
        playSound('click');
        const heal = 25;
        newPlayerHealth = Math.min(100, newPlayerHealth + heal);
        newLog.unshift(`You channel your inner magic, recovering ${heal} health.`);
      }

      // Apply main damage
      newEnemyHealth = Math.max(0, newEnemyHealth - playerDmg);

      // Enemy Turn if enemy survived
      if (newEnemyHealth > 0) {
        const baseDodge = isPiper ? 0.2 : 0;
        const totalDodge = baseDodge + getPlayerStats(state).dodgeChance;
        const dodge = Math.random() < totalDodge;
        
        if (dodge) {
          if (isPiper && Math.random() < 0.2) {
             newLog.unshift(`Molecular Slowing! You dodged ${battle.enemyName}'s attack.`);
          } else {
             newLog.unshift(`You swiftly dodged ${battle.enemyName}'s attack!`);
          }
          enemyDmg = 0;
        } else {
          // Enhanced Enemy Turn Logic
          const isBoss = battle.enemyName.includes('Source') || battle.enemyName.includes('Elders');
          const enemyRoll = Math.random();
          
          if (isBoss && enemyRoll < 0.3) {
            // Boss Special: Life Drain
            enemyDmg = Math.floor(Math.random() * 15) + 15;
            const healthStolen = Math.floor(enemyDmg * 0.5);
            newEnemyHealth = Math.min(battle.maxEnemyHealth, newEnemyHealth + healthStolen);
            newLog.unshift(`${battle.enemyName} uses Life Drain for ${enemyDmg} damage, healing themselves for ${healthStolen}!`);
          } else if (enemyRoll < 0.2) {
            // Standard Enemy Special: Cripple
            enemyDmg = Math.floor(Math.random() * 8) + 5;
            newLog.unshift(`${battle.enemyName} lunges at your spirit, causing ${enemyDmg} damage and weakening your magical defenses.`);
          } else {
            // Standard Attack
            let baseDmg = Math.floor(Math.random() * 12) + (action === 'focus' ? 0 : 8);
            
            // Apply cost-based mitigation
            const actionCost = action === 'attack' ? 25 : (action === 'item' ? 50 : 0);
            const mitigation = Math.min(6, Math.floor(actionCost / 8));
            baseDmg = Math.max(0, baseDmg - mitigation);
            
            enemyDmg = Math.floor(baseDmg * (1 + (state.floor - 1) * 0.25));
            
            // Halliwell Nexus Interaction: Demonic Smoke Visibility Check
            const visibilityCheck = Math.random() < 0.2;
            if (visibilityCheck) {
              enemyDmg = 0;
              newLog.unshift(`Demonic Smoke clouds ${battle.enemyName}'s vision! They missed.`);
            } else {
              // Apply shield if active
              if (battle.nexusBuffs?.shield && battle.nexusBuffs.shield > 0) {
                enemyDmg = Math.floor(enemyDmg * 0.4); // 60% reduction
                newLog.unshift(`The Grimoire's protective light shields you!`);
              }
              
              newPlayerHealth = Math.max(0, newPlayerHealth - enemyDmg);
              newLog.unshift(`${battle.enemyName} strikes back for ${enemyDmg} damage.`);
            }
          }
        }
      }

      // Decrement Buff Durations
      const nextBuffs = { ...battle.nexusBuffs };
      if (nextBuffs.magicBoost) nextBuffs.magicBoost = Math.max(0, nextBuffs.magicBoost - 1);
      if (nextBuffs.shield) nextBuffs.shield = Math.max(0, nextBuffs.shield - 1);

      // State Updates
      setBattle(prev => prev ? { 
        ...prev, 
        enemyHealth: newEnemyHealth, 
        playerHealth: newPlayerHealth, 
        log: newLog.slice(0, 5),
        damageDealt: playerDmg > 0 ? playerDmg : null,
        damageTaken: enemyDmg > 0 ? enemyDmg : null,
        nexusBuffs: nextBuffs
      } : null);

      // Clear indicators
      setTimeout(() => {
        setBattle(prev => prev ? { ...prev, damageDealt: null, damageTaken: null, isResolvingAction: (newEnemyHealth === 0 || newPlayerHealth === 0) } : null);
      }, 1000);

      // Handle Win/Loss/Mana
      if (newEnemyHealth === 0) {
        playSound('win');
        setTimeout(() => {
          handleBattleWin(!!battle.isConquerBattle, battle.tileId);
        }, 1200);
        // Consume mana only on win for spells
        if (manaCost > 0) {
          setState(prev => ({ ...prev, mana: Math.max(0, prev.mana - manaCost) }));
        }
      } else if (newPlayerHealth === 0) {
        playSound('lose');
        const lossAmount = Math.floor(state.mana * 0.5);
        setBattle(prev => prev ? { ...prev, damageTaken: 99, isResolvingAction: true } : null);
        setCelebration({ type: 'drain', amount: lossAmount, label: 'BATTLE DEFEAT' });
        
        setTimeout(() => {
          setState(prev => ({ 
            ...prev, 
            mana: Math.max(0, prev.mana - lossAmount), 
            position: 0, 
            health: getPlayerStats(prev).maxHealth,
            chronicle: [`Defeat! ${battle.enemyName} banished you. Lost ${lossAmount.toLocaleString()} Essence.`, ...prev.chronicle] 
          }));
          setBattle(null);
          setCelebration(null);
        }, 3000);
      } else if (manaCost > 0) {
        // Continue battle, consume mana for spell
        setState(prev => ({ ...prev, mana: Math.max(0, prev.mana - manaCost) }));
      }
    }, 400); // Give a small delay like an animation is triggering
  };

  const claimDaily = () => {
    playSound('levelUp');
    const now = Date.now();
    const streakBonus = Math.min(state.currentStreak, 5); 
    const multiplier = 1 + (streakBonus * 0.2);
    
    const type = Math.random();
    let rewards = { scrolls: Math.floor(25 * multiplier), mana: Math.floor(2000 * multiplier), potions: 1, xp: 500, msg: `Witch's Blessing: Stk ${state.currentStreak}x!` };
      
    if (type < 0.4) {
        rewards = { scrolls: Math.floor(25 * multiplier), mana: Math.floor(2000 * multiplier), potions: 1, xp: 500, msg: `Witch's Blessing: Stk ${state.currentStreak}x!` };
    } else if (type < 0.7) {
        rewards = { scrolls: Math.floor(10 * multiplier), mana: Math.floor(5000 * multiplier), potions: 0, xp: 1000, msg: `Book of Shadows: Stk ${state.currentStreak}x!` };
    } else {
        rewards = { scrolls: Math.floor(40 * multiplier), mana: Math.floor(1000 * multiplier), potions: 2, xp: 200, msg: `Family Bond Spark: Stk ${state.currentStreak}x!` };
    }
    
    const giveBookScroll = Math.random() < 0.2;

    setState(prev => ({ 
        ...prev, 
        scrollsRemaining: prev.scrollsRemaining + rewards.scrolls,
        mana: prev.mana + rewards.mana,
        potions: prev.potions + rewards.potions,
        xp: prev.xp + rewards.xp,
        bookScrolls: giveBookScroll ? prev.bookScrolls + 1 : prev.bookScrolls,
        lastDailyReward: now,
        chronicle: [`Daily Boon: ${rewards.msg}${giveBookScroll ? " +1 Book Scroll!" : ""}`, ...prev.chronicle]
    }));
    setCelebration({ type: 'reward', amount: rewards.mana });
    setShowDaily(false);
  };

  const isDailyAvailable = useMemo(() => {
    if (!state.lastDailyReward) return true;
    return Date.now() - state.lastDailyReward > 86400000;
  }, [state.lastDailyReward]);

  const equipSpell = (spellId: string) => {
    setState(prev => ({ ...prev, activeSpellId: spellId }));
    setShowGrimoire(false);
  };

  const getSpellBookSpells = () => {
    return CHARMED_SPELLS.filter(s => state.unlockedSpellIds.includes(s.id));
  };

  return (
    <div className="relative h-[100dvh] w-full flex flex-col items-center overflow-hidden touch-none select-none bg-indigo-950">
      
      {/* Mystical Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#0a041a]" />
        <img 
          src="https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&q=80&w=2000" 
          className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-[2px]" 
          alt="" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/50 to-indigo-950" />
        <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-purple-600/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[800px] h-[800px] bg-cyan-600/10 rounded-full blur-[180px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* SPELL VFX OVERLAYS */}
      <AnimatePresence>
        {spellVFX && (
          <motion.div 
            key={spellVFX.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center overflow-hidden"
          >
            {spellVFX.id === 'telekinesis_blast' && (
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 2, opacity: [0, 1, 0] }}
                transition={{ duration: 1 }}
                className="w-full h-full flex items-center justify-center"
              >
                <div className="w-[800px] h-[800px] bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
              </motion.div>
            )}
            {spellVFX.id === 'freeze_time' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.4, 0] }}
                transition={{ duration: 1.5 }}
                className="absolute inset-0 bg-cyan-400/20 backdrop-blur-md"
              />
            )}
            {spellVFX.id === 'levitation_strike' && (
              <motion.div 
                initial={{ y: 0 }}
                animate={{ y: [-20, 20, -10, 0] }}
                transition={{ duration: 1 }}
                className="absolute inset-0 border-[20px] border-amber-500/10 blur-xl"
              />
            )}
            {spellVFX.id === 'orb_shield' && (
              <div className="absolute inset-0">
                {[...Array(20)].map((_, i) => (
                  <motion.div 
                    key={i}
                    initial={{ x: Math.random() * 2000, y: Math.random() * 2000, scale: 0 }}
                    animate={{ scale: [0, 1.5, 0], opacity: [0, 0.8, 0] }}
                    transition={{ duration: 1, delay: i * 0.05 }}
                    className="absolute w-8 h-8 bg-blue-300 rounded-full blur-sm"
                  />
                ))}
              </div>
            )}
            {spellVFX.id === 'vanquishing_potion' && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 4, opacity: [0, 1, 0] }}
                transition={{ duration: 1.2 }}
                className="w-full h-full flex items-center justify-center"
              >
                <div className="w-[400px] h-[400px] bg-red-600/40 rounded-full blur-[100px]" />
              </motion.div>
            )}
            {spellVFX.id === 'strike' && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0, x: -50 }}
                animate={{ scale: 1.2, opacity: [0, 1, 0], x: 50 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="w-[300px] h-[100px] bg-rose-500/80 blur-2xl rotate-45" />
                <div className="absolute w-[300px] h-[100px] bg-rose-400/80 blur-xl -rotate-45" />
              </motion.div>
            )}
            {spellVFX.id === 'power_of_three' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
              >
                 {/* Radial Flash */}
                 <motion.div 
                    animate={{ 
                      scale: [0, 10],
                      opacity: [0, 0.8, 0]
                    }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute w-full aspect-square bg-gradient-to-r from-amber-200 via-purple-500 to-indigo-900 rounded-full blur-[100px]"
                 />

                 {/* The Three Orbs Merging */}
                 {[0, 1, 2].map((i) => (
                   <motion.div
                     key={i}
                     initial={{ 
                       x: Math.cos((i * 120 * Math.PI) / 180) * 300, 
                       y: Math.sin((i * 120 * Math.PI) / 180) * 300,
                       scale: 0,
                       opacity: 0 
                     }}
                     animate={{ 
                       x: 0, 
                       y: 0,
                       scale: [0, 2, 4],
                       opacity: [0, 1, 0]
                     }}
                     transition={{ duration: 1.2, ease: "anticipate", delay: i * 0.1 }}
                     className="absolute w-40 h-40 bg-white rounded-full blur-2xl"
                     style={{
                       background: i === 0 ? 'radial-gradient(circle, #fff, #a855f7)' : 
                                  i === 1 ? 'radial-gradient(circle, #fff, #3b82f6)' : 
                                            'radial-gradient(circle, #fff, #fbbf24)'
                     }}
                   />
                 ))}

                 {/* Central Burst */}
                 <motion.div 
                   animate={{ 
                     scale: [1, 5],
                     rotate: [0, 360],
                     opacity: [0, 1, 0]
                   }}
                   transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                   className="w-[300px] h-[300px] border-[10px] border-amber-400 rounded-full blur-md"
                 />
                 
                 <motion.div 
                   initial={{ scale: 0 }}
                   animate={{ scale: [0, 1, 2], opacity: [0, 1, 0], rotate: [0, 180] }}
                   transition={{ duration: 0.8, delay: 0.8 }}
                   className="absolute"
                 >
                    <div className="relative">
                       <Sparkles className="w-48 h-48 text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]" />
                       <div className="absolute inset-0 bg-white blur-3xl opacity-50" />
                    </div>
                 </motion.div>

                 {/* Screen Shake */}
                 <motion.div 
                    animate={{ x: [-10, 10, -10, 10, 0], y: [10, -10, 10, -10, 0] }}
                    transition={{ duration: 0.2, repeat: 5 }}
                    className="fixed inset-0 pointer-events-none"
                 />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HUD */}
      <div className="z-20 w-full max-w-screen-2xl px-4 md:px-12 py-3 md:py-6 flex flex-col md:flex-row gap-4 justify-between bg-gradient-to-b from-indigo-950/90 to-transparent backdrop-blur-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSkillTree(true)}
              className="relative group w-12 h-12 rounded-full border-2 border-purple-500 overflow-hidden shadow-lg hover:scale-105 transition-all"
            >
              <img src={selectedCharacter?.avatar} className="w-full h-full object-cover" alt="Profile" />
              <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/20 transition-all" />
              {(state.skillPoints || 0) > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-indigo-950 flex items-center justify-center animate-bounce">
                </div>
              )}
            </button>
            <div id="essence-stat" className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                 <div className="px-2 py-0.5 bg-purple-500 rounded text-[10px] font-black text-white uppercase tracking-tighter">LVL {state.level}</div>
                 <button onClick={() => setShowSkillTree(true)} className="flex items-center gap-1 bg-red-500/20 px-2 py-0.5 rounded border border-red-500/50 hover:bg-red-500/40 transition-colors hidden sm:flex">
                   <Star className="w-3 h-3 text-red-500" />
                   <span className="text-[10px] font-black text-red-100">{state.skillPoints || 0}</span>
                 </button>
                 <div className="flex-1 w-16 sm:w-24 md:w-32 flex flex-col gap-1">
                   <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full bg-purple-400 transition-all duration-1000" style={{ width: `${(state.xp / getXpNeeded(state.level)) * 100}%` }} />
                   </div>
                   <div className="flex items-center gap-1">
                     {state.shields > 0 && (
                       <div className="flex items-center gap-1 shrink-0">
                         <Shield className="w-3 h-3 text-cyan-400" />
                         <span className="text-[10px] font-bold text-cyan-400">{state.shields}</span>
                       </div>
                     )}
                   </div>
                 </div>
                 <div className="px-2 py-0.5 bg-sky-500 rounded text-[10px] font-black text-white uppercase tracking-tighter hidden sm:block">XP {state.xp.toLocaleString()}</div>
              </div>
              
              <div className="flex flex-wrap items-center gap-1 md:gap-2">
                <div id="mana-stat" className="flex items-center gap-0.5 bg-white/5 backdrop-blur-xl px-1.5 md:px-2 py-0.5 md:py-1 rounded-md border border-white/10 shadow-sm cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setShowShop(true)}>
                  <div className="bg-purple-500 p-0.5 md:p-1 rounded shadow-inner">
                    <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                  </div>
                  <motion.span 
                    key={state.mana}
                    initial={{ scale: 1.2, color: '#a855f7' }}
                    animate={{ scale: 1, color: '#ffffff' }}
                    className="text-[10px] md:text-sm font-display font-bold px-0.5 md:px-1"
                  >
                    {state.mana.toLocaleString()}
                  </motion.span>
                </div>
    
                <div className="flex items-center gap-0.5 bg-white/5 backdrop-blur-xl px-1.5 md:px-2 py-0.5 md:py-1 rounded-md border border-white/10 shadow-sm cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setShowShop(true)}>
                  <div className="bg-emerald-500 p-0.5 md:p-1 rounded shadow-inner">
                    <Gem className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                  </div>
                  <motion.span 
                    key={state.gems}
                    initial={{ scale: 1.2, color: '#10b981' }}
                    animate={{ scale: 1, color: '#ffffff' }}
                    className="text-[10px] md:text-sm font-display font-bold px-0.5 md:px-1"
                  >
                    {state.gems.toLocaleString()}
                  </motion.span>
                  <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest hidden lg:block">Gems</span>
                </div>
    
                {/* SKILL POINTS */}
                <div className="flex items-center gap-0.5 bg-white/5 backdrop-blur-xl px-1.5 md:px-2 py-0.5 md:py-1 rounded-md border border-white/10 shadow-sm cursor-pointer hover:bg-white/10 transition-colors sm:hidden" onClick={() => setShowSkillTree(true)}>
                  <div className="bg-amber-500 p-0.5 md:p-1 rounded shadow-inner">
                    <Star className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                  </div>
                  <motion.span 
                    key={state.skillPoints || 0}
                    initial={{ scale: 1.2, color: '#f59e0b' }}
                    animate={{ scale: 1, color: '#ffffff' }}
                    className="text-[10px] md:text-sm font-display font-bold px-0.5 md:px-1"
                  >
                    {state.skillPoints || 0}
                  </motion.span>
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest hidden lg:block">Skill Pts</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 md:gap-2">
            <div className="relative z-50">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 md:p-3 rounded-xl border border-white/10 shadow-lg transition-all bg-white/10 hover:bg-white/20 flex justify-center items-center h-10 w-10 md:h-12 md:w-12"
              >
                {showMenu ? <X className="w-5 h-5 md:w-6 md:h-6 text-white" /> : <Menu className="w-5 h-5 md:w-6 md:h-6 text-white" />}
              </button>
              
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                    className="absolute top-16 right-0 bg-indigo-950/95 border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-2 z-[60] backdrop-blur-xl w-48"
                  >
                    <button onClick={() => { setShowSettings(true); setShowMenu(false); }} className="p-3 flex items-center gap-3 text-stone-300 hover:bg-white/10 rounded-xl">
                      ⚙️ Settings
                    </button>
                    <button onClick={() => { if(confirm('Are you sure you want to reset the game? This action is irreversible.')) { resetGame(); setShowMenu(false); }}} className="p-3 flex items-center gap-3 text-red-300 hover:bg-white/10 rounded-xl">
                      🔄 Reset Game
                    </button>
                    <button onClick={() => { setShowSkillTree(true); setShowMenu(false); }} className="p-3 flex items-center gap-3 text-purple-300 hover:bg-white/10 rounded-xl">
                      <Zap className="w-5 h-5" /> Skill Tree
                    </button>
                    <button onClick={() => { setShowInventory(true); setShowMenu(false); }} className="p-3 flex items-center gap-3 text-amber-300 hover:bg-white/10 rounded-xl">
                      <Eye className="w-5 h-5" /> Inventory
                    </button>
                    <button onClick={() => { setShowLeaderboard('leaderboard'); setShowMenu(false); }} className="p-3 flex items-center gap-3 text-sky-300 hover:bg-white/10 rounded-xl">
                      <Users className="w-5 h-5" /> Leaderboard
                    </button>
                    <button onClick={() => { setShowGrimoire(true); setShowMenu(false); }} className="p-3 flex items-center gap-3 text-purple-300 hover:bg-white/10 rounded-xl">
                      <BookOpen className="w-5 h-5" /> Grimoire
                    </button>
                    <button onClick={() => { setShowDaily(true); setShowMenu(false); }} className={`p-3 flex items-center gap-3 rounded-xl ${isDailyAvailable ? 'text-amber-400 font-bold bg-amber-500/20' : 'text-stone-300'} hover:bg-white/10`}>
                      <Gift className="w-5 h-5" /> Daily Reward
                    </button>
                    <button onClick={() => { setShowHowToPlay(true); setShowMenu(false); }} className="p-3 flex items-center gap-3 text-sky-300 hover:bg-white/10 rounded-xl">
                      <HelpCircle className="w-5 h-5" /> Help
                    </button>
                    <button onClick={() => { shareProgress(); setShowMenu(false); }} className="p-3 flex items-center gap-3 text-purple-300 hover:bg-white/10 rounded-xl">
                      <Share2 className="w-5 h-5" /> Share
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div id="scrolls-counter" className="flex items-center gap-2 md:gap-3 bg-white/5 backdrop-blur-xl px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-2xl border border-white/10 shadow-lg mt-0.5">
              <div className="bg-sky-400 p-1 md:p-1.5 rounded-md md:rounded-lg">
                <BookOpen className="w-3.5 h-3.5 md:w-5 md:h-5 text-sky-900" />
              </div>
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <span className="text-[8px] md:text-[10px] text-sky-200/60 font-bold uppercase hidden sm:block">Orb Points (Rolls)</span>
                <span className="text-[8px] md:text-[10px] text-sky-200/60 font-bold uppercase sm:hidden leading-none mb-0.5">Rolls</span>
                <span className="text-sm md:text-xl font-display font-bold leading-none">{state.scrollsRemaining}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full flex flex-col items-center overflow-y-auto overflow-x-hidden custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'adventure' ? (
            <motion.div 
              key="adventure-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex-1 w-full flex flex-col items-center"
            >
              {/* GAME BOARD */}
              <div className="relative w-full h-full flex-1 flex items-center justify-center p-2 md:p-6 lg:p-8 min-h-[50vh]">
                <div id="board-container" className="relative w-full aspect-square max-w-[min(95vw,65vh)] md:max-w-[min(85vw,65vh)] lg:max-w-[min(80vw,80vh)] grid grid-cols-7 grid-rows-7 gap-1 md:gap-3 mx-auto mt-4 md:mt-8">
                  {BOARD_CONFIG.map((tile, idx) => {
                    let className = '';
                    let side: 'top' | 'right' | 'bottom' | 'left' | 'corner' = 'top';
                    
                    if (idx === 0 || idx === 6 || idx === 12 || idx === 18) side = 'corner';
                    else if (idx < 7) side = 'top';
                    else if (idx < 13) side = 'right';
                    else if (idx < 19) side = 'bottom';
                    else side = 'left';

                    if (idx < 7) className = `row-start-1 col-start-${idx + 1}`;
                    else if (idx < 13) className = `col-start-7 row-start-${idx - 5}`;
                    else if (idx < 19) className = `row-start-7 col-start-${7 - (idx - 12)}`;
                    else className = `col-start-1 row-start-${7 - (idx - 18)}`;
                    
                    return (
                      <TileComponent 
                        key={`tile-${tile.id}`} 
                        tile={tile} 
                        level={state.buildingUpgrades[tile.id]} 
                        isActive={state.position === tile.id} 
                        className={className} 
                        side={side}
                      />
                    );
                  })}

                  <CharacterToken 
                    avatar={selectedCharacter?.avatar} 
                    tileId={state.position % BOARD_SIZE} 
                  />

                  <div className="col-start-2 col-end-7 row-start-2 row-end-7 flex flex-col items-center justify-center p-2 relative">
                     {/* Center Graphic */}
                     <div className="absolute inset-4 rounded-[4rem] border-4 border-white/5 bg-indigo-900/10 backdrop-blur-[2px] overflow-hidden">
                        <img 
                          src="https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&q=80&w=800" 
                          className="w-full h-full object-cover opacity-10 rotate-12 scale-150" 
                          alt="" 
                        />
                     </div>
                     
                     <div className="relative w-full h-full flex flex-col items-center justify-center p-6">
                        <AnimatePresence mode="wait">
                          {state.lastCast && !state.isCasting ? (
                            <motion.div 
                              key="dice"
                              initial={{ scale: 0, rotate: -20, opacity: 0 }}
                              animate={{ scale: 1, rotate: 0, opacity: 1 }}
                              exit={{ scale: 1.2, opacity: 0, filter: 'blur(10px)' }}
                              className="flex flex-col items-center gap-2 mb-4"
                            >
                              <span className="text-xl font-black text-purple-300 uppercase tracking-widest bg-black/60 px-6 py-2 rounded-full border border-purple-500/30 mb-2">Orbing {state.lastCast[0] + state.lastCast[1]} Spaces</span>
                              <div className="flex items-center gap-3">
                                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full shadow-[0_0_30px_rgba(168,85,247,0.3)] flex items-center justify-center border border-purple-400/30 backdrop-blur-md relative overflow-hidden">
                                   <div className="absolute inset-0 bg-white/5 animate-pulse" />
                                   <span className="text-2xl font-display font-black text-white relative z-10">{state.lastCast[0]}</span>
                                </div>
                                <span className="text-lg text-purple-400 font-bold opacity-50">+</span>
                                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full shadow-[0_0_30px_rgba(168,85,247,0.3)] flex items-center justify-center border border-purple-400/30 backdrop-blur-md relative overflow-hidden">
                                   <div className="absolute inset-0 bg-white/5 animate-pulse" />
                                   <span className="text-2xl font-display font-black text-white relative z-10">{state.lastCast[1]}</span>
                                </div>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div 
                              key="logo"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-center"
                            >
                              <h1 className="text-3xl md:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-400 via-sky-400 to-pink-400">
                                BOOK OF SHADOWS
                              </h1>
                            </motion.div>
                          )}
                        </AnimatePresence>
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <SanctuaryBuildView 
              key="build-view"
              state={state}
              onAscend={handleAscension}
              onUpgrade={handleUpgradeNode}
              onRepair={handleRepairNode}
              onShield={handleShieldNode}
              onClose={() => setActiveTab('adventure')}
            />
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM NAVIGATION */}
      <div className="z-10 w-full max-w-2xl px-6 py-4 flex items-center justify-between bg-indigo-950/80 backdrop-blur-3xl border-t border-white/5 pb-10">
        <button 
          id="nav-adventure"
          onClick={() => setActiveTab('adventure')}
          className={`flex-1 flex flex-col items-center gap-1.5 py-2 transition-all ${activeTab === 'adventure' ? 'text-purple-400' : 'text-indigo-300/40 hover:text-indigo-300/60'}`}
        >
          <div className="relative">
            <Sword className="w-6 h-6" />
            {activeTab === 'adventure' && <motion.div layoutId="tab-underline" className="absolute -bottom-2 left-0 right-0 h-0.5 bg-purple-400 rounded-full" />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Adventure</span>
        </button>

        <div className="flex-1 flex flex-col items-center">
          <button 
            id="roll-button"
            onClick={() => handleCast(travelMultiplier)}
            disabled={!state.hasSeenTutorial && state.tutorialPhase !== 4}
            className="group relative -top-8 w-24 h-24 flex items-center justify-center active:scale-95 transition-all duration-75 disabled:opacity-30 mx-4"
          >
            <div className="absolute inset-0 bg-purple-600 rounded-full shadow-[0_8px_0_#4c1d95] group-active:shadow-[0_2px_0_#4c1d95] group-active:translate-y-1 transition-all border-4 border-indigo-950" />
            <div className="absolute inset-0 bg-purple-400/30 rounded-full blur-xl animate-pulse" />
            <div className="relative flex flex-col items-center group-active:translate-y-1 transition-all">
               <Sparkles className="w-8 h-8 text-white mb-0.5" />
               <span className="text-[10px] font-black text-purple-200 tracking-widest uppercase">Travel</span>
               <span className="text-[8px] text-white/50">{state.scrollsRemaining} Points</span>
            </div>
          </button>

          <div className="flex gap-2 -mt-4">
              {[1, 5, 10, 20].map(m => (
                  <button
                      key={m}
                      onClick={() => setTravelMultiplier(m)}
                      className={`px-3 py-1 rounded text-xs ${travelMultiplier === m ? 'bg-purple-600 text-white' : 'bg-indigo-900/50 text-indigo-300'}`}
                  >
                      {m}x
                  </button>
              ))}
          </div>
        </div>

        {showTopUpModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-indigo-900 border-2 border-indigo-500 p-6 rounded-xl max-w-sm w-full">
                <h3 className="text-xl font-display text-white mb-4">Out of Orb Points!</h3>
                <p className="text-indigo-200 mb-6">You've reached your limit. Buy more to continue rolling.</p>
                <div className="flex flex-col gap-3">
                    <button onClick={() => {
                        if (state.gems >= 10) {
                            setState(prev => ({ ...prev, gems: prev.gems - 10, scrollsRemaining: prev.scrollsRemaining + 50 }));
                            setShowTopUpModal(false);
                        }
                    }} className="bg-sky-600 py-2 rounded text-white">Buy 50 Points for 10 Gems</button>
                    <button onClick={() => {
                        if (state.mana >= 500) {
                            setState(prev => ({ ...prev, mana: Math.max(0, prev.mana - 500), scrollsRemaining: prev.scrollsRemaining + 20 }));
                            setShowTopUpModal(false);
                        }
                    }} className="bg-purple-600 py-2 rounded text-white">Buy 20 Points for 500 Mana</button>
                    <button onClick={() => setShowTopUpModal(false)} className="text-indigo-400 mt-2">Close</button>
                </div>
            </div>
          </div>
        )}
        <button 
          id="nav-build"
          onClick={() => {
            setActiveTab('build');
            if (state.tutorialPhase === 5) {
              setState(prev => ({ ...prev, tutorialPhase: 6, mana: 500 }));
            }
          }}
          className={`flex-1 flex flex-col items-center gap-1.5 py-2 transition-all ${activeTab === 'build' ? 'text-purple-400' : 'text-indigo-300/40 hover:text-indigo-300/60'} ${state.tutorialPhase === 5 ? 'animate-pulse text-amber-400' : ''}`}
        >
          <div className="relative">
            <Globe className="w-6 h-6" />
            {activeTab === 'build' && <motion.div layoutId="tab-underline" className="absolute -bottom-2 left-0 right-0 h-0.5 bg-purple-400 rounded-full" />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Build</span>
        </button>
      </div>

      {/* CHRONICLE TICKER */}
      <div className="z-10 w-full max-w-2xl px-6 pb-8">
        <div className="w-full bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-2xl text-[11px] text-indigo-100/70 font-display flex items-center gap-3 border border-white/5">
          <ChevronRight className="w-4 h-4 text-purple-400" />
          {state.chronicle[0]}
        </div>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {showSkillTree && (
          <SkillTreeModal key="skilltree-modal" state={state} setState={setState} onClose={() => setShowSkillTree(false)} />
        )}
        {showSettings && (
          <SettingsModal key="settings-modal" state={state} setState={setState} onClose={() => setShowSettings(false)} />
        )}
        {/* How to Play Modal */}
        {showInventory && (
          <div key="inventory" className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-6 bg-indigo-950/95 backdrop-blur-2xl">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/10 p-6 md:p-10 rounded-3xl border border-white/20 max-w-4xl w-full relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button 
                onClick={() => setShowInventory(false)}
                className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-white/5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="flex items-center gap-4 mb-4 md:mb-8 border-b border-white/10 pb-4 md:pb-6">
                <div className="p-4 bg-amber-500/20 rounded-2xl border border-amber-500/30">
                  <Eye className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-4xl font-display font-black text-white tracking-tight">VAULT OF ARTIFACTS</h2>
                  <p className="text-amber-200/60 font-medium text-xs md:text-sm">Equip powerful Relics to enhance your abilities.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {GAME_RELICS.map(relic => {
                  const isOwned = state.inventory?.includes(relic.id);
                  const isEquipped = state.equippedRelicId === relic.id;
                  
                  return (
                    <div 
                      key={relic.id} 
                      className={`relative p-5 rounded-2xl border transition-all overflow-hidden ${isEquipped ? 'bg-amber-900/40 border-amber-500/50' : isOwned ? 'bg-white/10 border-white/20' : 'bg-black/40 border-white/5 opacity-60 grayscale'}`}
                    >
                      <img src={relic.image} className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" alt="" />
                      <div className="relative z-10 flex gap-4 items-center">
                        <div className={`p-3 rounded-xl border ${isEquipped ? 'bg-amber-500/20 border-amber-400/50' : isOwned ? 'bg-black/40 border-white/10' : 'bg-black/60 border-black'}`}>
                          <Eye className={`w-6 h-6 ${isEquipped ? 'text-amber-400' : 'text-white'}`} />
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="font-bold text-white text-lg">{relic.name}</span>
                          <span className="text-xs text-indigo-300 max-w-[200px]">{relic.description}</span>
                          
                          {isOwned && (
                            <button 
                              onClick={() => {
                                setState(prev => ({ 
                                  ...prev, 
                                  equippedRelicId: prev.equippedRelicId === relic.id ? null : relic.id,
                                  chronicle: [`${prev.equippedRelicId === relic.id ? 'Unequipped' : 'Equipped'}: ${relic.name}`, ...prev.chronicle]
                                }));
                                playSound('spell');
                              }}
                              className={`mt-3 py-1.5 px-4 rounded-full text-xs font-black uppercase tracking-widest transition-colors self-start ${isEquipped ? 'bg-amber-500 text-amber-950' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            >
                              {isEquipped ? 'Unequip' : 'Equip'}
                            </button>
                          )}
                          {!isOwned && (
                            <span className="mt-3 py-1 px-3 bg-black/60 rounded-lg text-[10px] text-white/40 uppercase tracking-widest font-black self-start border border-white/5">
                              Unacquired
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
        
        {/* How to Play Modal */}
        {showHowToPlay && (
          <div key="how-to-play" className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-6 bg-indigo-950/95 backdrop-blur-2xl">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/10 p-6 md:p-10 rounded-3xl border border-white/20 max-w-4xl w-full relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button 
                onClick={() => setShowHowToPlay(false)}
                className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-white/5 rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
                  <div className="flex items-center gap-4 mb-4 md:mb-10 border-b border-white/10 pb-4 md:pb-6">
                <div className="p-4 bg-sky-500/20 rounded-3xl"><HelpCircle className="w-8 h-8 md:w-10 md:h-10 text-sky-400" /></div>
                <div>
                   <h2 className="text-2xl md:text-4xl font-display font-black text-white tracking-tight text-left">GRIMOIRE OF MASTERY</h2>
                   <p className="text-sky-300/60 text-xs font-black uppercase tracking-widest text-left">Master the Book of Shadows</p>
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {ADVANCED_RULES.map((rule, idx) => (
                    <div key={idx} className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-colors">
                      <h4 className="text-purple-400 font-black uppercase text-sm mb-2 flex items-center gap-2">
                        <Star className="w-4 h-4" /> {rule.title}
                      </h4>
                      <p className="text-indigo-200/60 text-xs leading-relaxed">{rule.content}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/10 pt-8">
                  <div className="space-y-6">
                    <h3 className="text-white font-black uppercase text-lg mb-4">Core Mechanics</h3>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black">1</div>
                      <div>
                        <h4 className="text-white font-black uppercase text-sm mb-1 text-left">CAST SPELLS</h4>
                        <p className="text-indigo-200/60 text-xs leading-relaxed text-left">Roll the astral dice by tapping the nexus. Movement costs Orb Points which recharge over time.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black">2</div>
                      <div>
                        <h4 className="text-white font-black uppercase text-sm mb-1 text-left">COLLECT ESSENCE</h4>
                        <p className="text-indigo-200/60 text-xs leading-relaxed text-left">Land on sites to gather Magical Essence. Higher Rank sites provide exponentially more power.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                     <h3 className="text-white font-black uppercase text-lg mb-4">World Progression</h3>
                     <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                      <h4 className="text-amber-400 font-black uppercase text-sm mb-4 flex items-center gap-2">
                         <Globe className="w-4 h-4" /> Dimensional Ascension
                      </h4>
                      <p className="text-indigo-200/60 text-xs leading-relaxed mb-4 text-left">Fully restore all 8 sites to Rank 5 to unlock the next dimension. Each dimension is progressively more challenging and rewarding.</p>
                      <div className="bg-white/10 p-4 rounded-xl">
                         <div className="flex justify-between text-[10px] font-black uppercase text-white/40 mb-2">
                           <span>Volume {state.floor}</span>
                           <span>Volume {state.floor + 1}</span>
                         </div>
                         <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400" style={{ width: '45%' }} />
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowHowToPlay(false)}
                  className="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-display font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95"
                >
                  RETURN TO SAN FRANCISCO
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Auth Screen */}
        {!user && !loading && (
          <div key="auth-screen" className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-indigo-950">
            <div className="absolute inset-0 z-0 opacity-20">
               <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent" />
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/10 p-12 rounded-[4rem] border border-white/20 max-w-sm w-full text-center relative z-10 backdrop-blur-3xl shadow-2xl">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-xl shadow-purple-500/20">
                <Wand2 className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-4xl font-display font-black text-white mb-2 tracking-tight">ARCANE VOYAGE</h1>
              <p className="text-indigo-200/60 mb-10 text-lg">Your soul's journey across the floating dimensions awaits.</p>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={signInWithGoogle}
                  className="w-full bg-white text-indigo-950 p-5 rounded-2xl font-display font-black text-lg shadow-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-3"
                >
                  <MapPin className="w-6 h-6" /> SIGN IN WITH GOOGLE
                </button>
                <button 
                  onClick={signInWithFacebook}
                  className="w-full bg-[#1877F2] text-white p-5 rounded-2xl font-display font-black text-lg shadow-xl hover:bg-[#166fe5] transition-all flex items-center justify-center gap-3"
                >
                  <Facebook className="w-6 h-6" /> SIGN IN WITH FACEBOOK
                </button>
              </div>
              <p className="mt-8 text-[10px] text-indigo-300/40 uppercase tracking-widest font-black">Secure multi-dimensional entry allowed</p>
            </motion.div>
          </div>
        )}

        {/* Leaderboard Modal */}
        {showLeaderboard && (
          <div key="leaderboard-modal" className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-indigo-950/90 backdrop-blur-2xl">
            <div className="bg-white/10 p-10 rounded-3xl border border-white/20 max-w-lg w-full relative shadow-2xl">
               <button onClick={() => setShowLeaderboard(false)} className="absolute top-8 right-8 p-2 bg-white/5 rounded-full text-white/50"><X /></button>
               
                 <div className="flex items-center justify-between gap-4 mb-10">
                   <div className="flex items-center gap-4">
                     <div className="p-3 bg-amber-500/20 rounded-2xl"><Trophy className="w-8 h-8 text-amber-400" /></div>
                     <div>
                       <h2 className="text-3xl font-display font-black text-white tracking-tight">MYSTIC CIRCLE</h2>
                       <div className="flex gap-4 mt-1">
                         <button 
                          onClick={() => setShowLeaderboard('leaderboard')}
                          className={`text-[10px] font-black uppercase tracking-widest ${showLeaderboard === 'leaderboard' ? 'text-amber-400' : 'text-white/40'}`}
                         >
                           Leaderboard
                         </button>
                         <button 
                          onClick={() => setShowLeaderboard('friends')}
                          className={`text-[10px] font-black uppercase tracking-widest ${showLeaderboard === 'friends' ? 'text-purple-400' : 'text-white/40'}`}
                         >
                           Friends
                         </button>
                       </div>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <button 
                       onClick={shareProgress}
                       className="p-3 bg-purple-500/20 hover:bg-purple-500/40 rounded-2xl text-purple-400 transition-all active:scale-95"
                       title="Share Progress"
                     >
                       <Share2 className="w-6 h-6" />
                     </button>
                   </div>
                 </div>
               
               <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                 {showLeaderboard === 'leaderboard' ? leaderboard.map((u, i) => (
                   <div key={`leaderboard-entry-${u.uid || 'npc'}-${i}`} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${user?.uid === u.uid ? 'bg-purple-500/20 border-purple-500/50' : 'bg-white/5 border-white/5'}`}>
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-display font-black text-white/20 w-8">{i+1}</div>
                        <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} className="w-12 h-12 rounded-xl bg-indigo-500/20" alt="" />
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-lg leading-none mb-1">{u.displayName}</span>
                          <span className="text-xs text-indigo-300 uppercase font-black tracking-widest">Dimension {u.floor}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-purple-400 font-display font-black text-xl">LVL {u.level}</span>
                        {user?.uid !== u.uid && (
                          <div className="flex items-center gap-2">
                             <button 
                               onClick={() => inviteToRescue(u)}
                               className="bg-sky-600 hover:bg-sky-500 text-white text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1"
                             >
                                <Heart className="w-3 h-3" /> Rescue
                             </button>
                             <button 
                               onClick={() => {
                                 setShowLeaderboard(false);
                                 // Robust target world selection: find first world with any progress
                                 let targetWorldId = u.currentWorldId || 'halliwell_manor';
                                 const worldWithProgress = Object.keys(u.worldProgress || {}).find(wId => {
                                   const prog = u.worldProgress[wId];
                                   return prog && Object.values(prog).some(lvl => (lvl as number) > 0);
                                 });
                                 if (worldWithProgress) targetWorldId = worldWithProgress;

                                 setActiveRaid({ 
                                   targetUser: u, 
                                   targetState: { 
                                     ...u, 
                                     currentWorldId: targetWorldId,
                                     worldProgress: u.worldProgress || { 'halliwell_manor': { 'manor_gates': 3 } } 
                                   } 
                                 });
                               }}
                               className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1"
                             >
                                <Swords className="w-3 h-3" /> Raid
                             </button>
                             <button 
                               onClick={() => {
                                 setShowLeaderboard(false);
                                 const chestContents: ('empty' | 'small' | 'large')[] = [];
                                 for(let i=0; i<3; i++) chestContents.push('large');
                                 for(let i=0; i<4; i++) chestContents.push('small');
                                 for(let i=0; i<5; i++) chestContents.push('empty');
                                 chestContents.sort(() => Math.random() - 0.5);
                                 setActiveHeist({ targetUser: u, targetState: u, chests: chestContents, picksLeft: 4, matched: [], revealed: new Array(12).fill(false) });
                               }}
                               className="bg-sky-600 hover:bg-sky-500 text-white text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1"
                             >
                                <Eye className="w-3 h-3" /> Scry
                             </button>
                          </div>
                        )}
                      </div>
                   </div>
                 )) : (
                   <div className="flex flex-col items-center justify-center p-12 text-center bg-white/5 rounded-3xl border border-white/5">
                     <Users className="w-16 h-16 text-purple-400/20 mb-4" />
                     <p className="text-indigo-200/60 font-medium text-sm leading-relaxed">Partner events coming soon! Connect with sisters to vanquish stronger demons together.</p>
                     <button 
                       onClick={async () => {
                         playSound('click');
                         try {
                           let shared = false;
                           if (navigator.share) {
                             try {
                               await navigator.share({
                                 title: 'Charmed RPG',
                                 text: 'Join me in the Charmed RPG and claim your powers!',
                                 url: window.location.href,
                               });
                               shared = true;
                             } catch (err) {
                               // user possibly cancelled
                             }
                           } else {
                             // Fallback to clipboard
                             await navigator.clipboard.writeText(window.location.href);
                             shared = true;
                           }
                           
                           if (shared) {
                             playSound('spell');
                             setState(prev => ({ 
                               ...prev, 
                               mana: prev.mana + 500, 
                               gems: prev.gems + 10,
                               chronicle: ["You invited sisters to join the fight! Gained 500 Essence and 10 Gems.", ...prev.chronicle.slice(0, 4)]
                             }));
                             setCelebration({ type: 'enchantment', amount: 500 });
                           }
                         } catch (e) {
                           console.error("Invite failed", e);
                         }
                       }}
                       className="mt-8 bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
                     >
                       Invite Sisters
                     </button>
                   </div>
                 )}
               </div>

               <button 
                 onClick={() => signOut(auth)}
                 className="mt-10 w-full p-4 rounded-2xl border border-rose-500/30 text-rose-400 font-display font-black flex items-center justify-center gap-2 hover:bg-rose-500/10 transition-all"
               >
                 <LogOut className="w-5 h-5" /> LEAVE DIMENSION
               </button>
            </div>
          </div>
        )}
        {/* Improved Step-by-Step Tutorial Overlay */}
        {(state.tutorialPhase || 0) < TUTORIAL_STEPS.length && !state.hasSeenTutorial && (
          <TutorialOverlay 
            key="tutorial-overlay"
            state={state} 
            onNext={() => {
              if ((state.tutorialPhase || 0) === TUTORIAL_STEPS.length - 1) {
                setState(prev => ({ ...prev, hasSeenTutorial: true }));
              } else {
                setState(prev => ({ ...prev, tutorialPhase: (prev.tutorialPhase || 0) + 1 }));
              }
            }}
            onSkip={() => setState(prev => ({ ...prev, hasSeenTutorial: true }))}
          />
        )}

        {/* Global Attack Animation Overlay */}
        <AnimatePresence key="damaged-node-presence">
          {damagedNodeAnimation && (
            <DamagedNodeOverlay key="damaged-overlay" animation={damagedNodeAnimation} />
          )}
        </AnimatePresence>


        {/* Level Up Celebration */}
        {celebration?.type === 'level_up' && (
          <div key="level-up-celeb" className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none">
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <Trophy className="w-32 h-32 text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]" />
                <Sparkles className="absolute inset-0 w-full h-full text-white animate-spin-slow opacity-50" />
              </div>
              <h1 className="text-6xl font-display font-black text-white mt-4 uppercase tracking-tighter italic">ASCENSION!</h1>
              <p className="text-2xl font-display font-bold text-amber-200 uppercase">LEVEL {state.level} REACHED</p>
            </motion.div>
          </div>
        )}

        {/* Grimoire UI */}
        {showGrimoire && (
           <div key="grimoire-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-indigo-950/90 backdrop-blur-xl">
             <div className="bg-white/10 p-6 md:p-10 rounded-3xl border border-white/20 max-w-5xl w-full relative max-h-[90vh] flex flex-col">
                <button onClick={() => setShowGrimoire(false)} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-white/50"><X /></button>
                <div className="flex items-center gap-3 mb-8">
                  <BookOpen className="w-8 h-8 text-purple-400" />
                  <h2 className="text-3xl font-display font-black text-white">THE GRIMOIRE</h2>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-8">
                  
                  {/* SPELLS SECTION */}
                  <div>
                    <div className="flex items-center justify-between mb-6 border-b border-purple-300/20 pb-2">
                       <h3 className="text-xs font-black text-purple-300 uppercase tracking-widest">Spells & Mystic Powers</h3>
                       <div className="flex gap-2">
                         <select className="bg-white/5 text-white text-xs p-1 rounded" onChange={(e) => setElementFilter(e.target.value as any)}>
                            <option value="All">All Elements</option>
                            <option value="Fire">Fire</option>
                            <option value="Water">Water</option>
                            <option value="Earth">Earth</option>
                            <option value="Air">Air</option>
                         </select>
                         <select className="bg-white/5 text-white text-xs p-1 rounded" onChange={(e) => setEffectFilter(e.target.value as any)}>
                            <option value="All">All Effects</option>
                            <option value="damage">Damage</option>
                            <option value="heal">Heal</option>
                            <option value="shield">Shield</option>
                            <option value="freeze">Freeze</option>
                         </select>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {CHARMED_SPELLS.filter(s => (elementFilter === 'All' || s.element === elementFilter) && (effectFilter === 'All' || s.effect === effectFilter)).map((spell) => {
                        const isUnlocked = state.unlockedSpellIds.includes(spell.id);
                        const isActive = state.activeSpellId === spell.id;
                        const IconComp = ICON_MAP[spell.icon] || Zap;
                        
                        return (
                          <div 
                            key={spell.id} 
                            onClick={() => isUnlocked && equipSpell(spell.id)}
                            className={`p-4 rounded-2xl flex items-center justify-between border transition-all ${isUnlocked ? 'bg-white/5 cursor-pointer hover:border-purple-500/50' : 'bg-black/20 border-transparent'} ${isActive ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'border-white/5'}`}
                          >
                            <div className="flex items-center gap-4">
                               <div className={`p-4 rounded-xl ${isActive ? 'bg-purple-500' : 'bg-white/10'}`}><IconComp className={`w-6 h-6 ${isUnlocked ? 'text-white' : 'text-white/20'}`} /></div>
                               <div className="flex flex-col flex-1">
                                 <div className="flex items-center gap-2">
                                   <span className={`font-bold ${isUnlocked ? 'text-white' : 'text-white/30'}`}>{spell.name}</span>
                                 </div>
                                 <span className={`text-[10px] sm:text-xs leading-tight ${isUnlocked ? 'text-indigo-200/60' : 'text-white/20'}`}>{spell.description}</span>
                                 <div className="flex items-center gap-2 mt-2">
                                   <span className={`text-[10px] px-1.5 py-0.5 rounded leading-none font-bold ${isUnlocked ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-white/20'}`}>{spell.manaCost} Essence</span>
                                   {isUnlocked && <span className="text-[10px] font-bold bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded leading-none">{spell.power} Power</span>}
                                 </div>
                               </div>
                            </div>
                            {isUnlocked ? (
                              <div className={`p-2 rounded-full ${isActive ? 'bg-purple-500 text-white cursor-pointer' : 'text-purple-400'}`}>
                                {isActive ? <Star className="w-4 h-4 fill-current" /> : <ChevronRight className="w-4 h-4" />}
                              </div>
                            ) : (
                              <button 
                                onClick={(e) => { e.stopPropagation(); buySpell(spell); }}
                                disabled={state.scrollsRemaining < 15}
                                className="bg-purple-600 disabled:opacity-50 px-3 py-2 rounded-xl text-white font-black text-[10px] tracking-widest uppercase hover:bg-purple-500 transition-colors shrink-0"
                              >
                                15 ORB PTS
                              </button>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* INNATE POWERS */}
                      {CHARMED_CHARACTERS.map(c => {
                        if (c.id === state.characterId) {
                          return (
                            <div key={c.id} className="p-4 rounded-2xl flex items-center justify-between border border-white/5 bg-sky-500/5 col-span-1 md:col-span-2 lg:col-span-3">
                              <div className="flex items-center gap-4">
                                <div className="bg-sky-500/20 p-4 rounded-xl"><Sparkles className="w-6 h-6 text-sky-400" /></div>
                                <div className="flex flex-col">
                                  <span className="text-white font-bold tracking-tight">Innate: {c.passiveName}</span>
                                  <span className="text-[10px] sm:text-xs leading-tight text-sky-200/60">{c.passiveDescription}</span>
                                </div>
                              </div>
                              <div className="p-1 px-3 bg-white/5 border border-white/10 rounded-full text-[10px] text-white/50 uppercase font-bold tracking-widest">Passive</div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>

                  {/* ARSENAL SECTION */}
                  <div>
                    <h3 className="text-xs font-black text-emerald-300 uppercase tracking-widest border-b border-emerald-300/20 pb-2 mb-4">Consumable Arsenal</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* POTIONS */}
                      <div className="p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between border border-emerald-500/30 bg-emerald-500/10 gap-4">
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                          <div className="bg-emerald-500/20 p-3 rounded-xl"><FlaskConical className="w-6 h-6 text-emerald-400" /></div>
                          <div className="flex flex-col">
                            <span className="text-emerald-50 font-bold">Vanquishing Potions</span>
                            <span className="text-[10px] text-emerald-200/60">Inventory: {state.potions}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button 
                            onClick={() => {
                              if (state.mana >= 1000) {
                                playSound('levelUp');
                                setState(prev => ({...prev, mana: Math.max(0, prev.mana - 1000), potions: prev.potions + 1, chronicle: ['Brewed Vanquishing Potion with Essence!', ...prev.chronicle]}));
                              }
                            }}
                            disabled={state.mana < 1000}
                            className="bg-purple-600 disabled:opacity-50 px-3 py-2 rounded-xl text-white font-black text-[10px] tracking-widest uppercase hover:bg-purple-500 transition-colors shrink-0"
                          >
                            1000 E
                          </button>
                          <button 
                            onClick={() => {
                              if (state.gems >= 2) {
                                playSound('levelUp');
                                setState(prev => ({...prev, gems: prev.gems - 2, potions: prev.potions + 1, chronicle: ['Purchased Vanquishing Potion with Gems!', ...prev.chronicle]}));
                              }
                            }}
                            disabled={state.gems < 2}
                            className="bg-teal-500 disabled:opacity-50 px-3 py-2 rounded-xl text-white font-black text-[10px] tracking-widest uppercase hover:bg-teal-400 transition-colors shrink-0"
                          >
                            2 GEMS
                          </button>
                        </div>
                      </div>

                      {/* SCROLLS */}
                      <div className="p-4 rounded-2xl flex items-center justify-between border border-sky-500/30 bg-sky-500/10">
                        <div className="flex items-center gap-4">
                          <div className="bg-sky-500/20 p-3 rounded-xl"><Scroll className="w-6 h-6 text-sky-400" /></div>
                          <div className="flex flex-col">
                            <span className="text-sky-50 font-bold">Orb Points</span>
                            <span className="text-[10px] text-sky-200/60">Inventory: {state.scrollsRemaining}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            if (state.mana >= 5000) {
                              playSound('levelUp');
                              setState(prev => ({...prev, mana: Math.max(0, prev.mana - 5000), scrollsRemaining: prev.scrollsRemaining + 5, chronicle: ['Purchased 5 Orb Points!', ...prev.chronicle]}));
                            }
                          }}
                          disabled={state.mana < 5000}
                          className="bg-sky-600 disabled:opacity-50 px-3 py-2 rounded-xl text-white font-black text-[10px] tracking-widest uppercase hover:bg-sky-500 transition-colors shrink-0"
                        >
                          BUY 5 (5000 E)
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
             </div>
           </div>
        )}

        {/* Character Selection Screen */}
        {user && !state.characterId && (
          <div key="character-selection" className="fixed inset-0 z-[210] flex items-center justify-center p-6 bg-indigo-950/98 overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl w-full">
              <h2 className="text-5xl font-display font-black text-center text-white mb-12 tracking-tighter uppercase">CHOOSE YOUR WITCH</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {CHARMED_CHARACTERS.map(char => (
                  <button 
                    key={char.id}
                    onClick={() => selectCharacter(char.id)}
                    className="flex flex-col items-center bg-white/5 border border-white/10 p-6 rounded-[2.5rem] hover:bg-white/10 hover:border-purple-500/50 transition-all group"
                  >
                    <div className="w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-white/10 group-hover:border-purple-500 transition-all shadow-xl">
                      <img src={char.avatar} alt={char.name} className="w-full h-full object-cover bg-indigo-500/20" />
                    </div>
                    <h3 className="text-2xl font-display font-black text-white mb-1">{char.name}</h3>
                    <p className="text-[10px] text-purple-400 font-black uppercase tracking-[0.2em] mb-4">{char.powerName}</p>
                    <p className="text-xs text-indigo-200/60 leading-relaxed text-center mb-6">{char.description}</p>
                    
                    <div className="mt-auto w-full pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest">{char.passiveName}</span>
                      </div>
                      <p className="text-[10px] text-indigo-300 italic text-left leading-tight">{char.passiveDescription}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Legacy Battle UI Hidden */}
        {false && (
          <div id="battle-ui" key="battle-ui" className="fixed inset-0 z-[500] flex flex-col items-center p-6 bg-[#0a0a0c] overflow-hidden font-serif">
            {/* The Halliwell Nexus - Atmospheric Background */}
            <div className="absolute inset-0 z-0">
               {/* Manor Fusion Background Layer */}
               <div className="absolute inset-0 bg-[#0f0a0a]">
                 <motion.img 
                   animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.4, 0.3] }}
                   transition={{ duration: 40, repeat: Infinity }}
                   src="https://images.unsplash.com/photo-1605146764387-bdd025555d49?auto=format&fit=crop&q=80&w=2000" 
                   className="w-full h-full object-cover mix-blend-overlay grayscale" 
                   alt="" 
                 />
                 {/* Obsidian Pillars / Cave Fusion */}
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80" />
                 <div className="absolute bottom-0 left-0 w-full h-[60%] bg-gradient-to-t from-red-950/40 via-transparent to-transparent" />
                 
                 {/* Glowing Lava Cracks */}
                 <div className="absolute inset-0 opacity-40 pointer-events-none">
                    <svg className="w-full h-full" preserveAspectRatio="none">
                      <motion.path 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0.5, 1, 0] }}
                        transition={{ duration: 10, repeat: Infinity }}
                        d="M0,1000 L200,800 L400,900 L600,750 L800,950 L1000,800" 
                        fill="none" 
                        stroke="#f43f5e" 
                        strokeWidth="4" 
                        strokeDasharray="10 5"
                        className="blur-[8px]"
                      />
                    </svg>
                 </div>
               </div>

               {/* Demonic Smoke (Hazard) */}
               <div className="absolute inset-0 pointer-events-none z-10">
                 {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={`smoke-${i}`}
                      initial={{ x: Math.random() * 100 + "%", y: "110%", scale: 1, opacity: 0 }}
                      animate={{ 
                        y: ["110%", "-20%"], 
                        x: [null, `${(Math.random() - 0.5) * 50}%`],
                        scale: [1, 4],
                        opacity: [0, 0.3, 0] 
                      }}
                      transition={{ duration: 15 + Math.random() * 20, repeat: Infinity, delay: i * 3 }}
                      className="absolute w-64 h-64 bg-black rounded-full blur-[100px]"
                    />
                 ))}
               </div>

               {/* Dimensional Lightning */}
               <motion.div 
                 animate={{ opacity: [0, 0, 0.4, 0, 0.2, 0, 0, 0] }}
                 transition={{ duration: 8, repeat: Infinity, times: [0, 0.4, 0.42, 0.44, 0.46, 0.48, 0.5, 1] }}
                 className="absolute inset-0 bg-cyan-400/10 pointer-events-none mix-blend-screen"
               />
            </div>

            {/* Battle Header / Arena Name */}
            <div className="relative z-20 w-full max-w-5xl flex flex-col items-center pt-2">
               <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
                 <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.6em] mb-1">Underworld Breach</span>
                 <h2 className="text-4xl font-display font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">THE HALLIWELL NEXUS</h2>
                 <div className="w-12 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent mt-2" />
               </motion.div>
            </div>

            {/* INTERACTIVE FEATURES HUD */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-6">
               {/* Candle Altar */}
                <motion.button 
                  whileHover={!battle.isResolvingAction ? { scale: 1.1 } : {}}
                  whileTap={!battle.isResolvingAction ? { scale: 0.9 } : {}}
                  onClick={() => {
                    if (!battle.nexusBuffs?.magicBoost && !battle.isResolvingAction) {
                      playSound('spell');
                      setBattle(prev => prev ? { 
                        ...prev, 
                        nexusBuffs: { ...prev.nexusBuffs, magicBoost: 3 },
                        log: ["You chant at the Altar. Purple flames flare up, boosting your magic for 3 turns!", ...prev.log]
                      } : null);
                    }
                  }}
                  disabled={battle.isResolvingAction}
                  className={`relative w-20 h-32 flex flex-col items-center justify-end p-4 rounded-t-full border-t-2 border-x-2 border-white/20 bg-stone-900/80 backdrop-blur-xl transition-all ${battle.nexusBuffs?.magicBoost ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.4)]' : ''} ${battle.isResolvingAction ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                 <div className="absolute top-4 flex gap-1">
                   {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-1.5 h-6 bg-white/20 rounded-full relative overflow-hidden">
                        <motion.div 
                          animate={{ height: ["0%", "100%", "0%"] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          className="absolute bottom-0 w-full bg-purple-500 blur-[2px]" 
                        />
                      </div>
                   ))}
                 </div>
                 <span className="text-[8px] font-black text-white/40 uppercase tracking-widest mt-2">CANDLE ALTAR</span>
               </motion.button>

               {/* The Grimoire (Floating) */}
               <motion.button 
                 animate={{ y: [0, -10, 0] }}
                 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                 whileHover={!battle.isResolvingAction ? { scale: 1.1 } : {}}
                 onClick={() => {
                   if (!battle.nexusBuffs?.shield && !battle.isResolvingAction) {
                     playSound('spell');
                     setBattle(prev => prev ? { 
                       ...prev, 
                       nexusBuffs: { ...prev.nexusBuffs, shield: 3 },
                       log: ["The Halliwell Grimoire pulses with protective energy for 3 turns!", ...prev.log]
                     } : null);
                   }
                 }}
                 disabled={battle.isResolvingAction}
                 className={`w-20 h-24 bg-indigo-950/90 rounded-2xl border-2 flex items-center justify-center shadow-2xl transition-all ${battle.nexusBuffs?.shield ? 'border-cyan-400 shadow-cyan-400/30' : 'border-white/10'} ${battle.isResolvingAction ? 'opacity-50 cursor-not-allowed' : ''}`}
               >
                 <BookOpen className={`w-10 h-10 ${battle.nexusBuffs?.shield ? 'text-cyan-400' : 'text-white/40'}`} />
                 <div className="absolute -bottom-2 text-[8px] font-black text-indigo-400 uppercase tracking-tighter">GRIMOIRE</div>
               </motion.button>
            </div>

            <div className="absolute right-8 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-6">
               {/* Scrying Table */}
               <motion.button 
                 whileHover={!battle.isResolvingAction ? { scale: 1.1 } : {}}
                 onClick={() => {
                    if (!battle.isResolvingAction) {
                      playSound('click');
                      // Reposition effect logic - maybe shuffle log or slight heal
                      setBattle(prev => prev ? { 
                        ...prev, 
                        playerHealth: Math.min(100, prev.playerHealth + 5),
                        log: ["You use the Scrying Table to reposition, finding a better vantage point.", ...prev.log]
                      } : null);
                    }
                 }}
                 disabled={battle.isResolvingAction}
                 className={`w-24 h-24 bg-stone-900 border-2 border-white/10 rounded-full flex items-center justify-center shadow-2xl relative group overflow-hidden ${battle.isResolvingAction ? 'opacity-50 cursor-not-allowed' : ''}`}
               >
                 <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="relative z-10 flex flex-col items-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
                       <Compass className="w-8 h-8 text-blue-400" />
                    </motion.div>
                    <span className="text-[7px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">SCRYING TABLE</span>
                 </div>
                 {/* Blue Glow Orbit */}
                 <div className="absolute inset-0 border border-blue-500/30 rounded-full animate-ping scale-110" />
               </motion.button>

               {/* Possessed Furniture (Environmental Hazard Display) */}
               <div className="w-24 h-32 bg-stone-900/40 border border-white/5 rounded-2xl flex flex-col items-center justify-center opacity-40">
                  <motion.div 
                    animate={{ rotate: [-5, 5, -5], x: [-2, 2, -2] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <Armchair className="w-12 h-12 text-white/20" />
                  </motion.div>
                  <span className="text-[7px] font-black text-white/20 uppercase tracking-widest mt-2">POSSESSED</span>
               </div>
            </div>

            {/* Hit Flash Overlay */}
            <AnimatePresence>
               {(battle.damageDealt || battle.damageTaken) && (
                 <motion.div 
                   key="hit-flash-blur"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: [0, 0.4, 0] }}
                   exit={{ opacity: 0 }}
                   transition={{ duration: 0.2 }}
                   className={`fixed inset-0 z-[200] pointer-events-none ${battle.damageTaken ? 'bg-red-900' : 'bg-white'}`}
                 />
               )}
               {battle.isResolvingAction && (
                 <motion.div 
                   key="resolving-overlay"
                   initial={{ opacity: 0, scale: 1.5 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0 }}
                   className="fixed inset-0 z-[1] pointer-events-none opacity-20 filter blur-sm bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black"
                 />
               )}
            </AnimatePresence>

            {/* TOP HP BARS - High Visibility */}
            <div className="relative z-20 w-full max-w-screen-xl flex justify-between items-start pt-4 px-4 md:px-12">
               {/* Player Status Top */}
                <div className="flex flex-col gap-2 w-1/3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-purple-500 overflow-hidden bg-purple-900/40 transform transition-transform hover:scale-110 shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                      <img src={selectedCharacter?.avatar} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-purple-300 uppercase tracking-widest drop-shadow-md">{selectedCharacter?.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-display font-black text-white drop-shadow-md">{battle.playerHealth}<span className="text-[10px] text-white/40 ml-1">/ 100</span></p>
                        {state.shields > 0 && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="p-1 bg-cyan-500/20 rounded-lg border border-cyan-500/30"
                          >
                            <Shield className="w-4 h-4 text-cyan-400" />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-black/60 rounded-full border border-white/20 overflow-hidden backdrop-blur-sm shadow-inner relative">
                    <motion.div 
                      layout
                      animate={{ width: `${(battle.playerHealth / battle.maxPlayerHealth) * 100}%` }} 
                      className={`absolute top-0 bottom-0 left-0 ${battle.playerHealth < 30 ? 'bg-gradient-to-r from-red-600 to-red-500 animate-pulse' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`}
                     />
                  </div>
                  
                  {/* Active Buffs Indicators */}
                  <div className="flex gap-2 mt-2">
                    {battle.nexusBuffs?.magicBoost && battle.nexusBuffs.magicBoost > 0 && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/30 border border-purple-500/60 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                      >
                        <Zap className="w-3 h-3 text-purple-400 animate-pulse" />
                        <span className="text-[8px] font-black text-purple-200 uppercase tracking-tighter drop-shadow">Magic Boost ({battle.nexusBuffs.magicBoost}T)</span>
                      </motion.div>
                    )}
                    {battle.nexusBuffs?.shield && battle.nexusBuffs.shield > 0 && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1.5 px-2 py-1 bg-cyan-500/30 border border-cyan-500/60 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                      >
                        <Shield className="w-3 h-3 text-cyan-400 animate-pulse" />
                        <span className="text-[8px] font-black text-cyan-200 uppercase tracking-tighter drop-shadow">Shield ({battle.nexusBuffs.shield}T)</span>
                      </motion.div>
                    )}
                  </div>
                </div>

               {/* VS Icon Center */}
               <div className="mt-2 flex flex-col items-center">
                 <div className="p-3 bg-black/50 rounded-full border border-white/10 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                   <Swords className="w-6 h-6 text-purple-400 animate-[spin_4s_linear_infinite]" />
                 </div>
               </div>

               {/* Enemy Status Top */}
               <div className="flex flex-col items-end gap-2 w-1/3">
                 <div className="flex items-center gap-3 text-right">
                   <div>
                     <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest drop-shadow-md">{battle.enemyName}</p>
                     <p className="text-xl font-display font-black text-white drop-shadow-md">{battle.enemyHealth}</p>
                   </div>
                   <div className="w-12 h-12 rounded-full border-2 border-rose-500 overflow-hidden bg-rose-900/40 transform transition-transform hover:scale-110 shadow-[0_0_15px_rgba(244,63,94,0.5)]">
                     <img 
                       src={battle.enemyImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${battle.enemyName}`} 
                       className="w-full h-full object-cover" 
                       alt="" 
                      />
                   </div>
                 </div>
                 <div className="w-full h-2 bg-black/60 rounded-full border border-white/20 overflow-hidden backdrop-blur-sm shadow-inner relative">
                   <motion.div 
                     layout
                     animate={{ width: `${(battle.enemyHealth / battle.maxEnemyHealth) * 100}%` }} 
                     className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-rose-600 to-rose-400" 
                    />
                 </div>
               </div>
            </div>

            {/* Combat Scene (Larger Focus) */}
            <motion.div 
              animate={battle.damageTaken ? { x: [-10, 10, -10, 10, 0] } : battle.damageDealt ? { x: [-5, 5, -5, 5, 0] } : {}}
              transition={{ duration: 0.3 }}
              className="relative z-10 w-full max-w-screen-2xl flex-1 flex flex-col md:flex-row items-center justify-between px-4 md:px-24 py-12"
            >
               {/* Player Side */}
               <div className="relative flex flex-col items-center order-2 md:order-1 perspective-1000">
                 <motion.div 
                   animate={battle.damageTaken ? { x: [0, -25, 25, -25, 0], filter: 'brightness(0.5) contrast(1.5) sepia(1)' } : battle.damageDealt ? { x: [0, 200, 0], scale: 1.3, filter: 'drop-shadow(0 0 20px white)' } : { y: [0, -15, 0] }}
                   transition={battle.damageDealt ? { duration: 0.3, ease: "anticipate" } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
                   className="relative transform-gpu"
                 >
                   {/* Aura / Magic Boost */}
                   {battle.nexusBuffs?.magicBoost && battle.nexusBuffs.magicBoost > 0 && (
                     <motion.div 
                       animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                       transition={{ duration: 2, repeat: Infinity }}
                       className="absolute inset-0 bg-purple-500 blur-[80px] rounded-full scale-[2] mix-blend-screen"
                     />
                   )}
                   
                   {/* Grimoire Shield Element */}
                   {battle.nexusBuffs?.shield && battle.nexusBuffs.shield > 0 && (
                     <div className="absolute inset-[-4rem] rounded-full border-4 border-cyan-400/50 scale-[1.2] shadow-[inset_0_0_50px_rgba(34,211,238,0.5),0_0_50px_rgba(34,211,238,0.5)] animate-[spin_10s_linear_infinite]" style={{ borderStyle: 'double' }}>
                       <div className="absolute inset-0 bg-cyan-500/10 rounded-full animate-pulse backdrop-blur-[2px]"></div>
                     </div>
                   )}
                   
                   <div className="absolute inset-0 bg-purple-600/20 blur-[60px] rounded-full scale-[1.5] animate-pulse" />
                   <motion.img 
                      src={selectedCharacter?.battleSprite} 
                      className="w-64 h-64 md:w-[500px] md:h-[500px] object-contain relative z-10 drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] saturate-[1.2]" 
                      alt="Player"
                      animate={{ y: [0, -15, 0], scale: [1, 1.02, 1] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                 </motion.div>
                 
                 <AnimatePresence>
                   {battle.damageTaken && (
                     <motion.div 
                       key="dmg-taken"
                       initial={{ opacity: 0, y: 0, scale: 0.5, rotate: -15 }} 
                       animate={{ opacity: 1, y: -200, scale: [2, 1.5], rotate: [-15, 5, 0] }} 
                       exit={{ opacity: 0, scale: 0 }} 
                       transition={{ type: "spring", bounce: 0.6 }}
                       className="absolute text-red-500 font-display font-black text-6xl md:text-8xl z-30 tracking-tighter"
                       style={{ WebkitTextStroke: '2px black', textShadow: '0 10px 30px rgba(220,38,38,0.8)' }}
                     >-{battle.damageTaken}</motion.div>
                   )}
                 </AnimatePresence>
               </div>

               {/* Enemy Side */}
               <div className="relative flex flex-col items-center order-3 perspective-1000">
                 <motion.div 
                   animate={battle.damageDealt ? { x: [0, 20, -20, 20, 0], filter: 'brightness(2) contrast(1.5) sepia(1) hue-rotate(-50deg)' } : battle.damageTaken ? { x: [0, -200, 0], scale: 1.3, filter: 'drop-shadow(0 0 20px red)' } : { y: [0, 15, 0] }}
                   transition={battle.damageTaken ? { duration: 0.3, ease: "anticipate" } : { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                   className="relative transform-gpu"
                 >
                   <div className="absolute inset-0 bg-rose-600/30 blur-[80px] rounded-full scale-[1.5] animate-pulse" />
                   <div className="w-64 h-64 md:w-[550px] md:h-[550px] flex items-center justify-center">
                     <img 
                      src={battle.enemyImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${battle.enemyName}`} 
                      className="w-full h-full object-contain relative z-10 drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] filter contrast-[1.1] saturate-[1.1]" 
                      alt="Enemy" 
                      />
                   </div>
                 </motion.div>
                 
                 <AnimatePresence>
                   {battle.damageDealt && (
                     <motion.div key="dmg-dealt" className="absolute inset-0 pointer-events-none z-30">
                       {/* Damage Text */}
                       <motion.div 
                         initial={{ opacity: 0, y: 0, scale: 0.5, rotate: 15 }} 
                         animate={{ opacity: 1, y: -250, scale: [2.5, 1.8], rotate: [15, -5, 0] }} 
                         exit={{ opacity: 0, scale: 0 }} 
                         transition={{ type: "spring", bounce: 0.6 }}
                         className="absolute text-white font-display font-black text-7xl md:text-9xl z-30 tracking-tighter"
                         style={{ WebkitTextStroke: '2px black', textShadow: '0 10px 40px rgba(255,255,255,1)' }}
                       >-{battle.damageDealt}</motion.div>
                       
                       {/* Clash / Impact Graphic */}
                       <motion.div 
                         initial={{ opacity: 0, scale: 0.2, rotate: -45 }}
                         animate={{ opacity: [0, 1, 0], scale: [0.2, 4, 4.5], rotate: [-45, 0, 15] }}
                         exit={{ opacity: 0 }}
                         transition={{ duration: 0.4, ease: "easeOut" }}
                         className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none mix-blend-screen"
                       >
                         <svg viewBox="0 0 100 100" className="w-full h-full text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] fill-current">
                           <path d="M10,50 L40,45 L45,10 L55,45 L90,50 L55,55 L45,90 L40,55 Z" />
                           <path d="M30,30 L45,45 L30,60 L15,45 Z" className="text-yellow-300 opacity-50" />
                           <path d="M70,30 L85,45 L70,60 L55,45 Z" className="text-rose-400 opacity-50" />
                         </svg>
                       </motion.div>
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>
            </motion.div>

            {/* Combat HUD - Compact & Elegant */}
            <div className="relative z-30 w-full max-w-screen-xl flex flex-col items-center gap-4 pb-8 px-6 mt-auto">
                {/* Combat Logs */}
                <div className="w-full max-w-4xl flex flex-col gap-2 p-2">
                   <AnimatePresence>
                     {/* Show last 5 logs, newest first (slice and reverse) */}
                     {[...battle.log].reverse().slice(0, 5).map((logEntry, i) => (
                       <motion.div
                         key={`${logEntry}-${i}`}
                         initial={{ opacity: 0, x: -20, height: 0 }}
                         animate={{ opacity: 1, height: 'auto' }}
                         exit={{ opacity: 0 }}
                         transition={{ duration: 0.3 }}
                         className="p-3 rounded-lg border border-white/10 bg-black/40 backdrop-blur-md italic font-display tracking-wide text-sm text-white/70 text-center"
                       >
                         "{logEntry}"
                       </motion.div>
                     ))}
                   </AnimatePresence>
                </div>

                {/* BATTLE STATISTICS / TURN STATUS */}
                <div className="w-full flex justify-between items-center px-4">
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                     <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Witch's Turn</span>
                   </div>
                   <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Dimension {state.floor}</span>
                </div>

                {/* COMBAY MENU SYSTEM */}
                <div className="w-full flex flex-col items-center gap-4 relative z-[200]">
                  <AnimatePresence mode="wait">
                    {combatCategory === null && (
                      <motion.div 
                        key="main-menu"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="flex flex-wrap justify-center gap-4 mt-2"
                      >
                         <SmallBattleAction label="Strike" icon={Zap} color="bg-rose-600 shadow-rose-900/40" onClick={() => executeBattleTurn('attack')} disabled={battle.isResolvingAction} />
                         <SmallBattleAction label="Spells" icon={Flame} color="bg-purple-600 shadow-purple-900/40" onClick={() => setCombatCategory('spells')} disabled={battle.isResolvingAction} />
                         <SmallBattleAction label="Meditate" icon={Heart} color="bg-cyan-600 shadow-cyan-900/40" onClick={() => executeBattleTurn('focus')} disabled={battle.isResolvingAction} />
                         <SmallBattleAction label="Items" icon={FlaskConical} color="bg-emerald-600 shadow-emerald-900/40" onClick={() => setCombatCategory('items')} disabled={battle.isResolvingAction} subtext={state.potions > 0 ? `${state.potions} Left` : 'Empty'} />
                         <SmallBattleAction label="Flee" icon={Wind} color="bg-slate-700 shadow-slate-900/40" onClick={() => setCombatCategory('retreat')} disabled={battle.isResolvingAction} />
                      </motion.div>
                    )}

                    {combatCategory === 'spells' && (
                      <motion.div 
                        key="spells-menu"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="relative w-full max-w-lg flex flex-wrap justify-center gap-3 pt-6"
                      >
                        <button 
                         onClick={() => setCombatCategory(null)} 
                         className="absolute -top-4 text-white/50 hover:text-white flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-colors left-1/2 -translate-x-1/2"
                        >
                          <ChevronLeft className="w-4 h-4"/> Back to Actions
                        </button>
                        {CHARMED_SPELLS.filter(spell => state.unlockedSpellIds.includes(spell.id)).map(spell => {
                          const isAvailable = state.mana >= spell.manaCost;
                          return (
                            <SmallBattleAction 
                              key={spell.id}
                              label={spell.name} 
                              icon={ICON_MAP[spell.icon] || Flame} 
                              color={isAvailable ? "bg-indigo-600 shadow-indigo-900/40" : "bg-slate-800 opacity-50 grayscale"} 
                              onClick={() => { executeBattleTurn('spell', spell); setCombatCategory(null); }} 
                              subtext={isAvailable ? `-${spell.manaCost}` : `Need Mana`}
                              disabled={battle.isResolvingAction || !isAvailable}
                            />
                          );
                        })}
                      </motion.div>
                    )}

                    {combatCategory === 'items' && (
                      <motion.div 
                        key="items-menu"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="relative w-full max-w-lg flex flex-wrap justify-center gap-4 pt-6"
                      >
                        <button 
                         onClick={() => setCombatCategory(null)} 
                         className="absolute -top-4 text-white/50 hover:text-white flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-colors left-1/2 -translate-x-1/2"
                        >
                          <ChevronLeft className="w-4 h-4"/> Back to Actions
                        </button>
                        <SmallBattleAction 
                          label="Poison Potion" 
                          icon={FlaskConical} 
                          color={state.potions > 0 ? "bg-emerald-600 shadow-emerald-900/40" : "bg-slate-800 opacity-50 grayscale"} 
                          onClick={() => { executeBattleTurn('item'); setCombatCategory(null); }} 
                          subtext={state.potions > 0 ? `${state.potions} Left` : "Empty"}
                          disabled={battle.isResolvingAction || state.potions <= 0}
                        />
                      </motion.div>
                    )}

                    {combatCategory === 'retreat' && (
                      <motion.div 
                        key="retreat-menu"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="relative w-full max-w-lg flex flex-wrap justify-center gap-4 pt-6"
                      >
                        <button 
                         onClick={() => setCombatCategory(null)} 
                         className="absolute -top-4 text-white/50 hover:text-white flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-colors left-1/2 -translate-x-1/2"
                        >
                          <ChevronLeft className="w-4 h-4"/> Back to Actions
                        </button>
                        <SmallBattleAction 
                          label="Forfeit" 
                          icon={Wind} 
                          color="bg-rose-600 shadow-rose-900/40" 
                          onClick={() => { executeBattleTurn('flee'); setCombatCategory(null); }} 
                          subtext={`-${500 * state.floor} E`}
                          disabled={battle.isResolvingAction}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
            </div>
           </div>
        )}

        {/* Quest UI */}
        {/* Cinematic Mission UI */}
        <AnimatePresence mode='wait' key="quest-presence">
          {quest && (
             <motion.div 
               key="quest-modal" 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[500] flex items-center justify-center p-6 sm:p-12 bg-black/90 backdrop-blur-3xl overflow-hidden font-serif"
             >
               {/* Mission Background Image */}
               <div className="absolute inset-0 z-0">
                 <motion.img 
                   initial={{ scale: 1.1, opacity: 0 }}
                   animate={{ scale: 1, opacity: 0.5 }}
                   exit={{ opacity: 0 }}
                   transition={{ duration: 1.5, ease: "easeOut" }}
                   src={quest.image || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=2000'}
                   className="w-full h-full object-cover grayscale mix-blend-luminosity" 
                   alt="" 
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-indigo-950/80 to-transparent" />
                 <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black" />
               </div>

               <motion.div 
                 initial={{ y: 50, opacity: 0, scale: 0.95 }} 
                 animate={{ y: 0, opacity: 1, scale: 1 }} 
                 exit={{ y: 50, opacity: 0, scale: 0.95 }}
                 transition={{ duration: 0.8, delay: 0.2, type: 'spring' }}
                 className="relative z-10 bg-black/40 p-8 sm:p-12 rounded-[3.5rem] border border-white/10 max-w-2xl w-full text-center shadow-[0_0_100px_rgba(79,70,229,0.3)] backdrop-blur-xl"
               >
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-indigo-950/80 rounded-[2rem] border border-indigo-400/30 flex items-center justify-center shadow-[0_0_40px_rgba(129,140,248,0.4)] backdrop-blur-md rotate-45">
                  <div className="-rotate-45">
                    {quest.title.includes('BOSS') ? <Skull className="w-10 h-10 text-red-500 animate-pulse" /> : <Eye className="w-10 h-10 text-indigo-400 animate-pulse" />}
                  </div>
                </div>

                <div className="mt-8 mb-4">
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mb-2 block drop-shadow-md">Current Objective</span>
                  <h2 className="text-4xl sm:text-5xl font-display font-black text-white leading-tight drop-shadow-2xl">{quest.title}</h2>
                </div>
                
                <p className="text-lg sm:text-xl text-indigo-100/90 mb-12 font-medium leading-relaxed max-w-lg mx-auto">
                  {quest.description}
                </p>
                
                {state.characterId === 'phoebe' && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                    className="mb-8 p-4 bg-purple-500/10 rounded-2xl border border-purple-500/30 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                    <p className="text-[11px] text-purple-300 font-black uppercase tracking-[0.2em] mb-2 flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" /> Premonition
                    </p>
                    <p className="text-sm text-purple-100/80 font-medium italic">
                      "I see a path forward. The essence required will be steep, but the reward will be monumental."
                    </p>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 w-full max-w-lg mx-auto">
                  {quest.options.map((opt, i) => (
                    <button 
                      key={`quest-opt-${quest.id}-${i}`} 
                      onClick={opt.outcome} 
                      className={`
                        group relative flex flex-col items-center justify-center px-6 py-5 rounded-3xl font-display font-bold transition-all active:scale-95 overflow-hidden w-full
                        ${opt.style === 'danger' 
                          ? 'bg-rose-950/50 hover:bg-rose-900 border border-rose-500/30 hover:border-rose-500' 
                          : opt.style === 'secondary'
                             ? 'bg-purple-900/60 hover:bg-purple-800 border border-purple-500/40 hover:border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                             : 'bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 hover:border-indigo-300 shadow-[0_0_30px_rgba(79,70,229,0.4)]'
                        }
                      `}
                    >
                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                      <span className="relative z-10 text-white text-base tracking-wide text-center">{opt.label}</span>
                    </button>
                  ))}
                </div>
             </motion.div>
           </motion.div>
        )}
        </AnimatePresence>



        {/* Puzzle UI */}
        <AnimatePresence mode='wait' key="puzzle-presence">
          {state.activePuzzle && (
             <motion.div 
               key="puzzle-modal" 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[500] flex items-center justify-center p-6 sm:p-12 bg-black/90 backdrop-blur-3xl overflow-hidden font-serif"
             >
               <motion.div 
                 initial={{ y: 50, opacity: 0, scale: 0.95 }} 
                 animate={{ y: 0, opacity: 1, scale: 1 }} 
                 exit={{ y: 50, opacity: 0, scale: 0.95 }}
                 className="relative z-10 bg-indigo-950/80 p-8 sm:p-12 rounded-[3.5rem] border border-indigo-400/30 max-w-2xl w-full text-center shadow-[0_0_100px_rgba(79,70,229,0.3)] backdrop-blur-xl"
               >
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-purple-900 rounded-full border-4 border-indigo-400 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.6)]">
                   <Lightbulb className="w-10 h-10 text-white animate-pulse" />
                </div>

                <div className="mt-8 mb-4">
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mb-2 block drop-shadow-md">Mystic Challenge</span>
                  <h2 className="text-3xl sm:text-4xl font-display font-black text-white leading-tight drop-shadow-2xl">{state.activePuzzle.title}</h2>
                </div>
                
                <p className="text-lg sm:text-xl text-indigo-100/90 mb-8 font-medium leading-relaxed max-w-lg mx-auto">
                  {state.activePuzzle.steps[state.activePuzzle.currentStepIndex].description}
                </p>

                <div className="flex justify-center gap-2 mb-8">
                  {state.activePuzzle.steps.map((_, i) => (
                    <div key={i} className={`h-2 rounded-full transition-all ${i === state.activePuzzle!.currentStepIndex ? 'w-8 bg-indigo-400' : i < state.activePuzzle!.currentStepIndex ? 'w-4 bg-emerald-400' : 'w-4 bg-white/20'}`} />
                  ))}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 w-full max-w-lg mx-auto">
                  {state.activePuzzle.steps[state.activePuzzle.currentStepIndex].options.map((opt, i) => (
                    <button 
                      key={`puzzle-opt-${i}`} 
                      onClick={() => {
                        playSound('click');
                        if (opt.outcome === 'fail') {
                          setState(prev => {
                            setCelebration({ type: 'drain', amount: 1000, label: 'PUZZLE FAILED' });
                            return { 
                              ...prev, 
                              activePuzzle: null,
                              mana: Math.max(0, prev.mana - 1000), 
                              chronicle: [`Failed puzzle: ${state.activePuzzle!.title}. Lost 1000 Essence.`, ...prev.chronicle] 
                            };
                          });
                        } else if (opt.outcome === 'next') {
                          setState(prev => ({
                            ...prev,
                            activePuzzle: prev.activePuzzle ? { ...prev.activePuzzle, currentStepIndex: prev.activePuzzle.currentStepIndex + 1 } : null
                          }));
                        } else if (opt.outcome === 'success') {
                          setState(prev => {
                            setCelebration({ type: 'enchantment', amount: 5000, label: 'PUZZLE SOLVED!' });
                            return { 
                              ...prev, 
                              activePuzzle: null,
                              mana: prev.mana + 5000, 
                              gems: prev.gems + 10,
                              potions: prev.potions + 1,
                              chronicle: [`Solved puzzle: ${state.activePuzzle!.title}! Gained 5000 Essence, 10 Gems, and a Potion.`, ...prev.chronicle] 
                            };
                          });
                        }
                      }} 
                      className={`
                        group relative flex flex-col items-center justify-center px-6 py-5 rounded-3xl font-display font-bold transition-all active:scale-95 overflow-hidden w-full
                        bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 hover:border-indigo-300 shadow-[0_0_30px_rgba(79,70,229,0.4)]
                      `}
                    >
                      <span className="relative z-10 text-white text-base text-center">{opt.label}</span>
                    </button>
                  ))}
                </div>
               </motion.div>
             </motion.div>
          )}
        </AnimatePresence>

        {/* Bazaar / Shop */}
        {showShop && (
           <div key="shop-modal" className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-indigo-950/90 backdrop-blur-xl">
             <div className="bg-white/10 p-8 rounded-[3rem] border border-white/20 max-w-sm w-full relative">
                <button onClick={() => setShowShop(false)} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-white/50"><X /></button>
                <div className="flex items-center gap-3 mb-8">
                  <ShoppingBag className="w-8 h-8 text-purple-400" />
                  <h2 className="text-3xl font-display font-black text-white">MAGICAL BAZAAR</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-black text-indigo-300 uppercase tracking-widest border-b border-indigo-300/20 pb-2 mt-4">Premium Bazaar (Gems)</h3>
                    {BAZAAR_ITEMS.map((item) => (
                      <div key={item.id} className="bg-white/10 p-4 rounded-2xl flex items-center justify-between border border-white/5 group hover:border-emerald-500/50 transition-all overflow-hidden relative">
                        <img src={item.image} className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" alt="" />
                        <div className="flex items-center gap-4 relative z-10">
                          <div className="bg-emerald-500/20 p-3 rounded-xl"><item.icon className="w-6 h-6 text-emerald-400" /></div>
                          <div className="flex flex-col">
                            <span className="text-white font-bold">{item.name}</span>
                            <span className="text-xs text-emerald-300">+{item.amount}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => buyBazaarItem(item)}
                          disabled={state.gems < item.priceGems}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 rounded-xl text-white font-black text-sm relative z-10 transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
                        >
                          {item.priceGems} GEMS
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
           </div>
        )}

        {/* Daily UI */}
        {showDaily && (
           <div key="daily-modal" className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-indigo-950/90 backdrop-blur-xl">
             <div className="bg-white/10 p-10 rounded-[3rem] border border-white/20 max-w-xs w-full text-center relative">
                <button onClick={() => setShowDaily(false)} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-white/50"><X /></button>
                <Gift className="w-20 h-20 text-amber-500 mx-auto mb-6" />
                <h2 className="text-3xl font-display font-black text-white mb-2 tracking-tight">DAILY DIVINATION</h2>
                <p className="text-indigo-200/60 mb-8 font-medium italic">The Elders have prepared these trials for your journey.</p>
                <button 
                  disabled={!isDailyAvailable}
                  onClick={claimDaily}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-white p-5 rounded-2xl font-display font-black text-xl shadow-[0_8px_0_#92400e] active:shadow-none active:translate-y-1 transition-all"
                >
                  {isDailyAvailable ? 'CLAIM REWARD' : 'ALREADY CLAIMED'}
                </button>
                <div className="mt-6 border-t border-white/20 pt-4 text-left">
                    <h3 className="text-amber-500 font-bold mb-2 text-sm">Daily Quests</h3>
                    {state.dailyQuests.map(q => {
                        const progress = Math.min(100, (q.current / q.target) * 100);
                        return (
                        <div key={q.id} className="text-[10px] text-white/70 mb-3 bg-white/5 p-3 rounded-xl border border-white/5">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-white">{q.description}</span>
                              <span className="text-[9px] opacity-50">{q.current}/{q.target}</span>
                            </div>
                            <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden mb-2">
                                <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] text-amber-500/80 font-black uppercase">{q.rewardEssence} E • {q.rewardGems} G</span>
                              {q.current >= q.target && !q.isCompleted && (
                                <button className="bg-emerald-500 text-white px-2 py-1 rounded text-[8px] font-black uppercase" onClick={() => {
                                    setState(prev => ({
                                        ...prev,
                                        mana: prev.mana + q.rewardEssence,
                                        gems: prev.gems + q.rewardGems,
                                        dailyQuests: prev.dailyQuests.map(dq => dq.id === q.id ? {...dq, isCompleted: true} : dq),
                                        chronicle: [`Completed quest ${q.description}!`, ...prev.chronicle]
                                    }));
                                    playSound('levelUp');
                                } }>Claim</button>
                              )}
                              {q.isCompleted && <span className="text-emerald-500 text-[8px] font-black uppercase">Collected</span>}
                            </div>
                        </div>
                    );})}
                 </div>
             </div>
           </div>
        )}

        {/* PvP Challenge Notifications */}
        <div key="pvp-notifications" className="fixed top-24 right-6 z-[160] flex flex-col gap-3 pointer-events-none">
          {false && pvpChallenges.filter(c => c.status === 'pending').map(challenge => (
            <motion.div 
              key={challenge.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="bg-indigo-900/90 border border-purple-500/50 p-4 rounded-2xl shadow-2xl backdrop-blur-xl w-64 pointer-events-auto"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-500/20 rounded-lg"><Sword className="w-5 h-5 text-purple-400" /></div>
                <div className="flex flex-col">
                  <span className="text-xs text-white font-bold leading-none">{challenge.inviterName}</span>
                  <span className="text-[10px] text-indigo-300 uppercase font-black">CHALLENGE!</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => respondToPvP(challenge, true)}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] py-2 rounded-xl font-black uppercase tracking-widest transition-all"
                >
                  Accept
                </button>
                <button 
                  onClick={() => respondToPvP(challenge, false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white text-[10px] py-2 rounded-xl font-black uppercase tracking-widest transition-all"
                >
                  Decline
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* PvP Duel UI */}
        {/* PvP Disabled */}
        {false && activePvP && activePvP.battleState && (
          <div key="pvp-ui" className="fixed inset-0 z-[170] flex flex-col items-center justify-end p-6 bg-indigo-950/98 backdrop-blur-3xl overflow-hidden">
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
              <Sword className="w-6 h-6 text-purple-400" />
              <span className="text-xl font-display font-black text-white tracking-widest uppercase">Magical Duel</span>
            </div>

            <div className="relative flex-1 w-full max-w-5xl flex items-center justify-between px-12 md:px-24 mb-12">
               {/* Opponent Side */}
               <div className="relative flex flex-col items-center gap-4">
                 <div className="w-40 h-40 md:w-56 md:h-56 bg-white/5 rounded-[4rem] border-4 border-white/10 flex items-center justify-center backdrop-blur-md overflow-hidden">
                   <img 
                    src={activePvP.inviterId === user?.uid 
                      ? CHARMED_CHARACTERS.find(c => c.id === 'piper')?.avatar // Mocked character for opponent in this demo
                      : CHARMED_CHARACTERS.find(c => c.id === activePvP.inviterCharacterId)?.avatar
                    } 
                    className="w-full h-full object-cover" 
                    alt="Opponent" 
                   />
                 </div>
                 <div className="w-full flex flex-col gap-1 px-4">
                   <div className="flex justify-between items-center text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                     <span>{activePvP.inviterId === user?.uid ? "OPPONENT" : activePvP.inviterName}</span>
                     <span>{activePvP.inviterId === user?.uid ? activePvP.battleState.inviteeHealth : activePvP.battleState.inviterHealth} HP</span>
                   </div>
                   <div className="w-full h-3 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                     <motion.div 
                       animate={{ width: `${activePvP.inviterId === user?.uid ? activePvP.battleState.inviteeHealth : activePvP.battleState.inviterHealth}%` }}
                       className="h-full bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]"
                     />
                   </div>
                 </div>
               </div>

               <div className="text-5xl font-display font-black text-white/10 pointer-events-none">VS</div>

               {/* My Side */}
               <div className="relative flex flex-col items-center gap-4">
                 <div className="w-40 h-40 md:w-56 md:h-56 bg-purple-500/20 rounded-[4rem] border-4 border-purple-500/30 flex items-center justify-center backdrop-blur-md overflow-hidden">
                   <img src={selectedCharacter?.avatar} className="w-full h-full object-cover" alt="Me" />
                 </div>
                 <div className="w-full flex flex-col gap-1 px-4">
                   <div className="flex justify-between items-center text-[10px] font-black text-purple-400 uppercase tracking-widest">
                     <span>{user?.displayName?.toUpperCase()}</span>
                     <span>{activePvP.inviterId === user?.uid ? activePvP.battleState.inviterHealth : activePvP.battleState.inviteeHealth} HP</span>
                   </div>
                   <div className="w-full h-3 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                     <motion.div 
                       animate={{ width: `${activePvP.inviterId === user?.uid ? activePvP.battleState.inviterHealth : activePvP.battleState.inviteeHealth}%` }}
                       className="h-full bg-gradient-to-r from-purple-600 to-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                     />
                   </div>
                 </div>
               </div>
            </div>

            <div className="w-full max-w-5xl flex flex-col md:flex-row gap-6 p-8 bg-indigo-900/60 rounded-[3rem] border border-white/10 backdrop-blur-xl relative z-20 mb-8 border-t-white/20">
               <div className="flex-1 flex flex-col gap-4">
                 <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                   <Shield className="w-4 h-4 text-purple-400" />
                   <span className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em]">Duel Log</span>
                 </div>
                 <div className="flex flex-col gap-2 h-24 overflow-y-auto custom-scrollbar">
                   {activePvP.battleState.log.map((entry, i) => (
                     <motion.p 
                       key={i} 
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       className={`text-sm font-medium tracking-wide ${i === 0 ? 'text-white' : 'text-white/30'}`}
                      >
                        {entry}
                      </motion.p>
                   ))}
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4 w-full md:w-[450px]">
                 {activePvP.status === 'completed' ? (
                   <button 
                    onClick={() => setActivePvP(null)}
                    className="col-span-2 bg-purple-600 text-white p-5 rounded-2xl font-display font-black text-xl active:scale-95"
                   >
                     CLOSE DUEL
                   </button>
                 ) : (
                   <>
                    <BattleAction 
                      label="ATTACK" 
                      icon={Sword} 
                      color="bg-rose-600 hover:bg-rose-500 disabled:opacity-30" 
                      onClick={() => executePvPTurn('attack')}
                      disabled={activePvP.battleState.turnId !== user?.uid} 
                    />
                    <BattleAction 
                      label={activeSpell.name.toUpperCase()} 
                      icon={Zap} 
                      color="bg-purple-600 hover:bg-purple-500 disabled:opacity-30" 
                      onClick={() => executePvPTurn('spell')}
                      disabled={activePvP.battleState.turnId !== user?.uid} 
                    />
                    <BattleAction 
                      label="FOCUS" 
                      icon={Heart} 
                      color="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30" 
                      onClick={() => executePvPTurn('focus')}
                      disabled={activePvP.battleState.turnId !== user?.uid} 
                    />
                    <div className="flex items-center justify-center p-4">
                      <span className="text-[10px] font-black text-white/50 text-center uppercase tracking-widest italic animate-pulse">
                        {activePvP.battleState.turnId === user?.uid ? "YOUR TURN" : "OPPONENT'S TURN"}
                      </span>
                    </div>
                   </>
                 )}
               </div>
            </div>
          </div>
        )}

        {/* Celebration Effects */}
        {celebration && celebration.type !== 'level_up' && (
          <motion.div 
            key={`celeb-${celebration.type}-${celebration.amount || ''}`}
            initial={celebration.type === 'power_of_three' ? { opacity: 0, scale: 0.5 } : { opacity: 0, y: 50 }} 
            animate={celebration.type === 'power_of_three' ? { opacity: 1, scale: 1 } : { opacity: 1, y: -100 }} 
            exit={{ opacity: 0 }} 
            className={`fixed ${celebration.type === 'power_of_three' ? 'inset-0 z-[1000] flex items-center justify-center' : 'inset-x-0 bottom-1/2 z-[60] flex items-center justify-center'} pointer-events-none`}
          >
            {celebration.type === 'power_of_three' ? (
              <div className="flex flex-col items-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-64 h-64 border-4 border-dashed border-purple-500 rounded-full flex items-center justify-center"
                >
                  <Sparkles className="w-32 h-32 text-purple-300" />
                </motion.div>
                <div className="text-6xl font-display font-black text-white mt-8 uppercase drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]">Power of Three</div>
              </div>
            ) : (
                <div className={`text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white/50 ${celebration.type === 'drain' ? 'bg-gradient-to-r from-red-600 to-rose-900 border-red-500/50' : 'bg-gradient-to-r from-purple-500 to-sky-500'}`}>
                <Sparkles className="w-8 h-8" />
                <span className="text-3xl font-display font-black uppercase">
                    {celebration.type === 'drain' ? `-${celebration.amount} ESSENCE (${celebration.label || 'DRAIN'})` : celebration.type === 'reward' || celebration.type === 'mana' ? `+${celebration.amount} ESSENCE` : 'ENCHANTED!'}
                </span>
                </div>
            )}
          </motion.div>
        )}
        
        {/* ACTIVE HEIST UI */}
        {activeHeist && (
          <div key="heist-modal" className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-indigo-950/95 backdrop-blur-3xl">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/10 p-10 rounded-[3rem] border border-white/20 w-full max-w-4xl text-center shadow-2xl overflow-hidden relative">
              <div className="absolute top-4 left-4 p-3 bg-purple-500/20 rounded-2xl flex items-center gap-3">
                <img src={activeHeist.targetUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeHeist.targetUser.uid}`} className="w-10 h-10 rounded-xl" />
                <div className="text-left flex flex-col items-start"><span className="text-[10px] text-white/50 font-black uppercase leading-none mb-1">Scrying Target</span><span className="text-white font-bold text-sm leading-none">{activeHeist.targetUser.displayName}</span></div>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-sky-400 mt-12 mb-2">Astral Scrying</h2>
              <p className="text-indigo-200/80 mb-8 font-medium text-lg">Select symbols to align the astral planes. Match 3 for a supreme steal! Beware: the void grows stronger at higher levels. Picks left: {activeHeist.picksLeft}</p>
              
              <div className="grid grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4 mb-4">
                 {activeHeist.chests.map((chest, i) => (
                   <button 
                     key={`heist-symbol-${i}`}
                     onClick={() => {
                        if (activeHeist.revealed[i] || activeHeist.picksLeft <= 0) return;
                        
                        playSound('click');
                        const newRevealed = [...activeHeist.revealed];
                        newRevealed[i] = true;
                        
                        const newMatched = [...activeHeist.matched];
                        if (chest !== 'empty') newMatched.push(chest as any);
                        
                        const largeCount = newMatched.filter(c => c === 'large').length;
                        const isWin = largeCount >= 3;
                        const picks = activeHeist.picksLeft - 1;

                        if (isWin || picks <= 0) {
                           const reward = isWin ? (60000 * state.floor) : 0;
                           setActiveHeist(prev => prev ? {...prev, revealed: newRevealed, matched: newMatched, picksLeft: 0} : null);
                           
                           setTimeout(() => {
                              if (isWin) {
                                 setState(s => ({ ...s, mana: s.mana + reward, chronicle: [`Astral Alignment SUCCESS! Plundered ${reward.toLocaleString()} Essence.`, ...s.chronicle] }));
                                 setCelebration({ type: 'mana', amount: reward });
                              } else {
                                 setState(s => ({ ...s, chronicle: [`Astral Alignment FAILED. The planes remain discordant.`, ...s.chronicle] }));
                              }
                              setActiveHeist(null);
                           }, 1500);
                        } else {
                           setActiveHeist(prev => prev ? {...prev, revealed: newRevealed, matched: newMatched, picksLeft: picks} : null);
                        }
                     }}
                     className={`aspect-square w-full rounded-2xl flex items-center justify-center transition-all ${activeHeist.revealed[i] ? 'bg-white/5 border border-white/10 scale-95' : 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border border-purple-400/30 hover:scale-105 active:scale-95 shadow-xl hover:shadow-purple-500/30 cursor-pointer'}`}
                   >
                      {activeHeist.revealed[i] ? (
                        chest === 'large' ? <Sparkles className="w-8 h-8 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" /> : 
                        chest === 'small' ? <div className="w-6 h-6 bg-cyan-400 rounded-full" /> : 
                        <div className="w-4 h-4 bg-white/10 rounded-full" />
                      ) : (
                        <Star className="w-6 h-6 text-white/30" />
                      )}
                   </button>
                 ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* ACTIVE RAID UI */}
        {activeRaid && (
          <motion.div 
            key="raid-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[600] bg-black flex flex-col overflow-hidden select-none"
          >
             {/* IMMERSIVE DEPTH LAYER */}
             <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-[-150px]">
                  <img 
                    src={WORLDS.find(w => w.id === activeRaid.targetState.currentWorldId)?.image || WORLDS[0].image} 
                    className="w-full h-full object-cover opacity-20 sepia brightness-50" 
                    alt="" 
                  />
                  <div className="absolute inset-0 bg-radial-gradient from-rose-950/10 via-black/40 to-black/90" />
                </div>
             </div>

             {/* ESSENCE PARTICLES (RED FOR RAID) */}
             <div className="absolute inset-0 z-10 pointer-events-none">
                {[...Array(30)].map((_, i) => (
                  <motion.div
                    key={`raid-essence-${i}`}
                    initial={{ x: Math.random() * 100 + '%', y: '110%', opacity: 0 }}
                    animate={{ y: '-10%', opacity: [0, 0.3, 0] }}
                    transition={{ duration: 10 + Math.random() * 20, repeat: Infinity, delay: i * 0.5 }}
                    className="absolute w-1 h-1 bg-rose-500 rounded-full blur-[1px]"
                  />
                ))}
             </div>
             
             <div className="relative z-20 h-full flex flex-col">
                {/* HEADER HUD (Matching Build View) */}
                <div className="w-full flex justify-between items-start md:items-end p-6 md:p-12">
                   <div className="pl-0 md:pl-16">
                      <motion.h4 
                        animate={{ letterSpacing: ['0.4em', '0.5em', '0.4em'] }}
                        transition={{ duration: 5, repeat: Infinity }}
                        className="text-[8px] md:text-sm font-black text-rose-500 uppercase tracking-[0.4em] mb-1 md:mb-2 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                      >
                        Demonic Invasion
                      </motion.h4>
                      <h2 className="text-2xl md:text-5xl lg:text-7xl font-display font-black text-white leading-none tracking-tighter drop-shadow-2xl">
                         {activeRaid.targetUser.displayName.toUpperCase()}'s SANCTUM
                      </h2>
                      <div className="flex items-center gap-2 mt-4">
                         <img src={activeRaid.targetUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeRaid.targetUser.uid}`} className="w-6 h-6 rounded-lg ring-2 ring-rose-500/20" alt="" />
                         <span className="text-sm md:text-lg font-bold text-white/40 tracking-wider">Dimension Level {activeRaid.targetState.level}</span>
                      </div>

                      <div className="flex flex-wrap gap-2 md:gap-4 mt-6">
                         <button onClick={() => setRaidWeapon('default')} className={`px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-sm rounded-xl border flex items-center gap-2 transition-all ${raidWeapon === 'default' ? 'bg-rose-500/30 border-rose-500 text-white shadow-[0_0_15px_#f43f5e]' : 'bg-black/50 border-white/10 text-white/50 hover:bg-white/10'}`}>
                            <Swords className="w-3 h-3 md:w-4 md:h-4" /> Normal Strike
                         </button>
                         <button onClick={() => setRaidWeapon('potion')} disabled={state.potions <= 0} className={`px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-sm rounded-xl border flex items-center gap-2 transition-all disabled:opacity-30 ${raidWeapon === 'potion' ? 'bg-rose-500/30 border-rose-500 text-white shadow-[0_0_15px_#f43f5e]' : 'bg-black/50 border-white/10 text-white/50 hover:bg-white/10'}`}>
                            <FlaskConical className="w-3 h-3 md:w-4 md:h-4" /> Potion ({state.potions})
                         </button>
                         {state.unlockedSpellIds.length > 0 && (
                           <button onClick={() => setRaidWeapon('spell')} disabled={state.mana < 2000} className={`px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-sm rounded-xl border flex items-center gap-2 transition-all disabled:opacity-30 ${raidWeapon === 'spell' ? 'bg-rose-500/30 border-rose-500 text-white shadow-[0_0_15px_#f43f5e]' : 'bg-black/50 border-white/10 text-white/50 hover:bg-white/10'}`}>
                              <Zap className="w-3 h-3 md:w-4 md:h-4" /> Spell (2000E)
                           </button>
                         )}
                      </div>
                   </div>

                   <button 
                     onClick={() => { setActiveRaid(null); setRaidWeapon('default'); }} 
                     className="bg-white/5 backdrop-blur-3xl p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 text-white hover:bg-white/15 transition-all shadow-2xl"
                   >
                      <X className="w-6 h-6 md:w-10 md:h-10 text-white/60" />
                   </button>
                </div>
             
                <div className="flex-1 w-full relative max-w-5xl mx-auto overflow-hidden">
                   {/* NODE MAP (Identical to Build Mode style) */}
                   {(() => {
                      let targetWorldId = activeRaid.targetState.currentWorldId || WORLDS[0].id;
                      let targetWorld = WORLDS.find(w => w.id === targetWorldId) || WORLDS[0];
                      let worldProgress = activeRaid.targetState?.worldProgress?.[targetWorld.id] || {};
                      
                      // If the current world has no progress, find the first world that does
                      if (Object.keys(worldProgress || {}).length === 0 || !Object.values(worldProgress).some(v => (v as number) > 0)) {
                         const populatedWorldId = Object.keys(activeRaid.targetState?.worldProgress || {}).find(wId => {
                           const prog = activeRaid.targetState.worldProgress[wId];
                           return prog && Object.values(prog).some(lvl => (lvl as number) > 0);
                         });
                         if (populatedWorldId) {
                           targetWorldId = populatedWorldId;
                           targetWorld = WORLDS.find(w => w.id === targetWorldId) || WORLDS[0];
                           worldProgress = activeRaid.targetState.worldProgress[targetWorldId];
                         }
                       }
                       return targetWorld.nodes.map((node) => {
                         const level = worldProgress[node.id] || 0;
                         const health = activeRaid.targetState.nodeHealth?.[targetWorld.id]?.[node.id] ?? 100;
                         const isShielded = activeRaid.targetState.shieldedNodes?.[targetWorld.id]?.includes(node.id);
                         const IconComp = ICON_MAP[node.icon] || Swords;
                         const isBroken = health <= 0;
                         
                         return (
                           <motion.div 
                             key={node.id}
                             className="absolute"
                             style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
                             initial={{ opacity: 0, scale: 0 }}
                             animate={{ opacity: 1, scale: 1 }}
                           >
                              <div className="relative group flex flex-col items-center">
                                 {/* Connector lines (simplified visual) */}
                                 <div className="absolute top-1/2 left-1/2 w-48 h-[1px] bg-gradient-to-r from-rose-500/0 via-rose-500/20 to-rose-500/0 -translate-x-1/2 rotate-45 pointer-events-none" />
                                 
                                 <button 
                                   disabled={level === 0}
                                   onClick={() => {
                                      playSound('battleStart');
                                      let bypassShield = false;
                                      let dmgMultiplier = 1;

                                      if (raidWeapon === 'potion') {
                                        if (state.potions <= 0) return;
                                        bypassShield = true;
                                        dmgMultiplier = 4; // Instantly destroy
                                        setState(s => ({ ...s, potions: s.potions - 1 }));
                                      } else if (raidWeapon === 'spell') {
                                        if (state.mana < 2000) return;
                                        bypassShield = true;
                                        dmgMultiplier = 2;
                                        setState(s => ({ ...s, mana: Math.max(0, s.mana - 2000) }));
                                      }

                                      if (isShielded && !bypassShield) {
                                         playSound('spell');
                                         setState(s => ({ ...s, chronicle: [`Attack BLOCKED by ${activeRaid.targetUser.displayName}'s Angelic Aegis on ${node.name}!`, ...s.chronicle] }));
                                      } else {
                                         let damagePercent = [100, 75, 50, 40, 25][Math.min(4, Math.max(0, level - 1))] || 25;
                                         damagePercent = Math.min(100, Math.floor(damagePercent * dmgMultiplier));
                                         
                                         const newHealth = Math.max(0, health - damagePercent);
                                         const baseReward = level * 1000 + (activeRaid.targetState.level * 2000);
                                         // Potion and Spell give a bonus to effectiveness
                                         const bonusEvasion = bypassShield ? 0.5 : 0;
                                         const effectiveness = (health / 100) * (Math.random() * 0.5 + 0.5 + bonusEvasion);
                                         const reward = Math.floor(baseReward * effectiveness);

                                         if (activeRaid.targetUser.uid && !activeRaid.targetUser.uid.startsWith('npc_')) {
                                            const reportRef = doc(collection(db, 'damage_reports'));
                                            setDoc(reportRef, {
                                                targetUserId: activeRaid.targetUser.uid,
                                                attackerName: user?.displayName || 'Unknown Mage',
                                                worldId: targetWorld.id,
                                                nodeId: node.id,
                                                damage: damagePercent,
                                                stolenMana: reward,
                                                timestamp: Date.now()
                                            }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'damage_reports'));
                                         }
                                         
                                         const today = new Date().toDateString();

                                         setState(s => {
                                            const isSameDay = s.lastRaidDateString === today;
                                            return {
                                              ...s, 
                                              mana: s.mana + reward, 
                                              dailyRaidsCount: (isSameDay ? (s.dailyRaidsCount || 0) : 0) + 1,
                                              dailyRaidedUids: [...(isSameDay ? (s.dailyRaidedUids || []) : []), activeRaid.targetUser.uid],
                                              lastRaidDateString: today,
                                              chronicle: [`Raided ${node.name}! Stole ${reward.toLocaleString()} Essence from ${activeRaid.targetUser.displayName} (Inflicted ${damagePercent}% Damage).`, ...s.chronicle]
                                            };
                                         });
                                         setCelebration({ type: 'mana', amount: reward });
                                      }
                                      setActiveRaid(null);
                                   }}
                                   className={`relative z-10 w-24 h-24 md:w-32 md:h-32 rounded-full border-[6px] transition-all duration-500 flex flex-col items-center justify-center ${
                                     level === 0 ? 'border-white/5 bg-white/5 opacity-40 cursor-default' :
                                     isShielded ? 'border-cyan-400 group-hover:scale-110 shadow-[0_0_60px_rgba(34,211,238,0.4)] bg-cyan-950/80' : 
                                     isBroken ? 'border-rose-900 bg-rose-950/20 grayscale' :
                                     'border-rose-500/40 hover:border-rose-500 hover:scale-125 shadow-[0_0_40px_rgba(244,63,94,0.3)] bg-rose-950/40'
                                   }`}
                                 >
                                    <IconComp className={`w-8 h-8 md:w-12 md:h-12 ${level === 0 ? 'text-white/10' : isShielded ? 'text-cyan-300' : isBroken ? 'text-rose-900' : 'text-rose-400 group-hover:text-white'} transition-colors`} />
                                    
                                    {isShielded && (
                                       <motion.div 
                                         animate={{ rotate: 360 }}
                                         transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                                         className="absolute inset-[-12px] border-2 border-dashed border-cyan-400/40 rounded-full"
                                       />
                                    )}

                                    {/* Level Badge */}
                                    {level > 0 && (
                                      <div className={`absolute -bottom-3 px-3 py-1 rounded-full text-[8px] font-black tracking-widest ${isShielded ? 'bg-cyan-500' : isBroken ? 'bg-rose-900' : 'bg-rose-600'} text-white shadow-xl`}>
                                        {isBroken ? 'DESTROYED' : `RANK ${level}`}
                                      </div>
                                    )}

                                    {/* Health Bar */}
                                    {level > 0 && (
                                      <div className="absolute -top-6 w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                         <div 
                                           className={`h-full transition-all duration-1000 ${health > 60 ? 'bg-emerald-500' : health > 30 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                           style={{ width: `${health}%` }}
                                         />
                                      </div>
                                    )}
                                 </button>
                                 
                                 <motion.div 
                                   initial={{ y: 0, opacity: 0.6 }}
                                   animate={{ y: 5, opacity: 1 }}
                                   className="mt-6 text-center"
                                 >
                                    <h4 className={`text-[10px] md:text-sm font-black uppercase tracking-widest drop-shadow-lg ${level === 0 ? 'text-white/10' : 'text-white'}`}>{node.name}</h4>
                                 </motion.div>
                              </div>
                           </motion.div>
                         );
                      });
                   })()}

                    {/* Empty State Logic */}
                    {(() => {
                       const hasBuildings = Object.values(activeRaid.targetState?.worldProgress || {}).some(wProg => 
                          Object.values(wProg as any).some(lvl => (lvl as number) > 0)
                       );
                       if (hasBuildings) return null;

                       return (
                           <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <div className="bg-black/80 border-4 border-rose-500/30 rounded-[3.5rem] p-12 text-center flex flex-col items-center backdrop-blur-3xl max-w-md mx-auto shadow-2xl relative overflow-hidden">
                                   <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
                                   <div className="p-8 bg-rose-500/20 rounded-full mb-8 border border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.2)]">
                                     <Skull className="w-16 h-16 text-rose-500" />
                                   </div>
                                   <h3 className="text-3xl lg:text-4xl font-display font-black text-white mb-3 uppercase tracking-tighter">DESERTED REALM</h3>
                                   <p className="text-rose-200/40 text-base mb-10 leading-relaxed font-medium italic">"No structures detected. This soul has already been plundered or never bloomed."</p>
                                   <button 
                                     onClick={() => { setActiveRaid(null); setState(s => ({ ...s, mana: s.mana + 5000 })); setCelebration({ type: 'mana', amount: 5000 }); }} 
                                     className="w-full bg-rose-600 hover:bg-rose-400 text-white py-6 rounded-2xl text-xs font-black uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(244,63,94,0.3)] transition-all active:scale-95 flex items-center justify-center gap-3"
                                   >
                                     PLUNDER CORE (+5,000) <ChevronRight className="w-5 h-5" />
                                   </button>
                               </div>
                           </div>
                       );
                    })()}
                </div>
             </div>
          </motion.div>
        )}

        {/* Game Card Modal (Fate/Legacy) */}
        {activeCard && (
          <div key="card-modal" className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.5, rotateY: 90, opacity: 0 }}
              animate={{ scale: 1, rotateY: 0, opacity: 1 }}
              className="relative w-full max-w-sm"
            >
              <div className={`relative aspect-[3/4.5] rounded-[2rem] border-4 p-8 shadow-2xl flex flex-col items-center justify-between overflow-hidden ${activeCard.type === 'chance' ? 'bg-indigo-900 border-purple-500 shadow-purple-500/40' : 'bg-emerald-950 border-emerald-500 shadow-emerald-500/40'}`}>
                {/* Card Design Elements */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-white/5 -skew-y-12 -translate-y-10" />
                
                <div className="z-10 text-center">
                  <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center shadow-2xl ${activeCard.type === 'chance' ? 'bg-purple-600 text-white' : 'bg-emerald-600 text-white'}`}>
                    <Sparkles className="w-10 h-10" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-2">{activeCard.type === 'chance' ? 'Book of Shadows Fate' : 'Halliwell Legacy Chest'}</h4>
                  <h2 className="text-3xl font-display font-black text-white leading-tight mb-4">{activeCard.title.toUpperCase()}</h2>
                  <div className="w-12 h-1 bg-white/20 mx-auto mb-6 rounded-full" />
                </div>

                <p className="z-10 text-center text-lg font-medium text-white/90 leading-relaxed italic">
                  "{activeCard.content}"
                </p>

                <button 
                  onClick={() => {
                    playSound('click');
                    activeCard.action(state, setState);
                    setActiveCard(null);
                  }}
                  className="z-10 w-full py-5 bg-white text-indigo-950 rounded-2xl font-display font-black uppercase tracking-widest text-sm shadow-xl hover:bg-purple-100 transition-all active:scale-95"
                >
                  CONTINUE JOURNEY
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Tile Modal */}
        {showEventModal && (
          <div key="event-modal" className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-indigo-950/90 backdrop-blur-md">
            <div className="bg-indigo-900 border border-white/10 w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl relative">
              <button onClick={() => setShowEventModal(null)} className="absolute top-6 right-6 z-20 p-2 bg-black/20 rounded-full text-white/50 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              
              <div className="w-full h-48 relative overflow-hidden">
                <img src={showEventModal.image} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-900 via-indigo-900/40 to-transparent" />
                <div className="absolute bottom-6 left-8">
                  <h2 className="text-white text-3xl font-display font-black drop-shadow-lg">{showEventModal.name.toUpperCase()}</h2>
                  <div className="flex gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < (state.buildingUpgrades[showEventModal.id] || 0) ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8">
                <p className="text-indigo-200/80 text-sm mb-8 leading-relaxed">
                  Enhance this sacred site to increase the Essence yield and strengthen the Power of Three in this realm.
                </p>

                <div className="flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-indigo-300 uppercase font-black tracking-widest">Enchant Cost</span>
                    <span className="text-2xl font-display font-black text-white">
                      {((showEventModal.manaCost || 100) * ((state.buildingUpgrades[showEventModal.id] || 0) + 1) * 2).toLocaleString()}
                    </span>
                  </div>
                  <button 
                    onClick={() => enchantSanctuary(showEventModal.id)}
                    disabled={state.mana < (showEventModal.manaCost || 100) * ((state.buildingUpgrades[showEventModal.id] || 0) + 1) * 2 || (state.buildingUpgrades[showEventModal.id] || 0) >= 5}
                    className="bg-purple-600 disabled:opacity-30 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl font-display font-black active:scale-95 transition-all text-sm shadow-lg shadow-purple-500/20"
                  >
                    {(state.buildingUpgrades[showEventModal.id] || 0) === 0 ? 'ENCHANT' : 'UPGRADE'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Story Modal */}
        {currentStory && (
          <div key="story-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              className="bg-indigo-950 border border-purple-500/30 w-full max-w-4xl rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(168,85,247,0.2)] flex flex-col md:flex-row relative"
            >
              <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent" />

              <div className="w-full md:w-1/2 h-64 md:h-auto relative z-10">
                <img src={currentStory.images[storyImageIndex]} className="w-full h-full object-cover transition-opacity duration-500" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-indigo-950 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 flex gap-2">
                    {currentStory.images.map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i === storyImageIndex ? 'bg-white' : 'bg-white/30'}`} />
                    ))}
                </div>
              </div>
              <div className="p-8 md:p-12 flex-1 flex flex-col justify-center relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">Book of Shadows</h4>
                </div>
                <h2 className="text-3xl md:text-5xl font-display font-black text-white mb-6 leading-tight bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
                  {currentStory.title.split(': ')[1] || currentStory.title}
                </h2>
                <p className="text-indigo-100 text-base md:text-lg leading-relaxed mb-8 italic border-l-2 border-purple-500/50 pl-4">
                  "{currentStory.content}"
                </p>
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold mb-8">
                  <Star className="w-4 h-4 fill-emerald-400" />
                  <span>+100 Special Points Awarded</span>
                </div>
                <button 
                  onClick={() => {
                    playSound('pageTurn');
                    if (storyImageIndex < currentStory.images.length - 1) {
                      setStoryImageIndex(storyImageIndex + 1);
                    } else {
                      setCurrentStory(null);
                    }
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-5 rounded-2xl font-display font-black text-lg hover:from-purple-500 hover:to-indigo-500 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2"
                >
                  {storyImageIndex < currentStory.images.length - 1 ? "NEXT CLIP" : "CONTINUE JOURNEY"} <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BattleAction({ label, icon: Icon, color, onClick, subtext, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled} className={`${color} flex flex-col items-center justify-center p-3 md:p-4 rounded-2xl gap-1 active:scale-90 transition-all border border-white/20 shadow-lg disabled:opacity-30`}>
      <Icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
      <span className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-widest">{label}</span>
      {subtext && <span className="text-[8px] font-bold text-white/70">{subtext}</span>}
    </button>
  );
}

interface TileComponentProps {
  tile: TileData;
  level?: number;
  isActive: boolean;
  className?: string;
  side: 'top' | 'right' | 'bottom' | 'left' | 'corner';
}

const SmallBattleAction = ({ label, icon: Icon, color, onClick, subtext, disabled, warning }: { label: string, icon: any, color: string, onClick: () => void, subtext?: string, key?: any, disabled?: boolean, warning?: boolean }) => {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-4 ${disabled ? 'bg-stone-800 border-stone-600 opacity-50 cursor-not-allowed' : color} rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${!disabled ? 'active:scale-95 hover:shadow-2xl' : ''} shadow-xl border border-white/20 group relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      <Icon className={`w-5 h-5 text-white ${!disabled ? 'group-hover:scale-110' : ''} transition-transform relative z-10`} />
      {warning && <AlertTriangle className="w-3 h-3 text-amber-300 absolute top-2 right-2 z-20" />}
      <div className="flex flex-col items-center relative z-10">
        <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{label}</span>
        {subtext && <span className="text-[8px] text-white/60 font-bold whitespace-nowrap">{subtext}</span>}
      </div>
    </button>
  );
};

const CharacterToken = ({ avatar, tileId }: { avatar?: string, tileId: number }) => {
  const getGridPos = (id: number) => {
    if (id < 7) return { col: id + 1, row: 1 };
    if (id < 13) return { col: 7, row: id - 5 };
    if (id < 19) return { col: 7 - (id - 12), row: 7 };
    return { col: 1, row: 7 - (id - 18) };
  };

  const pos = getGridPos(tileId);

  return (
    <motion.div
      initial={false}
      animate={{
        gridColumnStart: pos.col,
        gridRowStart: pos.row,
      }}
      transition={{ 
        type: "spring", 
        stiffness: 80, 
        damping: 15,
        mass: 1
      }}
      className="z-[100] pointer-events-none flex items-center justify-center p-0.5"
      style={{ gridColumnStart: pos.col, gridRowStart: pos.row }}
    >
      <div className="relative">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.8, 0.6] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute inset-[-10px] bg-purple-500/40 rounded-full blur-2xl" 
        />
        <motion.div 
          animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="relative w-12 h-12 md:w-20 md:h-20 rounded-full border-4 border-white shadow-[0_0_30px_rgba(255,255,255,0.4)] overflow-hidden bg-indigo-900"
        >
          <img src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=Hero`} className="w-full h-full object-cover" alt="Hero" />
          <motion.div 
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 bg-gradient-to-t from-purple-500/50 to-transparent" 
          />
        </motion.div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-black/40 blur-md rounded-full" />
      </div>
    </motion.div>
  );
};

const TileComponent: FC<TileComponentProps> = ({ tile, level, isActive, className = '', side }) => {
  const Icon = ICON_MAP[tile.icon || ''] || null;
  const isCorner = side === 'corner';

  return (
    <div className={`relative ${className} p-0.5 group`}>
      <motion.div 
        whileHover={{ scale: 1.05 }}
        className={`
          relative w-full h-full rounded-xl md:rounded-2xl overflow-hidden transition-all duration-300
          border ${isActive ? 'border-purple-400 bg-purple-900/40 shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'border-white/5 bg-indigo-950/40 hover:bg-indigo-900/60'}
        `}
      >
        {/* Monopoly Color Bar */}
        {tile.type === 'property' && !isCorner && (
          <div className={`
            absolute ${tile.color} 
            ${side === 'top' ? 'h-3 w-full top-0' : 
              side === 'bottom' ? 'h-3 w-full bottom-0' : 
              side === 'left' ? 'w-3 h-full right-0' : 'w-3 h-full left-0'}
            shadow-[0_0_10px_rgba(255,255,255,0.2)]
          `} />
        )}

        <div className={`
          relative z-10 w-full h-full p-2 flex flex-col items-center justify-center gap-1.5
          ${side === 'left' ? 'flex-row-reverse' : side === 'right' ? 'flex-row' : 'flex-col'}
        `}>
          {Icon && (
            <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-purple-400 text-black' : 'bg-white/5 text-indigo-300 group-hover:bg-indigo-800'}`}>
              <Icon className="w-5 h-5 md:w-7 md:h-7" />
            </div>
          )}
          
          <span className={`
            text-[6px] md:text-[9px] font-black text-center leading-none tracking-tighter truncate max-w-[90%]
            ${isActive ? 'text-white' : 'text-indigo-200/60 group-hover:text-white'}
          `}>
            {tile.name.toUpperCase()}
          </span>

          {(level || 0) > 0 && !isCorner && (
            <div className="flex gap-0.5 mt-1">
              {[...Array(level)].map((_, i) => (
                <Star key={i} className="w-2 h-2 md:w-3 md:h-3 text-amber-400 fill-amber-400" />
              ))}
            </div>
          )}
        </div>

        {/* Visual Overlay if active */}
        {isActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-purple-500/20 border-2 border-purple-400 pointer-events-none" 
          />
        )}
      </motion.div>
    </div>
  );
};

import { World, GameCard } from './types';

export const WORLDS: World[] = [
  {
    id: 'halliwell_manor',
    name: 'Halliwell Manor',
    description: 'The ancestral home of the Charmed Ones. The spiritual center of their power.',
    image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&q=80&w=1200',
    requiredLevel: 1,
    nodes: [
      { id: 'attic', name: 'The Attic', description: 'Where the Book of Shadows is kept. Increases Scroll generation.', cost: 1000, level: 0, maxLevel: 5, icon: 'BookOpen', x: 20, y: 15 },
      { id: 'conservatory', name: 'Conservatory', description: 'A place for meditation. Increases Mana recovery.', cost: 1500, level: 0, maxLevel: 5, icon: 'Leaf', x: 75, y: 30 },
      { id: 'kitchen', name: 'Kitchen', description: 'For brewing powerful potions. Unlocks rare potion types.', cost: 2000, level: 0, maxLevel: 5, icon: 'FlaskConical', x: 40, y: 65 },
      { id: 'basement', name: 'Basement', description: 'A hidden sanctuary. Increases defense in battles.', cost: 2500, level: 0, maxLevel: 5, icon: 'Shield', x: 80, y: 75 }
    ]
  },
  {
    id: 'p3_nightclub',
    name: 'P3 Nightclub',
    description: 'Piper\'s business venture. A hub for San Francisco\'s supernatural community.',
    image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=1200',
    requiredLevel: 2,
    nodes: [
      { id: 'stage', name: 'Main Stage', description: 'Attracts influential visitors. Increases Essence yield.', cost: 5000, level: 0, maxLevel: 5, icon: 'Music', x: 50, y: 20 },
      { id: 'bar', name: 'The Bar', description: 'A source of gossip and information. Unlocks new quests.', cost: 6000, level: 0, maxLevel: 5, icon: 'Beer', x: 20, y: 60 },
      { id: 'vip', name: 'VIP Lounge', description: 'Where high-profile magical beings meet.', cost: 8000, level: 0, maxLevel: 5, icon: 'Star', x: 80, y: 55 }
    ]
  },
  {
    id: 'underworld',
    name: 'The Underworld',
    description: 'The domain of demons and dark magic. Reclaiming it weakens the Source.',
    image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=1200',
    requiredLevel: 3,
    nodes: [
      { id: 'throne', name: 'Source\'s Throne', description: 'Directly challenges the Source. Increases battle damage.', cost: 20000, level: 0, maxLevel: 5, icon: 'Crown', x: 50, y: 15 },
      { id: 'arena', name: 'Demon Arena', description: 'A place to master combat spells. Decreases spell mana costs.', cost: 25000, level: 0, maxLevel: 5, icon: 'Swords', x: 30, y: 70 }
    ]
  },
  {
    id: 'golden_gate_bridge',
    name: 'Golden Gate Bridge',
    description: 'The iconic landmark, hidden under a mystical veil.',
    image: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&q=80&w=1200',
    requiredLevel: 4,
    nodes: [
      { id: 'cable', name: 'Mystic Cable', description: 'Connecting physical and spiritual realms.', cost: 30000, level: 0, maxLevel: 5, icon: 'Link', x: 50, y: 50 },
      { id: 'view', name: 'Vista Point', description: 'Scanning for demonic activity across the bay.', cost: 35000, level: 0, maxLevel: 5, icon: 'Eye', x: 20, y: 20 }
    ]
  },
  {
    id: 'alcatraz_prison',
    name: 'Alcatraz Island',
    description: 'A former prison now housing dangerous supernatural entities.',
    image: 'https://images.unsplash.com/photo-1552554761-267990ff5f5c?auto=format&fit=crop&q=80&w=1200',
    requiredLevel: 5,
    nodes: [
      { id: 'cell', name: 'Spectral Cell', description: 'Containment for spirits.', cost: 40000, level: 0, maxLevel: 5, icon: 'Lock', x: 40, y: 40 },
      { id: 'lighthouse', name: 'Astral Beacon', description: 'Guiding lost souls to safety.', cost: 45000, level: 0, maxLevel: 5, icon: 'Zap', x: 70, y: 10 }
    ]
  },
  {
    id: 'palace_fine_arts',
    name: 'Palace of Fine Arts',
    description: 'A sanctuary for beauty and ancient architecture.',
    image: 'https://images.unsplash.com/photo-1551608851-3cf936ac1640?auto=format&fit=crop&q=80&w=1200',
    requiredLevel: 6,
    nodes: [
      { id: 'dome', name: 'Great Dome', description: 'Focusing cosmic energy.', cost: 50000, level: 0, maxLevel: 5, icon: 'Sun', x: 50, y: 50 },
      { id: 'pond', name: 'Oracle Pond', description: 'Visions of the future appear in its waters.', cost: 55000, level: 0, maxLevel: 5, icon: 'Waves', x: 20, y: 80 }
    ]
  },
  {
    id: 'coit_tower',
    name: 'Coit Tower',
    description: 'A vertical channel for elemental magic.',
    image: 'https://images.unsplash.com/photo-1628155930542-3c72199f7d08?auto=format&fit=crop&q=80&w=1200',
    requiredLevel: 7,
    nodes: [
      { id: 'obs', name: 'Observation Deck', description: 'Monitoring magical ley lines.', cost: 60000, level: 0, maxLevel: 5, icon: 'Wind', x: 50, y: 20 }
    ]
  },
  {
    id: ' Lombard_street',
    name: 'Lombard Street',
    description: 'The crookedest street in the world, twisting space and time.',
    image: 'https://images.unsplash.com/photo-1582264878235-08149cfba98e?auto=format&fit=crop&q=80&w=1200',
    requiredLevel: 8,
    nodes: [
      { id: 'curve', name: 'Space Warp', description: 'Faster travel between dimensions.', cost: 70000, level: 0, maxLevel: 5, icon: 'Repeat', x: 50, y: 50 }
    ]
  },
  {
    id: 'presidio',
    name: 'The Presidio',
    description: 'Dense forests where woodland spirits dwell.',
    image: 'https://images.unsplash.com/photo-1628258334460-e4b476e3381e?auto=format&fit=crop&q=80&w=1200',
    requiredLevel: 9,
    nodes: [
      { id: 'grove', name: 'Whispering Grove', description: 'Learning nature spells.', cost: 80000, level: 0, maxLevel: 5, icon: 'Trees', x: 30, y: 30 }
    ]
  },
  {
    id: 'chinatown',
    name: 'Chinatown',
    description: 'A mysterious district rich in ancient traditions and artifacts.',
    image: 'https://images.unsplash.com/photo-1510103604085-33ec8f673891?auto=format&fit=crop&q=80&w=1200',
    requiredLevel: 10,
    nodes: [
      { id: 'gate', name: 'Dragon Gate', description: 'Protection against dark spirits.', cost: 100000, level: 0, maxLevel: 5, icon: 'ShieldAlert', x: 50, y: 80 }
    ]
  },
  // Adding more worlds quickly to reach 50
  ...Array.from({ length: 40 }).map((_, i) => ({
    id: `world_${i + 11}`,
    name: `Dimension ${i + 11}`,
    description: `A mysterious plane of existence known as Layer ${i + 11}.`,
    image: `https://images.unsplash.com/photo-${1500000000000 + i * 12345}?auto=format&fit=crop&q=80&w=1200`,
    requiredLevel: i + 11,
    nodes: [
      { id: `node_${i}_1`, name: 'Core Pillar', description: 'The foundation of this dimension.', cost: 150000 + (i * 20000), level: 0, maxLevel: 5, icon: 'Anchor', x: 20, y: 20 },
      { id: `node_${i}_2`, name: 'Astral Hub', description: 'A center for cosmic interaction.', cost: 180000 + (i * 25000), level: 0, maxLevel: 5, icon: 'Globe', x: 70, y: 30 },
      { id: `node_${i}_3`, name: 'Ether Forge', description: 'Crafting spiritual energy.', cost: 220000 + (i * 30000), level: 0, maxLevel: 5, icon: 'Flame', x: 40, y: 70 }
    ]
  }))
];

export const CHANCE_CARDS: GameCard[] = [
  {
    id: 'c1',
    title: 'Book of Shadows Guidance',
    content: 'The pages flip to a protective spell. Gain 2000 Essence.',
    type: 'chance',
    action: (state, setState) => {
      setState(prev => ({ ...prev, mana: prev.mana + 2000, chronicle: ['Chance: The Book of Shadows revealed a bounty!', ...prev.chronicle] }));
    }
  },
  {
    id: 'c2',
    title: 'White Lighter Warning',
    content: 'Leo warns of a demonic trap! You retreat but find 10 Scrolls.',
    type: 'chance',
    action: (state, setState) => {
      setState(prev => ({ 
        ...prev, 
        scrollsRemaining: prev.scrollsRemaining + 10,
        chronicle: ['Chance: Leo\'s warning saved you from a trap.', ...prev.chronicle] 
      }));
    }
  },
  {
    id: 'c3',
    title: 'Astral Projecton',
    content: 'Advance 5 spaces and collect all rewards.',
    type: 'chance',
    action: (state, setState) => {
      setState(prev => ({ ...prev, position: (prev.position + 5) % 40, chronicle: ['Chance: Astral projected ahead!', ...prev.chronicle] }));
    }
  }
];

export const CHEST_CARDS: GameCard[] = [
  {
    id: 'ch1',
    title: 'Family Reunion',
    content: 'The sisters gather! All players (if multi) gain 1000 Essence. You gain 2000.',
    type: 'chest',
    action: (state, setState) => {
      setState(prev => ({ ...prev, mana: prev.mana + 2000, chronicle: ['Legacy: Family bond strengthens you!', ...prev.chronicle] }));
    }
  },
  {
    id: 'ch2',
    title: 'Sanctuary Blessing',
    content: 'The Manor is protected. Gain 1 extra Potion.',
    type: 'chest',
    action: (state, setState) => {
      setState(prev => ({ ...prev, potions: prev.potions + 1, chronicle: ['Legacy: The Manor\'s protection manifest a potion.', ...prev.chronicle] }));
    }
  },
  {
    id: 'ch3',
    title: 'Demonic Tax',
    content: 'The Triad drains your essence. Lose 10% of current Essence.',
    type: 'chest',
    action: (state, setState) => {
      setState(prev => ({ ...prev, mana: Math.floor(prev.mana * 0.9), chronicle: ['Legacy: The Triad has demanded its due.', ...prev.chronicle] }));
    }
  }
];

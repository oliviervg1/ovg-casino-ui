import { ThemeType } from '../App';

export interface GameDefinition {
  id: string;
  name: string;
  type: 'roulette' | 'slots' | 'bingo';
  theme: ThemeType;
  description: string;
}

export const GAME_REGISTRY: GameDefinition[] = [
  // Sweets
  { id: 'sugar-spin', name: 'Sugar Spin', type: 'roulette', theme: 'sweets', description: 'Spin the sweet wheel!' },
  { id: 'candy-crushers', name: 'Candy Crushers', type: 'slots', theme: 'sweets', description: 'Match candy symbols!' },
  { id: 'sweet-line', name: 'Sweet Line', type: 'bingo', theme: 'sweets', description: 'Play sweet bingo!' },
  
  // Egypt
  { id: 'pharaohs-wheel', name: "Pharaoh's Wheel", type: 'roulette', theme: 'egypt', description: 'Spin the ancient wheel!' },
  { id: 'tomb-of-treasures', name: 'Tomb of Treasures', type: 'slots', theme: 'egypt', description: 'Match pharaoh motifs!' },
  { id: 'scarab-sweep', name: 'Scarab Sweep', type: 'bingo', theme: 'egypt', description: 'Play scarab bingo!' },
  
  // Space
  { id: 'cosmic-spin', name: 'Cosmic Spin', type: 'roulette', theme: 'space', description: 'Spin the neon wheel!' },
  { id: 'galactic-jackpots', name: 'Galactic Jackpots', type: 'slots', theme: 'space', description: 'Match holograms!' },
  { id: 'nebula-numbers', name: 'Nebula Numbers', type: 'bingo', theme: 'space', description: 'Play glowing bingo!' },
  
  // West
  { id: 'saloon-spin', name: 'Saloon Spin', type: 'roulette', theme: 'west', description: 'Spin the wagon wheel!' },
  { id: 'wild-west-wins', name: 'Wild West Wins', type: 'slots', theme: 'west', description: 'Match saloon symbols!' },
  { id: 'cowboy-cards', name: 'Cowboy Cards', type: 'bingo', theme: 'west', description: 'Play wanted bingo!' },
  
  // Ocean
  { id: 'deep-sea-spin', name: 'Deep Sea Spin', type: 'roulette', theme: 'ocean', description: 'Spin the shell wheel!' },
  { id: 'coral-cash', name: 'Coral Cash', type: 'slots', theme: 'ocean', description: 'Match coral reefs!' },
  { id: 'pearl-pop', name: 'Pearl Pop', type: 'bingo', theme: 'ocean', description: 'Play pearl bingo!' },
  
  // Jungle
  { id: 'aztec-wheel', name: 'Aztec Wheel', type: 'roulette', theme: 'jungle', description: 'Spin the stone wheel!' },
  { id: 'temple-treasures', name: 'Temple Treasures', type: 'slots', theme: 'jungle', description: 'Match stone idols!' },
  { id: 'jungle-jackpot', name: 'Jungle Jackpot', type: 'bingo', theme: 'jungle', description: 'Play carved bingo!' },
  
  // Vampire
  { id: 'blood-moon-spin', name: 'Blood Moon Spin', type: 'roulette', theme: 'vampire', description: 'Spin the red wheel!' },
  { id: 'draculas-fortune', name: "Dracula's Fortune", type: 'slots', theme: 'vampire', description: 'Match coffin symbols!' },
  { id: 'nightfall-numbers', name: 'Nightfall Numbers', type: 'bingo', theme: 'vampire', description: 'Play blood bingo!' },
  
  // Ninja
  { id: 'shuriken-spin', name: 'Shuriken Spin', type: 'roulette', theme: 'ninja', description: 'Spin the shuriken!' },
  { id: 'shadow-slots', name: 'Shadow Slots', type: 'slots', theme: 'ninja', description: 'Match pagodas!' },
  { id: 'dojo-daubers', name: 'Dojo Daubers', type: 'bingo', theme: 'ninja', description: 'Play scroll bingo!' },
];

export function getGameById(id: string): GameDefinition | undefined {
  return GAME_REGISTRY.find(g => g.id === id);
}

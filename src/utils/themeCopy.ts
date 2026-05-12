import type { ThemeType } from './themeManifesto';

export interface CelebrationCopy {
  small: string;
  jackpotLabel: string;
  loss: string;
}

export const themeCopy: Record<ThemeType, CelebrationCopy> = {
  sweets:  { small: 'Sweet match!',     jackpotLabel: 'CANDY JACKPOT!',     loss: 'Empty wrapper.' },
  egypt:   { small: 'Pharaoh smiles.',  jackpotLabel: "PHARAOH'S BOUNTY!",  loss: "Tomb's silence." },
  space:   { small: 'Stars align!',     jackpotLabel: 'COSMIC JACKPOT!',    loss: 'Stars misaligned.' },
  west:    { small: 'Yeehaw!',          jackpotLabel: 'YEEHAW JACKPOT!',    loss: 'Tumbleweed rolls.' },
  ocean:   { small: 'Tide rises!',      jackpotLabel: 'TREASURE JACKPOT!',  loss: 'Empty net.' },
  jungle:  { small: 'Jungle calls!',    jackpotLabel: 'JUNGLE JACKPOT!',    loss: 'Silence in the canopy.' },
  vampire: { small: 'Blood pact.',      jackpotLabel: 'CURSED FORTUNE!',    loss: 'The night is empty.' },
  ninja:   { small: 'Honor rewarded.',  jackpotLabel: 'SHOGUN JACKPOT!',    loss: 'Patience, grasshopper.' },
};

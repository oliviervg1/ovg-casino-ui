import type { ThemeType } from '../App';

export const lightThemes: ThemeType[] = ['sweets', 'ocean', 'west'];
export const darkThemes: ThemeType[] = ['egypt', 'space', 'jungle', 'vampire', 'ninja'];

export type GlobalTheme = 'light' | 'dark';

export function resolveGlobalTheme(theme: ThemeType | GlobalTheme | undefined): GlobalTheme {
  if (theme === 'light' || theme === 'dark') return theme;
  if (theme && lightThemes.includes(theme)) return 'light';
  return 'dark';
}

export const getThemeStyles = (theme: string) => {
  const styles: Record<string, { font: string, text: string, title: string, message: string, label: string }> = {
    sweets: { font: 'font-sweets', text: 'text-pink-500', title: 'font-sweets tracking-wider text-5xl text-pink-500 drop-shadow-md', message: 'font-sweets tracking-wider text-3xl text-pink-600', label: 'font-sweets text-2xl text-pink-500' },
    egypt: { font: 'font-egypt font-bold', text: 'text-yellow-500', title: 'font-egypt font-bold text-5xl text-yellow-500 drop-shadow-md', message: 'font-egypt font-bold text-3xl text-yellow-400', label: 'font-egypt font-bold text-xl text-yellow-500' },
    space: { font: 'font-space font-bold', text: 'text-indigo-400', title: 'font-space font-bold tracking-widest text-5xl text-indigo-400 drop-shadow-md', message: 'font-space font-bold tracking-widest text-3xl text-indigo-300', label: 'font-space font-bold text-xl text-indigo-400' },
    west: { font: 'font-west', text: 'text-orange-600', title: 'font-west tracking-wider text-5xl text-orange-600 drop-shadow-md', message: 'font-west tracking-wider text-3xl text-orange-500', label: 'font-west text-2xl text-orange-600' },
    ocean: { font: 'font-ocean', text: 'text-blue-600', title: 'font-ocean tracking-wider text-5xl text-blue-600 drop-shadow-md', message: 'font-ocean tracking-wider text-3xl text-blue-500', label: 'font-ocean text-2xl text-blue-600' },
    jungle: { font: 'font-jungle tracking-wider', text: 'text-green-500', title: 'font-jungle tracking-widest text-5xl text-green-500 drop-shadow-md', message: 'font-jungle tracking-widest text-3xl text-green-400', label: 'font-jungle tracking-wider text-2xl text-green-500' },
    vampire: { font: 'font-vampire tracking-wider', text: 'text-red-700', title: 'font-vampire tracking-widest text-5xl text-red-600 drop-shadow-md', message: 'font-vampire tracking-widest text-3xl text-red-500', label: 'font-vampire tracking-wider text-2xl text-red-600' },
    ninja: { font: 'font-ninja', text: 'text-slate-400', title: 'font-ninja tracking-widest text-5xl text-slate-400 drop-shadow-md', message: 'font-ninja tracking-widest text-3xl text-slate-300', label: 'font-ninja text-xl text-slate-400' },
  };
  return styles[theme] || { font: 'font-casino', text: 'text-white', title: 'font-casino text-5xl text-white drop-shadow-md', message: 'font-casino text-3xl text-gray-200', label: 'font-casino text-xl text-white' };
};

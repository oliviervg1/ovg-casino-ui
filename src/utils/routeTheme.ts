import { GAME_REGISTRY } from '../config/games';
import { THEME_NAMES, type ThemeType } from './themeManifesto';

/** The set of values the document's `data-theme` attribute may carry.
 *  Includes every game theme plus the `'lobby'` chrome used on
 *  non-game routes (lobby, profile, FAQ, rules). */
export type RouteTheme = ThemeType | 'lobby';

/** Derive the page's `data-theme` value from the current pathname.
 *  - `/game/<known-id>`   → that game's theme
 *  - `/world/<known-theme>` → that theme
 *  - anything else (lobby, profile, FAQ, rules, unknown ids) → `'lobby'`. */
export function routeToTheme(pathname: string): RouteTheme {
  const gameMatch = pathname.match(/^\/game\/(.+)$/);
  if (gameMatch) {
    const gameDef = GAME_REGISTRY.find(g => g.id === gameMatch[1]);
    if (gameDef) return gameDef.theme;
  }
  const worldMatch = pathname.match(/^\/world\/(.+)$/);
  if (worldMatch && (THEME_NAMES as string[]).includes(worldMatch[1])) {
    return worldMatch[1] as ThemeType;
  }
  return 'lobby';
}

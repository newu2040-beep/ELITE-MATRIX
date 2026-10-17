import React, { createContext, useContext, useEffect, useState } from 'react';

export type PastelPalette =
  | 'titanium'
  | 'blush'
  | 'sage'
  | 'lavender'
  | 'sky'
  | 'dune'
  | 'matcha'
  | 'sorbet'
  | 'lilac'
  | 'glacier'
  | 'champagne'
  | 'sakura'
  | 'obsidian_gold'
  | 'electric_cyan'
  | 'buttercup'
  | 'mint_creme'
  | 'bold_crimson'
  | 'neo_brutalist';
export type ColorMode = 'dark' | 'light';

export interface ThemeConfig {
  id: PastelPalette;
  name: string;
  subtitle: string;
  accentColor: string;
  previewBg: string;
  previewAccent: string;
}

export const PASTEL_THEMES: ThemeConfig[] = [
  {
    id: 'titanium',
    name: 'Space Titanium',
    subtitle: 'Classic Apple Studio Noir',
    accentColor: '#C7F464',
    previewBg: '#1C1C1E',
    previewAccent: '#C7F464',
  },
  {
    id: 'obsidian_gold',
    name: 'Obsidian Gold',
    subtitle: 'Ultra-Luxury 24K Gold & Velvet Noir',
    accentColor: '#F59E0B',
    previewBg: '#141416',
    previewAccent: '#F59E0B',
  },
  {
    id: 'electric_cyan',
    name: 'Neo-Tokyo Cyan',
    subtitle: 'High-Voltage Electric Cyberpunk',
    accentColor: '#00F0FF',
    previewBg: '#0A0E17',
    previewAccent: '#00F0FF',
  },
  {
    id: 'blush',
    name: 'Blush Rose',
    subtitle: 'Soft Rose Quartz & Luminous Tint',
    accentColor: '#FB7185',
    previewBg: '#241A1E',
    previewAccent: '#FB7185',
  },
  {
    id: 'sage',
    name: 'Sage Mint',
    subtitle: 'Calming Eucalyptus & Green Glow',
    accentColor: '#34D399',
    previewBg: '#19221C',
    previewAccent: '#34D399',
  },
  {
    id: 'buttercup',
    name: 'Pastel Buttercup',
    subtitle: 'Warm Custard Cream & Sunny Apricot',
    accentColor: '#FCD34D',
    previewBg: '#231F14',
    previewAccent: '#FCD34D',
  },
  {
    id: 'mint_creme',
    name: 'Pistachio Chiffon',
    subtitle: 'Fresh Mint Leaf & Matcha Glow',
    accentColor: '#6EE7B7',
    previewBg: '#13221C',
    previewAccent: '#6EE7B7',
  },
  {
    id: 'bold_crimson',
    name: 'Cyber Crimson',
    subtitle: 'High Contrast Carbon & Ruby Glow',
    accentColor: '#FF1E56',
    previewBg: '#180D11',
    previewAccent: '#FF1E56',
  },
  {
    id: 'neo_brutalist',
    name: 'Neo Brutalist',
    subtitle: 'Vivid Acid Lime & Stark Ink Noir',
    accentColor: '#D4FF00',
    previewBg: '#0D0D0D',
    previewAccent: '#D4FF00',
  },
  {
    id: 'lavender',
    name: 'Lavender Mist',
    subtitle: 'Soothing Wisteria & Lilac Frost',
    accentColor: '#A78BFA',
    previewBg: '#1F1B2A',
    previewAccent: '#A78BFA',
  },
  {
    id: 'sky',
    name: 'Powder Sky',
    subtitle: 'Glacial Blue & Frozen Horizon',
    accentColor: '#38BDF8',
    previewBg: '#18212C',
    previewAccent: '#38BDF8',
  },
  {
    id: 'dune',
    name: 'Dune Almond',
    subtitle: 'Warm Travertine & Desert Gold',
    accentColor: '#FBBF24',
    previewBg: '#26201B',
    previewAccent: '#FBBF24',
  },
  {
    id: 'matcha',
    name: 'Matcha Zen',
    subtitle: 'Japanese Ceremonial Green',
    accentColor: '#84CC16',
    previewBg: '#1C2114',
    previewAccent: '#84CC16',
  },
  {
    id: 'sorbet',
    name: 'Peach Sorbet',
    subtitle: 'Warm Pastel Sunset Coral',
    accentColor: '#FB923C',
    previewBg: '#261C18',
    previewAccent: '#FB923C',
  },
  {
    id: 'lilac',
    name: 'Cosmic Lilac',
    subtitle: 'Iridescent Violet Bloom',
    accentColor: '#C084FC',
    previewBg: '#21182B',
    previewAccent: '#C084FC',
  },
  {
    id: 'glacier',
    name: 'Glacier Cyan',
    subtitle: 'Arctic Teal & Diamond Ice',
    accentColor: '#2DD4BF',
    previewBg: '#142223',
    previewAccent: '#2DD4BF',
  },
  {
    id: 'champagne',
    name: 'Champagne Gold',
    subtitle: 'Luxury Editorial Platinum',
    accentColor: '#E2E8F0',
    previewBg: '#1E1E22',
    previewAccent: '#F1F5F9',
  },
  {
    id: 'sakura',
    name: 'Sakura Petal',
    subtitle: 'Tokyo Cherry Blossom Soft Pink',
    accentColor: '#F472B6',
    previewBg: '#261A22',
    previewAccent: '#F472B6',
  },
];

interface ThemeContextType {
  theme: ColorMode; // 'dark' | 'light'
  palette: PastelPalette;
  activeThemeConfig: ThemeConfig;
  toggleTheme: () => void;
  setColorMode: (m: ColorMode) => void;
  setPalette: (p: PastelPalette) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_MODE_KEY = 'elitematrix_mode_v2';
const THEME_PALETTE_KEY = 'elitematrix_palette_v2';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ColorMode>(() => {
    const saved = localStorage.getItem(THEME_MODE_KEY);
    return saved === 'light' ? 'light' : 'dark';
  });

  const [palette, setPaletteState] = useState<PastelPalette>(() => {
    const saved = localStorage.getItem(THEME_PALETTE_KEY) as PastelPalette;
    return PASTEL_THEMES.some((t) => t.id === saved) ? saved : 'titanium';
  });

  useEffect(() => {
    localStorage.setItem(THEME_MODE_KEY, theme);
    localStorage.setItem(THEME_PALETTE_KEY, palette);

    const root = document.documentElement;

    // Remove all previous theme classes
    root.classList.remove('dark', 'theme-light');
    PASTEL_THEMES.forEach((t) => root.classList.remove(`palette-${t.id}`));

    // Apply color mode
    if (theme === 'light') {
      root.classList.add('theme-light');
    } else {
      root.classList.add('dark');
    }

    // Apply palette class
    root.classList.add(`palette-${palette}`);
    root.setAttribute('data-palette', palette);
    root.setAttribute('data-theme', theme);
  }, [theme, palette]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setColorMode = (m: ColorMode) => setThemeState(m);
  const setPalette = (p: PastelPalette) => setPaletteState(p);

  const activeThemeConfig = PASTEL_THEMES.find((t) => t.id === palette) || PASTEL_THEMES[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        palette,
        activeThemeConfig,
        toggleTheme,
        setColorMode,
        setPalette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

'use client';

import { createTheme } from '@mui/material/styles';

// Minecraft-inspired color palette
const minecraftColors = {
  grass: '#5C8937',
  grassDark: '#3D5A26',
  grassLight: '#7BA651',
  stone: '#7F7F7F',
  stoneDark: '#4C4C4C',
  stoneLight: '#A8A8A8',
  diamond: '#4CC3D9',
  diamondDark: '#2A9FB3',
  diamondLight: '#7FD9E8',
  redstone: '#C93C30',
  redstoneDark: '#A22A1F',
  redstoneLight: '#E84E41',
  gold: '#FCBE4A',
  goldDark: '#E09E2A',
  goldLight: '#FFD873',
  iron: '#D8D8D8',
  emerald: '#17DD62',
  cobblestone: '#828282',
  dirt: '#8B6142',
  wood: '#9C7F4F',
  bedrock: '#545454',
  lava: '#FF6600',
  water: '#3F76E4',
  coal: '#2E2E2E',
  snow: '#FFFAFA',
};

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: minecraftColors.grass,
      dark: minecraftColors.grassDark,
      light: minecraftColors.grassLight,
      contrastText: '#fff',
    },
    secondary: {
      main: minecraftColors.diamond,
      dark: minecraftColors.diamondDark,
      light: minecraftColors.diamondLight,
      contrastText: '#fff',
    },
    error: {
      main: minecraftColors.redstone,
      dark: minecraftColors.redstoneDark,
      light: minecraftColors.redstoneLight,
    },
    warning: {
      main: minecraftColors.gold,
      dark: minecraftColors.goldDark,
      light: minecraftColors.goldLight,
    },
    info: {
      main: minecraftColors.water,
    },
    success: {
      main: minecraftColors.emerald,
    },
    background: {
      default: '#1a1a1a',
      paper: '#2d2d2d',
    },
    text: {
      primary: '#E0E0E0',
      secondary: '#B0B0B0',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
          },
        },
        contained: {
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#2d2d2d',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.05)',
          '&:hover': {
            boxShadow: '0 6px 12px rgba(0,0,0,0.4)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#2d2d2d',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: minecraftColors.stone,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#252525',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

export default theme;

import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    // Primary Agricultural Colors
    primary: '#2E7D32',        // Deep Forest Green - Main brand
    primaryLight: '#4CAF50',   // Vibrant Green - Active states
    primaryDark: '#1B5E20',    // Dark Forest - Headers
    
    // Secondary Earth Tones
    secondary: '#6D4C41',      // Rich Soil Brown
    secondaryLight: '#8D6E63', // Light Earth
    secondaryDark: '#4E342E',  // Dark Earth
    
    // Accent & Highlights
    accent: '#FF9800',         // Sunset Orange - CTAs
    accentLight: '#FFB74D',    // Golden Hour
    accentDark: '#F57C00',     // Deep Orange
    
    // Nature-Inspired Palette
    cropGold: '#FDD835',       // Ripe Wheat
    harvestOrange: '#FF9800',  // Harvest Season
    skyBlue: '#42A5F5',        // Clear Sky
    waterBlue: '#26C6DA',      // Irrigation
    sunYellow: '#FFEB3B',      // Sunshine
    soilBrown: '#795548',      // Fertile Soil
    earthBrown: '#6D4C41',     // Rich Earth
    sunsetOrange: '#FF6F00',   // Sunset
    
    // Functional Colors
    background: '#F1F8F4',     // Soft Green Tint
    surface: '#FFFFFF',        // Pure White Cards
    surfaceVariant: '#E8F5E9', // Light Green Surface
    text: '#1B3A2F',           // Deep Forest Text
    textSecondary: '#546E7A',  // Muted Text
    disabled: '#BDBDBD',
    placeholder: '#90A4AE',
    backdrop: 'rgba(46, 125, 50, 0.5)', // Green Backdrop
    
    // Status Colors
    error: '#D32F2F',          // Alert Red
    success: '#2E7D32',        // Success Green
    warning: '#F57C00',        // Warning Orange
    info: '#1976D2',           // Info Blue
    
    // Gradients (for use in styles)
    gradientGreen: ['#2E7D32', '#4CAF50'],
    gradientEarth: ['#6D4C41', '#8D6E63'],
    gradientSunset: ['#FF9800', '#FFB74D'],
  },
  roundness: 12,              // Smoother corners
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: '#1B3A2F',
  },
  h2: {
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    color: '#1B3A2F',
  },
  h3: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: '#1B3A2F',
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B3A2F',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1B3A2F',
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    color: '#546E7A',
  },
  caption: {
    fontSize: 12,
    color: '#546E7A',
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};


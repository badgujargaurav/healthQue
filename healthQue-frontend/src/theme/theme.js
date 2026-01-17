import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// scale relative to a base design width but clamp to avoid huge sizes on wide screens
const rawScale = width / 390; // base design width
const scale = Math.min(Math.max(rawScale, 0.85), 1.25);

function responsive(size) {
  return Math.round(size * scale);
}

const light = {
  background: '#F7FAFC',
  surface: '#FFFFFF',
  primary: '#0B74FF',
  accent: '#6A5ACD',
  success: '#22C55E',
  danger: '#FF4D4F',
  text: '#0F172A',
  muted: '#6B7280',
  border: '#E6E9EE'
};

const dark = {
  background: '#0B1220',
  surface: '#071028',
  primary: '#1E90FF',
  accent: '#7B61FF',
  success: '#16A34A',
  danger: '#FF6B6B',
  text: '#E6F0FF',
  muted: '#94A3B8',
  border: '#15303f'
};

const spacing = {
  xs: responsive(6),
  sm: responsive(8),
  md: responsive(12),
  lg: responsive(16),
  xl: responsive(24)
};

const typography = {
  h1: responsive(28),
  h2: responsive(22),
  body: responsive(16),
  small: responsive(13)
};

function createTheme(mode = 'light') {
  return {
    colors: mode === 'dark' ? dark : light,
    spacing,
    typography,
    responsive,
    mode
  };
}

export { createTheme };
export default createTheme('light');

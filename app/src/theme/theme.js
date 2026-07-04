export const Colors = {
  // Background colors
  background: '#1A1A1A',
  cardBackground: '#2A2A2A',
  inputBackground: '#333333',
  
  // Primary accent color (matte green)
  primary: '#45B058',
  primaryDark: '#338E46',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textTertiary: '#A0A0A0',
  
  // Status colors
  error: '#FF0000',
  success: '#45B058',
  warning: '#FF9800',
  
  // Border colors
  border: '#444444',
  borderLight: '#555555',
  
  // Navigation
  navBackground: '#000000',
  navActive: '#39FF14',
};

export const Typography = {
  // Font sizes
  fontSize: {
    large: 36,
    title: 28,
    heading: 20,
    body: 16,
    small: 14,
    tiny: 12,
  },
  
  // Font weights
  fontWeight: {
    bold: '700',
    semiBold: '600',
    medium: '500',
    regular: '400',
  },
  
  // Line heights
  lineHeight: {
    tight: 20,
    normal: 24,
    relaxed: 28,
  },
};

export const Spacing = {
  // Padding
  padding: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  
  // Margin
  margin: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  
  // Gap
  gap: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
  },
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 35,
  full: 999,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  button: {
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nav: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
};

export const Theme = {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
};

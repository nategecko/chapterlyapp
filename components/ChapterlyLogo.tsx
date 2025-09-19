import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ChapterlyLogoProps {
  size?: 'small' | 'medium' | 'large';
}

export default function ChapterlyLogo({ size = 'medium' }: ChapterlyLogoProps) {
  const { currentTheme } = useTheme();
  
  return (
    <Text style={[styles.logo, { color: currentTheme.primary, fontSize: sizeMap[size] }]}>
      Chapterly
    </Text>
  );
}

const sizeMap = {
  small: 24,
  medium: 32,
  large: 48,
};

const styles = StyleSheet.create({
  logo: {
    fontFamily: 'Lobster',
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

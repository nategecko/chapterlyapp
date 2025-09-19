import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProfileAvatarProps {
  name: string;
  size?: number;
  fontSize?: number;
}

export default function ProfileAvatar({ name, size = 80, fontSize }: ProfileAvatarProps) {
  // Get first letter of name
  const letter = name.charAt(0).toUpperCase();
  
  // Generate consistent color based on name
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  const backgroundColor = colors[colorIndex];
  
  const calculatedFontSize = fontSize || size * 0.4;
  
  return (
    <View style={[
      styles.container,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor,
      }
    ]}>
      <Text style={[
        styles.letter,
        {
          fontSize: calculatedFontSize,
        }
      ]}>
        {letter}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  letter: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
import React from 'react';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const LIBS = {
  feather: Feather,
  mc: MaterialCommunityIcons,
  ion: Ionicons,
};

export function Icon({ name, lib = 'feather', size = 18, color, style }) {
  const { C } = useTheme();
  const Comp = LIBS[lib] || Feather;

  if (!name) {
    return null;
  }

  return (
    <Comp
      name={name}
      size={size}
      color={color || C.text}
      style={style}
    />
  );
}


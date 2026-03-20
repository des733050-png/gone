import React from 'react';
import { Platform } from 'react-native';
import { HelmetProvider } from 'react-helmet-async';

export function SeoProvider({ children }) {
  if (Platform.OS !== 'web') {
    return children;
  }

  return <HelmetProvider>{children}</HelmetProvider>;
}


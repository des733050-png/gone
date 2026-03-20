import { useWindowDimensions } from 'react-native';

// Simple breakpoint-based responsive helpers shared across screens
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isSmall = width < 640;
  const isMedium = width >= 640 && width < 1024;
  const isLarge = width >= 1024;

  const sidebarDocked = width >= 900;
  const cardColumns = isLarge ? 3 : isMedium ? 2 : 1;

  return {
    width,
    height,
    isSmall,
    isMedium,
    isLarge,
    sidebarDocked,
    cardColumns,
  };
}


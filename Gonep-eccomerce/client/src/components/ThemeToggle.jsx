import { useTheme } from '@/context/ThemeContext';

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button className="theme-toggle" onClick={toggleTheme} title="Toggle dark/light mode">
      {isDark ? '☀️' : '🌙'}
      <span className="d-none d-md-inline">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}

export default ThemeToggle;

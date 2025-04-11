
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { motion } from 'framer-motion';

export const ThemeSwitcher = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="flex items-center gap-2">
      <motion.div whileTap={{ scale: 0.9 }}>
        <Toggle
          pressed={theme === 'dark'}
          onPressedChange={toggleTheme}
          aria-label="Toggle theme"
          className="rounded-full w-10 h-10 p-0 data-[state=on]:bg-muted data-[state=off]:bg-muted/40 flex items-center justify-center"
        >
          {theme === 'dark' ? (
            <Moon className="h-5 w-5 transition-transform hover:rotate-45 duration-500" />
          ) : (
            <Sun className="h-5 w-5 transition-transform hover:rotate-45 duration-500" />
          )}
          <span className="sr-only">{theme === 'dark' ? 'Dark' : 'Light'} mode</span>
        </Toggle>
      </motion.div>
    </div>
  );
};

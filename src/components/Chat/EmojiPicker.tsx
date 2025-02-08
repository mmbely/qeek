import React from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { theme, commonStyles, typography, layout, animations } from '../../styles';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: any) => void;
  theme?: 'light' | 'dark';
}

// Define the emoji data structure
interface EmojiData {
  id: string;
  name: string;
  native: string;
  unified: string;
  keywords: string[];
  shortcodes: string;
  emoticon?: string;
}

export default function EmojiPicker({ onEmojiSelect, theme = 'light' }: EmojiPickerProps) {
  const customPickerStyles = {
    '--em-rgb-background': theme === 'dark' ? '30, 33, 50' : '255, 255, 255',
    '--em-rgb-input': theme === 'dark' ? '43, 47, 68' : '247, 248, 249',
    '--em-rgb-color': theme === 'dark' ? '243, 244, 246' : '17, 24, 39',
    '--em-color-border': theme === 'dark' ? '#374151' : '#e5e7eb',
  } as React.CSSProperties;

  return (
    <div className={`
      ${animations.transition.normal}
      ${animations.fade.enter}
      rounded-xl overflow-hidden
      shadow-lg
      border border-gray-200 dark:border-gray-700
    `}>
      <Picker
        data={data}
        onEmojiSelect={onEmojiSelect}
        theme={theme}
        previewPosition="none"
        skinTonePosition="none"
        searchPosition="sticky"
        navPosition="bottom"
        perLine={8}
        style={customPickerStyles}
      />
    </div>
  );
}

// Add these styles to your global CSS or theme
const globalStyles = `
  .em-emoji-picker {
    --color-border: var(--em-color-border) !important;
    border: none !important;
    font-family: inherit !important;
  }

  .em-emoji-picker .em-search-container {
    padding: 0.75rem !important;
  }

  .em-emoji-picker input.em-search {
    border-radius: 0.75rem !important;
    padding: 0.75rem 1rem !important;
    font-size: 0.875rem !important;
  }

  .em-emoji-picker .em-category-label {
    font-size: 0.875rem !important;
    font-weight: 500 !important;
    padding: 0.5rem 0.75rem !important;
  }

  .em-emoji-picker .em-emoji-category {
    padding: 0.5rem !important;
  }

  .em-emoji-picker .em-emoji {
    width: 2rem !important;
    height: 2rem !important;
    border-radius: 0.5rem !important;
  }

  .em-emoji-picker .em-emoji:hover {
    background-color: rgba(var(--em-rgb-input), 0.5) !important;
  }

  .em-emoji-picker .em-nav {
    padding: 0.5rem !important;
  }

  .em-emoji-picker .em-nav button {
    border-radius: 0.5rem !important;
    padding: 0.5rem !important;
  }

  .dark .em-emoji-picker {
    --color-border: var(--em-color-border) !important;
  }
`;
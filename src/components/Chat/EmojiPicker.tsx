import React, { useEffect } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: EmojiData) => void;
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

export default function EmojiPicker({ onEmojiSelect, theme = 'dark' }: EmojiPickerProps) {
  useEffect(() => {
    console.log('EmojiPicker mounted');
    return () => console.log('EmojiPicker unmounted');
  }, []);

  try {
    return (
      <div className="absolute bottom-full mb-2 left-0 z-50">
        <Picker
          data={data}
          onEmojiSelect={(emoji: EmojiData) => {
            console.log('EmojiPicker - emoji selected:', emoji);
            onEmojiSelect(emoji);
          }}
          theme={theme}
        />
      </div>
    );
  } catch (error) {
    console.error('Error rendering EmojiPicker:', error);
    return <div>Error loading emoji picker</div>;
  }
}
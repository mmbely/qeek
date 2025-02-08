import React, { useState } from 'react';
import { Send, Smile } from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import { theme, commonStyles, typography, layout, animations } from '../../styles';

interface MessageInputProps {
  message: string;
  setMessage: (message: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  className?: string;
}

// Import or define the EmojiData interface
interface EmojiData {
  id: string;
  name: string;
  native: string;
  unified: string;
  keywords: string[];
  shortcodes: string;
  emoticon?: string;
}

export default function MessageInput({ 
  message, 
  setMessage, 
  handleSendMessage,
  className = ''
}: MessageInputProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleEmojiSelect = (emoji: EmojiData) => {
    console.log('MessageInput - handling emoji:', emoji);
    setMessage(message + emoji.native);
    setShowEmojiPicker(false);
  };

  return (
    <div className={className}>
      <div className="relative">
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className={`
            absolute bottom-full right-0 mb-2
            ${animations.transition.normal}
          `}>
            <EmojiPicker 
              onEmojiSelect={handleEmojiSelect}
              theme="dark"
            />
          </div>
        )}

        {/* Message Form */}
        <form 
          onSubmit={handleSendMessage}
          className={layout.flex.between}
        >
          <div className={`
            relative flex-1 mr-3
            ${animations.transition.normal}
          `}>
            {/* Emoji Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`
                ${commonStyles.button.base}
                ${commonStyles.button.secondary}
                !p-2 absolute left-2 top-1/2 -translate-y-1/2
                rounded-full
              `}
            >
              <Smile className={`
                w-5 h-5
                ${showEmojiPicker 
                  ? 'text-blue-500 dark:text-blue-400' 
                  : 'text-gray-400 dark:text-gray-500'
                }
              `} />
            </button>

            {/* Message Input */}
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className={`
                ${commonStyles.input}
                pl-12 pr-4 py-3
                text-base
              `}
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!message.trim()}
            className={`
              ${commonStyles.button.base}
              ${commonStyles.button.primary}
              !p-3
              disabled:opacity-50 disabled:cursor-not-allowed
              ${animations.transition.normal}
            `}
          >
            <Send className={`
              w-5 h-5
              ${message.trim() 
                ? 'text-white' 
                : 'text-gray-300 dark:text-gray-600'
              }
            `} />
          </button>
        </form>
      </div>
    </div>
  );
}
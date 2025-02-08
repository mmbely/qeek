import React, { useState } from 'react';
import { Send, Smile } from 'lucide-react';
import EmojiPicker from './EmojiPicker';

interface MessageInputProps {
  message: string;
  setMessage: (message: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
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

export default function MessageInput({ message, setMessage, handleSendMessage }: MessageInputProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleEmojiSelect = (emoji: EmojiData) => {
    console.log('MessageInput - handling emoji:', emoji);
    setMessage(message + emoji.native);
    setShowEmojiPicker(false);
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
      <div className="relative">
        {showEmojiPicker && (
          <EmojiPicker 
            onEmojiSelect={handleEmojiSelect}
            theme="dark"
          />
        )}
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <div className="relative flex-1 flex items-center">
            <button
              type="button"
              onClick={() => {
                console.log('Toggling emoji picker');
                setShowEmojiPicker(!showEmojiPicker);
              }}
              className="absolute left-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Smile className="h-5 w-5" />
            </button>
            
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 pl-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
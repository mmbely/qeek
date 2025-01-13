import React, { useState } from 'react';
import SlackInterface from './SlackInterface';
import SlackInterfaceV2 from './SlackInterfaceV2';

const SlackInterfaceSwitcher: React.FC = () => {
  const [isV1, setIsV1] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsV1(!isV1)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors"
        title="Switch Interface"
      >
        {isV1 ? 'V2' : 'V1'}
      </button>
      {isV1 ? <SlackInterfaceV2 /> : <SlackInterface />}
    </div>
  );
};

export default SlackInterfaceSwitcher;

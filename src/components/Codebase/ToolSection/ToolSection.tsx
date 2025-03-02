import { useState } from 'react';
import { Code2, FileCode, Component, ScrollText, Settings } from 'lucide-react';
import CodebaseSummaryTool from './CodebaseSummaryTool';
import ComponentMetadataTool from './ComponentMetadataTool';
import RulesGenerationTool from './RulesGenerationTool';
import SettingsGenerationTool from './SettingsGenerationTool';
import { useTheme } from '../../../context/ThemeContext';
import { RepositoryFile } from '../../../types/repository';

interface ToolSectionProps {
  files: RepositoryFile[];
}

const ToolSection = ({ files }: ToolSectionProps) => {
  const [activeTool, setActiveTool] = useState<'summary' | 'metadata' | 'rules' | 'settings'>('summary');
  const { isDarkMode } = useTheme();

  const tools = [
    { id: 'summary', label: 'Codebase Summary', icon: FileCode },
    { id: 'metadata', label: 'Component Metadata', icon: Component },
    { id: 'rules', label: 'Rules Generation', icon: ScrollText },
    { id: 'settings', label: 'Settings Generation', icon: Settings },
  ];

  return (
    <div className="flex h-full">
      {/* Left Side Navigation */}
      <div className="w-64 bg-[#1e2132] min-h-screen">
        {/* Title Section */}
        <div className="px-4 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-200">Tools</h2>
          </div>
        </div>
        
        {/* Navigation Items */}
        <nav className="px-2 py-2">
          {tools.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTool(id as typeof activeTool)}
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md
                transition-colors duration-200
                ${activeTool === id 
                  ? 'bg-[#2b2f44] text-gray-200'
                  : 'text-gray-400 hover:bg-[#2b2f44] hover:text-gray-200'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50 dark:bg-[#171923] p-6">
        {activeTool === 'summary' && <CodebaseSummaryTool files={files} />}
        {activeTool === 'metadata' && <ComponentMetadataTool files={files} />}
        {activeTool === 'rules' && <RulesGenerationTool files={files} />}
        {activeTool === 'settings' && <SettingsGenerationTool files={files} />}
      </div>
    </div>
  );
};

export default ToolSection;
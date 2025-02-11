import React, { createContext, useContext, useState } from 'react';

interface CodebaseContextType {
  selectedRepository: string | null;
  setSelectedRepository: (repo: string | null) => void;
}

const CodebaseContext = createContext<CodebaseContextType | undefined>(undefined);

export function CodebaseProvider({ children }: { children: React.ReactNode }) {
  const [selectedRepository, setSelectedRepository] = useState<string | null>(null);

  return (
    <CodebaseContext.Provider value={{ selectedRepository, setSelectedRepository }}>
      {children}
    </CodebaseContext.Provider>
  );
}

export function useCodebase() {
  const context = useContext(CodebaseContext);
  if (context === undefined) {
    throw new Error('useCodebase must be used within a CodebaseProvider');
  }
  return context;
}
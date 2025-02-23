import CodebaseSummaryTool from './CodebaseSummaryTool';
import ComponentMetadataTool from './ComponentMetadataTool';
import RulesGenerationTool from './RulesGenerationTool';
import SettingsGenerationTool from './SettingsGenerationTool';

const ToolSection = ({ files }: { files: string[] }) => {
  return (
    <div className="space-y-8">
      <CodebaseSummaryTool files={files} />
      <ComponentMetadataTool />
      <RulesGenerationTool />
      <SettingsGenerationTool />
    </div>
  );
};

export default ToolSection;
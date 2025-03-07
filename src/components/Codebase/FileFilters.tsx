import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { FileStatus } from '../../types/repository';

interface FileFiltersProps {
  searchTerm: string;
  filterStatus: FileStatus;
  filterLanguage: string;
  filterComponent: string;
  components: { component: string; count: number }[];
  onSearchChange: (value: string) => void;
  onFilterChange: (key: 'status' | 'language' | 'component', value: string) => void;
}

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'modified', label: 'Modified' },
  { value: 'unchanged', label: 'Unchanged' },
  { value: 'active', label: 'Active (Legacy)' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'unknown', label: 'Unknown' }
];

export default function FileFilters({
  searchTerm,
  filterStatus,
  filterLanguage,
  filterComponent,
  components,
  onSearchChange,
  onFilterChange,
}: FileFiltersProps) {
  return (
    <div className="p-6">
      <div className="mb-6 flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
            <Input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700 placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
          </div>
        </div>
        <Select value={filterStatus} onValueChange={(value: string) => onFilterChange('status', value)}>
          <SelectTrigger className="w-[200px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterLanguage} onValueChange={(value: string) => onFilterChange('language', value)}>
          <SelectTrigger className="w-[200px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            <SelectItem value="tsx">TypeScript (TSX)</SelectItem>
            <SelectItem value="jsx">JavaScript (JSX)</SelectItem>
            <SelectItem value="py">Python</SelectItem>
            <SelectItem value="css">CSS</SelectItem>
            <SelectItem value="html">HTML</SelectItem>
            <SelectItem value="md">Markdown</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterComponent} onValueChange={(value: string) => onFilterChange('component', value)}>
          <SelectTrigger className="w-[200px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700">
            <SelectValue placeholder="Select component" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Components</SelectItem>
            {components.map(({ component, count }) => (
              <SelectItem key={component} value={component}>
                {component} <span className="text-gray-500 dark:text-gray-400 ml-2">({count})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
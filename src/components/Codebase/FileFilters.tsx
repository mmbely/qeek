import { TextField, InputAdornment, FormControl, Select, MenuItem, ListSubheader } from '@mui/material';
import { Search } from 'lucide-react';
import { FileStatus } from '../../types/repository';

interface FileFiltersProps {
  searchTerm: string;
  filterStatus: FileStatus;
  filterLanguage: string;
  filterComponent: string;
  components: { component: string; count: number }[];
  onSearchChange: (value: string) => void;
  onFilterChange: (key: string, value: string) => void;
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
          <TextField
            fullWidth
            size="small"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="dark:bg-gray-800"
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
              },
              '& .MuiInputBase-input': {
                color: 'inherit',
              },
            }}
            InputProps={{
              className: 'dark:text-white',
              startAdornment: (
                <InputAdornment position="start">
                  <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </InputAdornment>
              ),
            }}
          />
        </div>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={filterStatus}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="dark:bg-gray-800 dark:text-white"
            MenuProps={{
              PaperProps: {
                className: 'dark:bg-gray-800',
                sx: {
                  '& .MuiMenuItem-root': {
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    },
                  },
                  '& .MuiListSubheader-root': {
                    lineHeight: '32px',
                  },
                },
              },
            }}
            sx={{
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.1)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.2)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            {statusOptions.map(({ value, label }) => (
              <MenuItem key={value} value={value} className="dark:text-gray-200">
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={filterLanguage}
            onChange={(e) => onFilterChange('language', e.target.value)}
            className="dark:bg-gray-800 dark:text-white"
            MenuProps={{
              PaperProps: {
                className: 'dark:bg-gray-800',
                sx: {
                  '& .MuiMenuItem-root': {
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    },
                  },
                  '& .MuiListSubheader-root': {
                    lineHeight: '32px',
                  },
                },
              },
            }}
            sx={{
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.1)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.2)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <MenuItem value="all" className="dark:text-gray-200">All Languages</MenuItem>
            <MenuItem value="tsx" className="dark:text-gray-200">TypeScript (TSX)</MenuItem>
            <MenuItem value="jsx" className="dark:text-gray-200">JavaScript (JSX)</MenuItem>
            <MenuItem value="py" className="dark:text-gray-200">Python</MenuItem>
            <MenuItem value="css" className="dark:text-gray-200">CSS</MenuItem>
            <MenuItem value="html" className="dark:text-gray-200">HTML</MenuItem>
            <MenuItem value="md" className="dark:text-gray-200">Markdown</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={filterComponent}
            onChange={(e) => onFilterChange('component', e.target.value)}
            className="dark:bg-gray-800 dark:text-white"
            MenuProps={{
              PaperProps: {
                className: 'dark:bg-gray-800',
                sx: {
                  '& .MuiMenuItem-root': {
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    },
                  },
                  '& .MuiListSubheader-root': {
                    lineHeight: '32px',
                  },
                },
              },
            }}
            sx={{
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.1)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.2)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <MenuItem value="all" className="dark:text-gray-200">All Components</MenuItem>
            {components.map(({ component, count }) => (
              <MenuItem key={component} value={component} className="dark:text-gray-200">
                {component} <span className="text-gray-400 ml-2">({count})</span>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
    </div>
  );
}
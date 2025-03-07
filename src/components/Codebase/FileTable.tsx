import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { RepositoryFile, SortColumn, SortDirection } from '../../types/repository';
import { formatFileSize } from '../../utils/format';
import FileIcon from './components/FileIcon';
import ExpandableCell from './components/ExpandableCell';

interface FileTableProps {
  files: RepositoryFile[];
  page: number;
  rowsPerPage: number;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onSort: (column: SortColumn) => void;
  onFileSelect: (file: RepositoryFile) => void;
}

// Helper function to get status styling
const getStatusStyle = (status: string) => {
  switch (status) {
    case 'new':
      return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200';
    case 'modified':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200';
    case 'unchanged':
    case 'active': // Handle legacy 'active' status
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200';
    case 'deleted':
      return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200';
    case 'unknown':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-200';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200';
  }
};

export default function FileTable({
  files,
  page,
  rowsPerPage,
  sortColumn,
  sortDirection,
  onPageChange,
  onRowsPerPageChange,
  onSort,
  onFileSelect,
}: FileTableProps) {
  console.log('Files in FileTable:', files); // Debug log

  return (
    <div className="px-6">
      <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                onClick={() => onSort('path')}
              >
                Path {sortColumn === 'path' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                onClick={() => onSort('language')}
              >
                Language {sortColumn === 'language' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                onClick={() => onSort('size')}
              >
                Size {sortColumn === 'size' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                onClick={() => onSort('last_updated')}
              >
                Last Updated {sortColumn === 'last_updated' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                onClick={() => onSort('status')}
              >
                Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="hover:text-gray-200"
              >
                Summary
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((file) => (
              <TableRow
                key={file.path}
                onClick={() => onFileSelect(file)}
                className="
                  cursor-pointer
                  hover:bg-gray-50 dark:hover:bg-gray-700/50
                  transition-colors duration-150
                  border-b border-gray-200 dark:border-gray-700
                "
              >
                <TableCell className="text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <FileIcon language={file.language} />
                    <span>{file.path}</span>
                  </div>
                </TableCell>
                <TableCell className="text-gray-700 dark:text-gray-300">{file.language}</TableCell>
                <TableCell className="text-gray-700 dark:text-gray-300">{formatFileSize(file.size)}</TableCell>
                <TableCell className="text-gray-500 dark:text-gray-400">{file.last_updated}</TableCell>
                <TableCell className="text-gray-600 dark:text-gray-400 border-b dark:border-gray-600">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(file.status)}`}>
                    {file.status === 'active' ? 'unchanged' : file.status}
                  </span>
                </TableCell>
                <TableCell className="text-gray-600 dark:text-gray-400 border-b dark:border-gray-600">
                  <ExpandableCell text={file.ai_analysis?.summary || 'No summary available'} maxLength={100} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-900 dark:text-gray-100"
            >
              {[10, 25, 50, 100].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
            <span>{`${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, files.length)} of ${files.length}`}</span>
            <div className="flex gap-1">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page === 0}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= Math.ceil(files.length / rowsPerPage) - 1}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
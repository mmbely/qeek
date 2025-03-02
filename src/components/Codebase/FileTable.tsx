import { Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Paper } from '@mui/material';
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
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'modified':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'unchanged':
    case 'active': // Handle legacy 'active' status
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    case 'deleted':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'unknown':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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
      <TableContainer 
        component={Paper} 
        className="bg-white dark:bg-gray-800 shadow-sm"
        sx={{
          backgroundColor: 'inherit',
          '& .MuiPaper-root': {
            backgroundColor: 'inherit',
          },
        }}
      >
        <Table>
          <TableHead>
            <TableRow className="bg-gray-50 dark:bg-gray-700">
              <TableCell
                className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600 cursor-pointer"
                onClick={() => onSort('path')}
              >
                Path {sortColumn === 'path' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell
                className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600 cursor-pointer"
                onClick={() => onSort('language')}
              >
                Language {sortColumn === 'language' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell
                className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600 cursor-pointer"
                onClick={() => onSort('size')}
              >
                Size {sortColumn === 'size' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell
                className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600 cursor-pointer"
                onClick={() => onSort('last_updated')}
              >
                Last Updated {sortColumn === 'last_updated' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell
                className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600 cursor-pointer"
                onClick={() => onSort('status')}
              >
                Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell
                className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600"
              >
                Summary
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody className="dark:bg-gray-800">
            {files.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((file) => (
              <TableRow
                key={file.path}
                onClick={() => onFileSelect(file)}
                className="
                  cursor-pointer
                  hover:bg-gray-50 dark:hover:bg-gray-700
                  transition-colors duration-150
                  border-b dark:border-gray-700
                "
              >
                <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">
                  <div className="flex items-center gap-2">
                    <FileIcon language={file.language} />
                    <span>{file.path}</span>
                  </div>
                </TableCell>
                <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">{file.language}</TableCell>
                <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">{formatFileSize(file.size)}</TableCell>
                <TableCell className="text-gray-600 dark:text-gray-400 border-b dark:border-gray-600">{file.last_updated}</TableCell>
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
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={files.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => onPageChange(newPage)}
          onRowsPerPageChange={(event) => onRowsPerPageChange(parseInt(event.target.value, 10))}
          className="text-gray-900 dark:text-gray-100"
          sx={{
            '.MuiTablePagination-select': {
              color: 'inherit',
            },
            '.MuiTablePagination-selectIcon': {
              color: 'inherit',
            },
            '.MuiTablePagination-displayedRows': {
              color: 'inherit',
            },
            '.MuiIconButton-root': {
              color: 'inherit',
            },
          }}
        />
      </TableContainer>
    </div>
  );
}
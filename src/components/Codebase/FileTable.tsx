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
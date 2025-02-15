import { Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Paper, TextField, InputAdornment, FormControl, Select, MenuItem, ListSubheader } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus } from '../../types/ticket';
import { useAuth } from '../../context/AuthContext';
import { useAccount } from '../../context/AccountContext';
import { Plus, AlertCircle, ArrowRight, Search } from 'lucide-react';
import TicketModal from './TicketModal';
import { theme, commonStyles, typography, layout, animations } from '../../styles';
import { useTickets } from '../../hooks/useTickets';
import { CustomUser } from '../../types/user';
import { subscribeToUsers } from '../../services/chat';

interface TicketListProps {
  showHeader?: boolean;
}

const formatDate = (timestamp: number | undefined) => {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleDateString();
};

export function TicketList({ showHeader = true }: TicketListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | TicketStatus>('all');
  const { getTickets, updateTicket } = useTickets();
  const { user } = useAuth();
  const { currentAccount } = useAccount();
  const [users, setUsers] = useState<{ [key: string]: CustomUser }>({});

  useEffect(() => {
    const fetchTickets = async () => {
      const fetchedTickets = await getTickets();
      console.log('[TicketList] Fetched tickets:', fetchedTickets.length);
      setTickets(fetchedTickets);
    };

    fetchTickets();
  }, [getTickets]);

  useEffect(() => {
    if (!currentAccount?.id) {
      console.log('[TicketList] No current account, skipping users subscription');
      return;
    }

    const memberIds = Object.keys(currentAccount.members);
    console.log('[TicketList] Setting up users subscription for members:', memberIds);
    
    const unsubscribe = subscribeToUsers(
      currentAccount.id,
      memberIds,
      (fetchedUsers: { [key: string]: CustomUser }) => {
        console.log('[TicketList] Received users:', fetchedUsers);
        setUsers(fetchedUsers);
      }
    );

    return () => {
      console.log('[TicketList] Cleaning up users subscription');
      unsubscribe();
    };
  }, [currentAccount]);

  const getAssigneeName = (assigneeId: string | undefined) => {
    if (!assigneeId) return 'Unassigned';
    const user = users[assigneeId];
    return user ? (user.displayName || user.email || 'Unknown User') : 'Loading...';
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = 
      ticket.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && ticket.status === filterStatus;
  });

  const getStatusGroups = () => ({
    'Development Board': [
      'SELECTED_FOR_DEV',
      'IN_PROGRESS',
      'READY_FOR_TESTING',
      'DEPLOYED'
    ],
    'Backlog': [
      'BACKLOG_ICEBOX',
      'BACKLOG_NEW',
      'BACKLOG_REFINED',
      'BACKLOG_DEV_NEXT'
    ]
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {showHeader && (
        <header className="mb-6 px-6 pt-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All Tickets</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage your tickets</p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-150"
            >
              Create Ticket
            </button>
          </div>
        </header>
      )}

      <div className="p-6">
        <div className="mb-6 flex gap-4 items-center">
          <div className="flex-1">
            <TextField
              fullWidth
              size="small"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              onChange={(e) => setFilterStatus(e.target.value as 'all' | TicketStatus)}
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
              <MenuItem value="all" className="dark:text-gray-200">All Status</MenuItem>
              {Object.entries(getStatusGroups()).map(([groupName, statuses]) => [
                <ListSubheader
                  key={groupName}
                  className="dark:bg-gray-700/50 dark:text-gray-100 bg-gray-200 text-gray-700 sticky top-0 z-10 font-medium border-t border-b dark:border-gray-600"
                >
                  {groupName}
                </ListSubheader>,
                ...statuses.map((status) => (
                  <MenuItem 
                    key={status} 
                    value={status}
                    className="dark:text-gray-200 dark:hover:bg-gray-700 dark:bg-gray-800"
                  >
                    {status.split('_').map(word => 
                      word.charAt(0) + word.slice(1).toLowerCase()
                    ).join(' ')}
                  </MenuItem>
                ))
              ])}
            </Select>
          </FormControl>
        </div>

        {filteredTickets.length > 0 ? (
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
                  <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">Status</TableCell>
                  <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">Ticket ID</TableCell>
                  <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">Title</TableCell>
                  <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">Priority</TableCell>
                  <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">Assignee</TableCell>
                  <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">Created</TableCell>
                  <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody className="dark:bg-gray-800">
                {filteredTickets.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="
                      cursor-pointer
                      hover:bg-gray-50 dark:hover:bg-gray-700
                      transition-colors duration-150
                      border-b dark:border-gray-700
                    "
                  >
                    <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">{ticket.status}</TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600 font-medium">{ticket.ticket_id}</TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">{ticket.title}</TableCell>
                    <TableCell className="border-b dark:border-gray-600">
                      <span className={`
                        px-2 py-1 rounded-full text-sm font-medium
                        ${ticket.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : ''}
                        ${ticket.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : ''}
                        ${ticket.priority === 'low' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : ''}
                      `}>
                        {ticket.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100 border-b dark:border-gray-600">{getAssigneeName(ticket.assigneeId)}</TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400 border-b dark:border-gray-600">{formatDate(ticket.createdAt)}</TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400 border-b dark:border-gray-600">{formatDate(ticket.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredTickets.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
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
        ) : (
          <div className={`
            ${layout.flex.center}
            flex-col gap-2 p-6
            text-gray-400 dark:text-[${theme.colors.dark.text.muted}]
          `}>
            <AlertCircle className="w-5 h-5" />
            <p className={typography.small}>No tickets</p>
          </div>
        )}
      </div>

      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onSave={getTickets}
        />
      )}
      <TicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

const getPriorityStyles = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    case 'medium':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
    case 'low':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400';
  }
};

export default TicketList;

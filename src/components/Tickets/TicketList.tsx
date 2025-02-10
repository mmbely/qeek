import { Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Paper, TextField, InputAdornment, FormControl, Select, MenuItem } from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Ticket, TicketStatus } from '../../types/ticket';
import { useAuth } from '../../context/AuthContext';
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
  const { getTickets, updateTicket, generateMissingTicketIds } = useTickets();
  const { user } = useAuth();
  const [users, setUsers] = useState<{ [key: string]: CustomUser }>({});
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Create a query for tickets ordered by createdAt
    const ticketsRef = collection(db, 'tickets');
    const q = query(ticketsRef, orderBy('createdAt', 'desc'));

    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedTickets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ticket[];
      
      console.log('Real-time tickets update:', updatedTickets);
      setTickets(updatedTickets);
    }, (error) => {
      console.error("Error listening to tickets:", error);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Empty dependency array since we want this to run once on mount

  useEffect(() => {
    console.log('Setting up users subscription');
    const unsubscribe = subscribeToUsers((fetchedUsers) => {
      console.log('Received users:', fetchedUsers);
      setUsers(fetchedUsers);
    });

    return () => unsubscribe();
  }, []);

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

  const handleGenerateIds = async () => {
    setIsGenerating(true);
    try {
      const updatedCount = await generateMissingTicketIds();
      console.log(`Updated ${updatedCount} tickets with new IDs`);
      // Refresh the ticket list
      await getTickets();
    } catch (error) {
      console.error('Error generating ticket IDs:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  console.log('Tickets being rendered:', tickets);

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
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
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
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="BACKLOG_ICEBOX">Backlog - Icebox</MenuItem>
              <MenuItem value="BACKLOG_NEW">Backlog - New</MenuItem>
              <MenuItem value="BACKLOG_REFINED">Backlog - Refined</MenuItem>
              <MenuItem value="BACKLOG_DEV_NEXT">Backlog - Dev Next</MenuItem>
              <MenuItem value="SELECTED_FOR_DEV">Selected for Dev</MenuItem>
              <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
              <MenuItem value="READY_FOR_TESTING">Ready for Testing</MenuItem>
              <MenuItem value="DEPLOYED">Deployed</MenuItem>
            </Select>
          </FormControl>
        </div>

        {/* <div className="mb-4 flex justify-end">
          <button
            onClick={handleGenerateIds}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate Missing Ticket IDs'}
          </button>
        </div> */}

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

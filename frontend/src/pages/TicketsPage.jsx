import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTickets } from '../store/slices/ticketSlice';
import TicketCard from '../components/TicketCard';
import TicketForm from '../components/TicketForm';
import { Plus, X, Loader2, Search, ClipboardList } from 'lucide-react';

const STATUS_FILTERS = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function TicketsPage() {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((s) => s.tickets);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchTickets());
    document.title = 'Tickets | Property Ops AI';
  }, [dispatch]);

  const filtered = items.filter((t) => {
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusCounts = STATUS_FILTERS.reduce((acc, s) => {
    acc[s] = s === 'ALL' ? items.length : items.filter((t) => t.status === s).length;
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} ticket{items.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New Ticket'}
        </button>
      </div>

      {/* New ticket form — slides in */}
      {showForm && (
        <div className="card mb-6 animate-fade-in">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Submit a Maintenance Request</h2>
          <TicketForm onClose={() => setShowForm(false)} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="input pl-9 pr-8"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 ${
                statusFilter === s
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s.replace('_', ' ')}
              {statusCounts[s] > 0 && (
                <span className={`text-[10px] font-bold ${statusFilter === s ? 'opacity-75' : 'text-gray-400'}`}>
                  ({statusCounts[s]})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <ClipboardList size={44} strokeWidth={1.5} />
          <div className="text-center">
            <p className="font-medium text-gray-600">
              {search || statusFilter !== 'ALL' ? 'No tickets match your filters' : 'No tickets yet'}
            </p>
            <p className="text-sm mt-1 text-gray-400">
              {search || statusFilter !== 'ALL'
                ? 'Try clearing the search or selecting a different status.'
                : 'Submit your first maintenance request using the button above.'}
            </p>
          </div>
          {(search || statusFilter !== 'ALL') && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('ALL'); }}
              className="btn-secondary text-xs mt-1"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
}

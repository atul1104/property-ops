import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTickets, updateTicket, deleteTicket, retriageTicket } from '../store/slices/ticketSlice';
import { fetchDocuments } from '../store/slices/documentSlice';
import { toast } from 'react-hot-toast';
import DocumentUpload from '../components/DocumentUpload';
import { Loader2, Trash2, RefreshCw, ShieldCheck, FileText, Sparkles } from 'lucide-react';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const statusStyles = {
  OPEN:        'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED:    'bg-green-100 text-green-700',
  CLOSED:      'bg-gray-100 text-gray-600',
};

const priorityStyles = {
  URGENT:   'text-red-600 font-semibold',
  ROUTINE:  'text-amber-600',
  COSMETIC: 'text-teal-600',
};

export default function AdminPage() {
  const dispatch = useDispatch();
  const { items: tickets, loading } = useSelector((s) => s.tickets);
  const [tab, setTab] = useState('tickets');
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    dispatch(fetchTickets());
    dispatch(fetchDocuments());
  }, [dispatch]);

  const handleStatusChange = async (ticket, status) => {
    setUpdating(ticket.id);
    const result = await dispatch(updateTicket({ id: ticket.id, status }));
    setUpdating(null);
    if (updateTicket.fulfilled.match(result)) {
      toast.success(`Ticket status updated to ${status}`);
    } else {
      toast.error(result.payload || 'Update failed');
    }
  };

  const handleRetriage = async (ticket) => {
    setUpdating(ticket.id);
    const result = await dispatch(retriageTicket(ticket.id));
    setUpdating(null);
    if (retriageTicket.fulfilled.match(result)) {
      toast.success(`AI triage complete: ${result.payload.priority} · ${result.payload.aiTag}`);
    } else {
      toast.error(result.payload || 'Re-triage failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this ticket?')) return;
    const result = await dispatch(deleteTicket(id));
    if (deleteTicket.fulfilled.match(result)) {
      toast.success('Ticket deleted');
    } else {
      toast.error(result.payload || 'Delete failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck size={22} className="text-brand-600" />
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { key: 'tickets', label: 'All Tickets', icon: RefreshCw },
          { key: 'documents', label: 'Lease Documents', icon: FileText },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tickets tab */}
      {tab === 'tickets' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 size={28} className="animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Tenant', 'Title', 'Priority', 'AI Tag', 'Status', 'Date', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                        No tickets yet.
                      </td>
                    </tr>
                  ) : (
                    tickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[120px] truncate">
                          {ticket.user?.email || '—'}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px]">
                          <p className="truncate">{ticket.title}</p>
                          <p className="text-xs text-gray-400 truncate">{ticket.description}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={priorityStyles[ticket.priority] || 'text-gray-400'}>
                            {ticket.priority || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{ticket.aiTag || '—'}</td>
                        <td className="px-4 py-3">
                          {updating === ticket.id ? (
                            <Loader2 size={16} className="animate-spin text-gray-400" />
                          ) : (
                            <select
                              value={ticket.status}
                              onChange={(e) => handleStatusChange(ticket, e.target.value)}
                              className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-brand-500 ${
                                statusStyles[ticket.status] || ''
                              }`}
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>{s.replace('_', ' ')}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleRetriage(ticket)}
                              disabled={updating === ticket.id}
                              className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-40"
                              title="Re-run AI triage"
                            >
                              <Sparkles size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(ticket.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete ticket"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Documents tab */}
      {tab === 'documents' && (
        <div className="max-w-2xl">
          <p className="text-sm text-gray-500 mb-4">
            Upload lease PDFs to power the AI chatbot. Documents are extracted, chunked, and stored in Qdrant for semantic search.
          </p>
          <DocumentUpload />
        </div>
      )}
    </div>
  );
}

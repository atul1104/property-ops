import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTickets, updateTicket, deleteTicket } from '../store/slices/ticketSlice';
import { fetchDocuments } from '../store/slices/documentSlice';
import { toast } from 'react-hot-toast';
import DocumentUpload from '../components/DocumentUpload';
import { Loader2, Trash2, RefreshCw, ShieldCheck, FileText } from 'lucide-react';

const STATUSES   = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['URGENT', 'ROUTINE', 'COSMETIC'];
const AI_TAGS    = ['Plumbing', 'Electrical', 'HVAC', 'Structural', 'Pest', 'Appliance', 'Other'];

const statusStyles = {
  OPEN:        'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED:    'bg-green-100 text-green-700',
  CLOSED:      'bg-gray-100 text-gray-600',
};

const priorityStyles = {
  URGENT:   'bg-red-50 text-red-600',
  ROUTINE:  'bg-amber-50 text-amber-600',
  COSMETIC: 'bg-teal-50 text-teal-600',
};

const SkeletonRow = () => (
  <tr>
    {[90, 180, 80, 80, 80, 64, 36].map((w, i) => (
      <td key={i} className="px-4 py-3.5">
        <div className="h-3.5 bg-gray-200 rounded-full animate-pulse" style={{ width: w }} />
      </td>
    ))}
  </tr>
);

export default function AdminPage() {
  const dispatch = useDispatch();
  const { items: tickets, loading } = useSelector((s) => s.tickets);
  const { items: docs } = useSelector((s) => s.documents);
  const [tab, setTab] = useState('tickets');
  const [updating, setUpdating] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    dispatch(fetchTickets());
    dispatch(fetchDocuments());
    document.title = 'Admin | Property Ops AI';
  }, [dispatch]);

  const handleUpdate = async (ticket, changes) => {
    setUpdating(ticket.id);
    const result = await dispatch(updateTicket({ id: ticket.id, ...changes }));
    setUpdating(null);
    if (updateTicket.fulfilled.match(result)) {
      const field = Object.keys(changes)[0];
      toast.success(`Ticket ${field} updated to ${Object.values(changes)[0]}`);
    } else {
      toast.error(result.payload || 'Update failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this ticket?')) return;
    setDeleting(id);
    const result = await dispatch(deleteTicket(id));
    setDeleting(null);
    if (deleteTicket.fulfilled.match(result)) {
      toast.success('Ticket deleted');
    } else {
      toast.error(result.payload || 'Delete failed');
    }
  };

  const tabs = [
    { key: 'tickets',   label: 'All Tickets',     icon: RefreshCw, count: tickets.length },
    { key: 'documents', label: 'Lease Documents',  icon: FileText,  count: docs.length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck size={22} className="text-brand-600" />
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              tab === key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={15} />
            {label}
            {count > 0 && (
              <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                tab === key ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tickets tab */}
      {tab === 'tickets' && (
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
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <RefreshCw size={36} strokeWidth={1.5} />
                      <p className="font-medium text-gray-600">No tickets yet</p>
                      <p className="text-sm">Tickets submitted by tenants will appear here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 hover:border-l-2 hover:border-l-brand-300 transition-all">
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[130px]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {ticket.user?.email?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="truncate">{ticket.user?.email || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px]">
                      <p className="truncate">{ticket.title}</p>
                      <p className="text-xs text-gray-400 truncate">{ticket.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      {updating === ticket.id ? (
                        <Loader2 size={14} className="animate-spin text-gray-400" />
                      ) : (
                        <select
                          value={ticket.priority || ''}
                          onChange={(e) => handleUpdate(ticket, { priority: e.target.value })}
                          className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-brand-500 ${
                            priorityStyles[ticket.priority] || 'bg-gray-50 text-gray-400'
                          }`}
                        >
                          <option value="" disabled>—</option>
                          {PRIORITIES.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {updating === ticket.id ? (
                        <Loader2 size={14} className="animate-spin text-gray-400" />
                      ) : (
                        <select
                          value={ticket.aiTag || ''}
                          onChange={(e) => handleUpdate(ticket, { aiTag: e.target.value })}
                          className="text-xs text-gray-600 px-2 py-1 rounded-full border-0 bg-gray-50 cursor-pointer focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="" disabled>—</option>
                          {AI_TAGS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {updating === ticket.id ? (
                        <Loader2 size={16} className="animate-spin text-gray-400" />
                      ) : (
                        <select
                          value={ticket.status}
                          onChange={(e) => handleUpdate(ticket, { status: e.target.value })}
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
                      <button
                        onClick={() => handleDelete(ticket.id)}
                        disabled={deleting === ticket.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-110 disabled:opacity-40 disabled:pointer-events-none"
                        title="Delete ticket"
                      >
                        {deleting === ticket.id
                          ? <Loader2 size={14} className="animate-spin text-red-400" />
                          : <Trash2 size={14} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Documents tab */}
      {tab === 'documents' && (
        <div className="max-w-2xl animate-fade-in">
          <p className="text-sm text-gray-500 mb-4">
            Upload lease PDFs to power the AI chatbot. Documents are extracted, chunked, and stored in Qdrant for semantic search.
          </p>
          <DocumentUpload />
        </div>
      )}
    </div>
  );
}

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTickets } from '../store/slices/ticketSlice';
import { fetchDocuments } from '../store/slices/documentSlice';
import { Link } from 'react-router-dom';
import { Ticket, MessageSquare, FileText, TrendingUp, AlertCircle } from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color, to }) => (
  <Link
    to={to}
    className="card hover:shadow-md transition-shadow flex items-center gap-4 group"
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
    <span className="ml-auto text-gray-300 group-hover:text-brand-500 transition-colors">→</span>
  </Link>
);

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { items: tickets } = useSelector((s) => s.tickets);
  const { items: docs } = useSelector((s) => s.documents);
  const { role, email } = useSelector((s) => s.auth);

  useEffect(() => {
    dispatch(fetchTickets());
    dispatch(fetchDocuments());
  }, [dispatch]);

  const openTickets = tickets.filter((t) => t.status === 'OPEN').length;
  const urgentTickets = tickets.filter((t) => t.priority === 'URGENT').length;
  const vectorizedDocs = docs.filter((d) => d.vectorized).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{email ? `, ${email.split('@')[0]}` : ''}!
        </h1>
        <p className="text-gray-500 mt-1">
          {role === 'ADMIN'
            ? 'Manage all maintenance requests and lease documents from here.'
            : 'Track your maintenance requests and ask questions about your lease.'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Tickets" value={tickets.length} icon={Ticket} color="bg-brand-600" to="/tickets" />
        <StatCard label="Open Tickets" value={openTickets} icon={TrendingUp} color="bg-blue-500" to="/tickets" />
        <StatCard label="Urgent Issues" value={urgentTickets} icon={AlertCircle} color="bg-red-500" to="/tickets" />
        <StatCard label="Lease Documents" value={vectorizedDocs} icon={FileText} color="bg-green-500" to="/chat" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/tickets" className="card border-l-4 border-l-brand-500 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <Ticket size={20} className="text-brand-600" />
            <h2 className="font-semibold text-gray-900">Maintenance Requests</h2>
          </div>
          <p className="text-sm text-gray-500">
            {role === 'ADMIN'
              ? 'View and manage all tenant maintenance tickets with AI-generated priority tags.'
              : 'Submit a new maintenance request — our AI will auto-assign priority and category.'}
          </p>
        </Link>

        <Link to="/chat" className="card border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare size={20} className="text-green-600" />
            <h2 className="font-semibold text-gray-900">Lease AI Chat</h2>
          </div>
          <p className="text-sm text-gray-500">
            Ask questions about your lease documents — pet policies, renewal terms, maintenance responsibilities —
            powered by RAG + Gemini.
          </p>
        </Link>
      </div>
    </div>
  );
}

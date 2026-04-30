import { Clock, Tag, AlertCircle } from 'lucide-react';

const priorityStyles = {
  URGENT:   'bg-red-100 text-red-700',
  ROUTINE:  'bg-amber-100 text-amber-700',
  COSMETIC: 'bg-teal-100 text-teal-700',
};

const statusStyles = {
  OPEN:        'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED:    'bg-green-100 text-green-700',
  CLOSED:      'bg-gray-100 text-gray-600',
};

export default function TicketCard({ ticket }) {
  const date = new Date(ticket.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{ticket.title}</h3>
        <span className={`badge shrink-0 ${statusStyles[ticket.status] || 'bg-gray-100 text-gray-600'}`}>
          {ticket.status.replace('_', ' ')}
        </span>
      </div>

      <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">{ticket.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {ticket.priority && (
          <span className={`badge ${priorityStyles[ticket.priority]}`}>
            <AlertCircle size={11} className="mr-1" />
            {ticket.priority}
          </span>
        )}
        {ticket.aiTag && (
          <span className="badge bg-purple-100 text-purple-700">
            <Tag size={11} className="mr-1" />
            {ticket.aiTag}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
          <Clock size={12} />
          {date}
        </span>
      </div>

      {ticket.user?.email && (
        <p className="mt-2 text-xs text-gray-400">Submitted by: {ticket.user.email}</p>
      )}
    </div>
  );
}

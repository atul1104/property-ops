import { Clock, Tag, AlertCircle } from 'lucide-react';

const priorityStyles = {
  URGENT:   'bg-red-100 text-red-700',
  ROUTINE:  'bg-amber-100 text-amber-700',
  COSMETIC: 'bg-teal-100 text-teal-700',
};

const priorityBorder = {
  URGENT:   'border-l-red-500',
  ROUTINE:  'border-l-amber-400',
  COSMETIC: 'border-l-teal-400',
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

  const borderClass = ticket.priority ? priorityBorder[ticket.priority] : 'border-l-gray-200';

  return (
    <div className={`card border-l-4 ${borderClass} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}>
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
        <div className="mt-2 flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
            {ticket.user.email[0].toUpperCase()}
          </div>
          <p className="text-xs text-gray-400">{ticket.user.email}</p>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createTicket } from '../store/slices/ticketSlice';
import { toast } from 'react-hot-toast';
import { Send, Loader2 } from 'lucide-react';

export default function TicketForm({ onClose }) {
  const dispatch = useDispatch();
  const loading = useSelector((s) => s.tickets.loading);
  const [form, setForm] = useState({ title: '', description: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Both title and description are required');
      return;
    }

    const result = await dispatch(createTicket(form));
    if (createTicket.fulfilled.match(result)) {
      toast.success('Ticket submitted! AI is triaging it now.');
      setForm({ title: '', description: '' });
      onClose?.();
    } else {
      toast.error(result.payload || 'Failed to submit ticket');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Issue Title</label>
        <input
          className="input"
          placeholder="e.g. Kitchen sink is leaking"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          maxLength={120}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          className="input h-28 resize-none"
          placeholder="Describe the issue in detail — location, severity, how long it's been happening..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          maxLength={1000}
          required
        />
      </div>
      <p className="text-xs text-gray-400">
        Our AI will automatically assign a priority and category tag.
      </p>
      <div className="flex justify-end gap-2">
        {onClose && (
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Submit Ticket
        </button>
      </div>
    </form>
  );
}

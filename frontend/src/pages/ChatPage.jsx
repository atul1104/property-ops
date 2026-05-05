import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearChat, streamingStart, streamingChunk, streamingDone, streamingStop, streamingError } from '../store/slices/chatSlice';
import { fetchDocuments } from '../store/slices/documentSlice';
import { toast } from 'react-hot-toast';
import ChatMessage from '../components/ChatMessage';
import { Send, Square, Loader2, MessageSquare, Trash2, AlertTriangle, FileText } from 'lucide-react';

const SUGGESTED = [
  'What is the pet policy in my lease?',
  'When does my lease expire?',
  'How much notice do I need to give before moving out?',
  'Who is responsible for appliance repairs?',
];

export default function ChatPage() {
  const dispatch = useDispatch();
  const { messages, loading, streaming, sessionId } = useSelector((s) => s.chat);
  const { items: docs } = useSelector((s) => s.documents);
  const [input, setInput] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const vectorizedDocs = docs.filter((d) => d.vectorized);

  useEffect(() => { dispatch(fetchDocuments()); }, [dispatch]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (question) => {
    const q = (question || input).trim();
    if (!q || loading) return;
    setInput('');

    dispatch(streamingStart({ question: q, documentId: selectedDocId || null }));

    const baseUrl = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/api`
      : '/api';
    const token = localStorage.getItem('token');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${baseUrl}/chat/stream`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question: q,
          sessionId,
          documentId: selectedDocId || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Stream request failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));
          if (data.error) throw new Error(data.error);
          if (data.chunk) dispatch(streamingChunk(data.chunk));
          if (data.done) dispatch(streamingDone({ sources: data.sources, sessionId: data.sessionId }));
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      dispatch(streamingError(err.message || 'Stream failed'));
      toast.error(err.message || 'Stream failed');
    }

    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedDoc = vectorizedDocs.find((d) => d.id === selectedDocId);
  const shortName = selectedDoc
    ? selectedDoc.filename.length > 20
      ? selectedDoc.filename.slice(0, 20) + '…'
      : selectedDoc.filename
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare size={22} className="text-brand-600" />
            Lease AI Chat
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Ask anything about your lease — powered by Gemini + RAG
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { abortRef.current?.abort(); dispatch(clearChat()); }}
            className="btn-secondary text-xs"
            title="Clear conversation"
          >
            <Trash2 size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Document selector */}
      {vectorizedDocs.length === 0 ? (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 mb-4">
          <AlertTriangle size={16} className="shrink-0" />
          No lease documents have been indexed yet. Ask an admin to upload PDFs before chatting.
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-4 p-3 bg-white border border-gray-200 rounded-xl">
          <FileText size={16} className="text-gray-400 shrink-0" />
          <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Search in:</span>
          <select
            className="flex-1 text-sm border-0 bg-transparent focus:ring-0 text-gray-800 cursor-pointer"
            value={selectedDocId}
            onChange={(e) => {
              setSelectedDocId(e.target.value);
              dispatch(clearChat());
            }}
          >
            <option value="">All documents ({vectorizedDocs.length})</option>
            {vectorizedDocs.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.filename}
              </option>
            ))}
          </select>
          {selectedDoc && (
            <span className="badge bg-brand-100 text-brand-700 shrink-0">1 doc</span>
          )}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-4">
            <MessageSquare size={48} strokeWidth={1} />
            <div>
              <p className="font-medium text-gray-600">
                {selectedDoc ? `Asking about: ${shortName}` : 'Start by asking about your lease'}
              </p>
              <p className="text-sm mt-1">Try one of the suggestions below</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 w-full max-w-lg">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="px-3 py-2.5 text-left text-sm bg-white border border-gray-200 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-colors text-gray-600"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => <ChatMessage key={i} message={msg} />)
        )}

        {loading && !streaming && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
              <Loader2 size={14} className="text-white animate-spin" />
            </div>
            <div className="px-4 py-3 bg-white border border-gray-200 rounded-2xl rounded-tl-sm text-sm text-gray-500 shadow-sm">
              {selectedDoc
                ? `Searching "${shortName}"…`
                : 'Searching your lease documents…'}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="mt-4 flex gap-2">
        <textarea
          ref={inputRef}
          className="input flex-1 resize-none h-12 py-3 leading-normal"
          placeholder={
            selectedDoc
              ? `Ask about "${shortName}"… (Enter to send)`
              : 'Ask about your lease… (Enter to send)'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={1}
        />
        <button
          onClick={() => {
            if (streaming) {
              abortRef.current?.abort();
              dispatch(streamingStop());
            } else {
              handleSend();
            }
          }}
          disabled={!streaming && (!input.trim() || loading)}
          className="btn-primary px-4 self-end h-12"
          title={streaming ? 'Stop' : 'Send'}
        >
          {streaming ? <Square size={16} fill="currentColor" /> : loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}

import { Sparkles, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export default function ChatMessage({ message }) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-brand-500 to-brand-700'
            : 'bg-gradient-to-br from-violet-500 to-purple-700'
        }`}
      >
        {isUser ? <User size={15} /> : <Sparkles size={15} />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-brand-600 text-white rounded-tr-sm'
              : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
          }`}
        >
          {!isUser && message.streaming && message.content === '' ? (
            <span className="flex gap-1 items-center h-4">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </span>
          ) : (
            <>
              {message.content}
              {!isUser && message.streaming && (
                <span className="inline-block w-0.5 h-3.5 bg-gray-500 ml-0.5 align-middle animate-pulse" />
              )}
            </>
          )}
        </div>

        {/* Sources accordion (assistant only) */}
        {!isUser && message.sources?.length > 0 && (
          <div className="w-full">
            <button
              onClick={() => setShowSources((v) => !v)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showSources ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
            </button>
            {showSources && (
              <div className="mt-1 space-y-1.5">
                {message.sources.map((src, i) => (
                  <div key={i} className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
                    <p className="line-clamp-3">{src.content}</p>
                    {src.metadata?.filename && (
                      <p className="mt-1 text-gray-400 font-medium">{src.metadata.filename}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <time className="text-[10px] text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>
    </div>
  );
}

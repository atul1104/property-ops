import { useRef, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { uploadDocument, deleteDocument, fetchDocuments } from '../store/slices/documentSlice';
import { toast } from 'react-hot-toast';
import { Upload, FileText, Loader2, CheckCircle2, Clock, Trash2 } from 'lucide-react';

export default function DocumentUpload() {
  const dispatch = useDispatch();
  const { items: docs, uploading, loading } = useSelector((s) => s.documents);
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Poll every 3 s while any document is still being processed
  useEffect(() => {
    const hasPending = docs.some((d) => !d.vectorized);
    if (!hasPending) return;
    const interval = setInterval(() => dispatch(fetchDocuments()), 3000);
    return () => clearInterval(interval);
  }, [docs, dispatch]);

  const handleFile = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10 MB');
      return;
    }

    const result = await dispatch(uploadDocument(file));
    if (uploadDocument.fulfilled.match(result)) {
      toast.success('PDF uploaded — processing for AI search...');
    } else {
      toast.error(result.payload || 'Upload failed');
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.filename}"? This will remove it from storage and AI search.`)) return;
    setDeletingId(doc.id);
    const result = await dispatch(deleteDocument(doc.id));
    setDeletingId(null);
    if (deleteDocument.fulfilled.match(result)) {
      toast.success('Document deleted');
    } else {
      toast.error(result.payload || 'Delete failed');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragging
            ? 'border-brand-500 bg-brand-50 scale-[1.02]'
            : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50 hover:scale-[1.01]'
        } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <Loader2 size={32} className="animate-spin text-brand-500" />
            <p className="text-sm font-medium">Uploading and processing...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <Upload size={32} className={`transition-colors ${dragging ? 'text-brand-500' : 'text-gray-400'}`} />
            <p className="text-sm font-medium">Drop a PDF here or click to browse</p>
            <p className="text-xs text-gray-400">Max 10 MB — lease agreements only</p>
          </div>
        )}
      </div>

      {/* Document list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-200 rounded-full animate-pulse w-3/4" />
                <div className="h-3 bg-gray-200 rounded-full animate-pulse w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
          <FileText size={36} strokeWidth={1.5} />
          <p className="font-medium text-gray-600 text-sm">No documents uploaded yet</p>
          <p className="text-xs">Upload a lease PDF above to enable AI chat.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
              <FileText size={18} className="text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.filename}</p>
                <p className="text-xs text-gray-400">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>
              {doc.vectorized ? (
                <div className="flex items-center gap-1 text-green-600 shrink-0" title="Ready for AI search">
                  <CheckCircle2 size={14} />
                  <span className="text-xs font-medium">Ready</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-amber-500 shrink-0" title="Processing...">
                  <Clock size={14} className="animate-pulse" />
                  <span className="text-xs font-medium">Processing</span>
                </div>
              )}
              <button
                onClick={() => handleDelete(doc)}
                disabled={deletingId === doc.id}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-110 shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                title="Delete document"
              >
                {deletingId === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

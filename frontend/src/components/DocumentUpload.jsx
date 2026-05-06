import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { uploadDocument, deleteDocument } from '../store/slices/documentSlice';
import { toast } from 'react-hot-toast';
import { Upload, FileText, Loader2, CheckCircle2, Clock, Trash2 } from 'lucide-react';

export default function DocumentUpload() {
  const dispatch = useDispatch();
  const { items: docs, uploading, loading } = useSelector((s) => s.documents);
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

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
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
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
            <Upload size={32} className="text-gray-400" />
            <p className="text-sm font-medium">Drop a PDF here or click to browse</p>
            <p className="text-xs text-gray-400">Max 10 MB — lease agreements only</p>
          </div>
        )}
      </div>

      {/* Document list */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Loading documents...</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No documents uploaded yet.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <FileText size={18} className="text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.filename}</p>
                <p className="text-xs text-gray-400">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>
              {doc.vectorized ? (
                <CheckCircle2 size={16} className="text-green-500 shrink-0" title="Ready for AI search" />
              ) : (
                <Clock size={16} className="text-amber-500 shrink-0 animate-pulse" title="Processing..." />
              )}
              <button
                onClick={() => handleDelete(doc)}
                disabled={deletingId === doc.id}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 disabled:opacity-40 disabled:pointer-events-none"
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

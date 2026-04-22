import { useRef } from 'react';
import { FileText, Upload, Trash2, Download } from 'lucide-react';
import { Document } from '../../types';
import { formatDate } from '../../utils/notifications';
import { api } from '../../api/client';

interface DocumentsSectionProps {
  documents: Document[];
  onAdd: (file: File) => void;
  onRemove: (docId: string) => void;
}

export default function DocumentsSection({ documents, onAdd, onRemove }: DocumentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => onAdd(file));
    e.target.value = '';
  };

  const handleDownload = async (doc: Document) => {
    const url = doc.url;
    if (!url) return;
    try {
      const blob = await api.downloadDocument(url);
      const objectUrl = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = objectUrl;
      a.download = doc.name;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <div className="pt-2 pb-3 space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#d8d0e8] rounded-xl text-sm text-[#967BB6] hover:bg-[#f0ebf8] hover:border-[#967BB6] transition-colors"
      >
        <Upload size={16} />
        Прикрепить документы
      </button>
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-200">
          <FileText size={16} className="text-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
            <p className="text-xs text-slate-400">{(doc.size / 1024).toFixed(1)} KB · {formatDate(doc.uploadedAt)}</p>
          </div>
          <button onClick={() => handleDownload(doc)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500">
            <Download size={14} />
          </button>
          <button onClick={() => onRemove(doc.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

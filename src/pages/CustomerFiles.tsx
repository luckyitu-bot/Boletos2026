import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { File, Download, Search, Clock, FileText } from 'lucide-react';
import { motion } from 'motion/react';

interface FileData {
  id: number;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  created_at: string;
}

export default function CustomerFiles() {
  const { token } = useAuth();
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch('/api/customer/files', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setFiles(data);
      } catch (err) {
        console.error('Erro ao buscar arquivos', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [token]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(f => 
    f.original_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Meus Arquivos</h1>
        <p className="text-slate-500 mt-1">Documentos e itens disponibilizados para você</p>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar arquivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-400">Carregando seus arquivos...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={32} />
              </div>
              <p className="text-slate-500 font-medium">Nenhum arquivo encontrado</p>
            </div>
          ) : filteredFiles.map((f) => (
            <motion.div
              key={f.id}
              whileHover={{ y: -4 }}
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <File size={24} />
                </div>
                <a
                  href={`/uploads/${f.filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  title="Baixar arquivo"
                >
                  <Download size={20} />
                </a>
              </div>
              
              <h3 className="font-bold text-slate-900 truncate mb-1" title={f.original_name}>
                {f.original_name}
              </h3>
              
              <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  {new Date(f.created_at).toLocaleDateString()}
                </div>
                <div className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {formatSize(f.size)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

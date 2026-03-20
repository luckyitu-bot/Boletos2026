import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { Upload, File, Trash2, Download, Search, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface Customer {
  id: number;
  name: string;
  email: string;
}

interface FileData {
  id: number;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  customer_name: string;
  created_at: string;
}

export default function AdminFiles() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchData = async () => {
    try {
      const [custRes, filesRes] = await Promise.all([
        fetch('/api/admin/customers', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/files', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const custData = await custRes.json();
      const filesData = await filesRes.json();
      
      setCustomers(custData);
      setFiles(filesData);
    } catch (err) {
      console.error('Erro ao buscar dados', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const toggleCustomer = (id: number) => {
    setSelectedCustomers(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.id));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || selectedCustomers.length === 0) return;

    setUploading(true);
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('userIds', JSON.stringify(selectedCustomers));

    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: data.message });
      setSelectedFile(null);
      setSelectedCustomers([]);
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir este arquivo?')) return;

    try {
      await fetch(`/api/admin/files/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setFiles(files.filter(f => f.id !== id));
    } catch (err) {
      alert('Erro ao excluir arquivo');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
    c.email.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Gestão de Arquivos</h1>
        <p className="text-slate-500 mt-1">Envie documentos para um ou mais clientes</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 sticky top-8">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Upload size={20} className="text-indigo-600" />
              Novo Upload
            </h2>

            {message.text && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
              }`}>
                {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {message.text}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">Selecionar Clientes</label>
                  <button 
                    type="button"
                    onClick={toggleAll}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    {selectedCustomers.length === customers.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                </div>
                
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text"
                    placeholder="Filtrar clientes..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl p-2 space-y-1 bg-slate-50/50">
                  {filteredCustomers.length === 0 ? (
                    <p className="text-center py-4 text-xs text-slate-400">Nenhum cliente encontrado</p>
                  ) : filteredCustomers.map(c => (
                    <label 
                      key={c.id} 
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedCustomers.includes(c.id) ? 'bg-indigo-50 border-indigo-100' : 'hover:bg-white'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={selectedCustomers.includes(c.id)}
                        onChange={() => toggleCustomer(c.id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{c.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{c.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  {selectedCustomers.length} cliente(s) selecionado(s)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Arquivo</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-indigo-400 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    required
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2">
                    <File className="mx-auto text-slate-400" size={32} />
                    <p className="text-sm text-slate-500">
                      {selectedFile ? selectedFile.name : 'Clique ou arraste para selecionar'}
                    </p>
                    {selectedFile && (
                      <p className="text-xs text-indigo-600 font-medium">
                        {formatSize(selectedFile.size)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile || selectedCustomers.length === 0}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {uploading ? 'Enviando...' : 'Enviar Arquivo'}
              </button>
            </form>
          </div>
        </div>

        {/* Files List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Arquivos Enviados</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Arquivo</th>
                    <th className="px-6 py-4 font-semibold">Cliente</th>
                    <th className="px-6 py-4 font-semibold">Tamanho</th>
                    <th className="px-6 py-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Carregando...</td></tr>
                  ) : files.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Nenhum arquivo enviado</td></tr>
                  ) : files.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                            <File size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 truncate max-w-[200px]">{f.original_name}</p>
                            <p className="text-xs text-slate-500">{new Date(f.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 font-medium">{f.customer_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500">{formatSize(f.size)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/uploads/${f.filename}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <Download size={18} />
                          </a>
                          <button
                            onClick={() => handleDelete(f.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

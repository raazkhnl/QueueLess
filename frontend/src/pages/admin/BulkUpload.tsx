import { useState, useEffect } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, Building2, GitBranch } from 'lucide-react';
import { adminAPI, orgAPI, branchAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { downloadBlob } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function BulkUpload() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';
  const [type, setType] = useState<'users' | 'branches'>('users');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  useEffect(() => {
    if (isSuperAdmin) {
      orgAPI.getAll().then(r => setOrgs(r.data.organizations)).catch(() => {});
    } else {
      setSelectedOrg((user?.organization as any)?._id || user?.organization as string || '');
    }
    branchAPI.getAll({ limit: 200 }).then(r => setBranches(r.data.branches)).catch(() => {});
  }, []);

  const filteredBranches = selectedOrg
    ? branches.filter(b => (typeof b.organization === 'object' ? b.organization._id : b.organization) === selectedOrg)
    : branches;

  const handleDownloadSample = async (t: string) => {
    try {
      const { data } = await adminAPI.downloadSampleExcel(t);
      downloadBlob(data, `sample-${t}.xlsx`);
    } catch { toast.error('Download failed'); }
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Select a file first');
    if (!selectedOrg) return toast.error('Please select an organization');
    if (type === 'users' && !selectedBranch) {
      // For users, branch is optional but org is required
    }
    setLoading(true); setResults(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    fd.append('organization', selectedOrg);
    if (selectedBranch) fd.append('branch', selectedBranch);
    try {
      const { data } = await adminAPI.uploadExcel(fd);
      setResults(data.results);
      toast.success(`Created ${data.results.created} records`);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Upload failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Bulk Upload</h1>
      <div className="card p-6 space-y-6">
        {/* Type selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Upload Type</label>
          <div className="flex gap-3">
            {(['users', 'branches'] as const).map(t => (
              <button key={t} onClick={() => { setType(t); setResults(null); setFile(null); }}
                className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${type === t ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                <FileSpreadsheet className={`w-6 h-6 mx-auto mb-2 ${type === t ? 'text-primary-600' : 'text-slate-400'}`} />
                <p className="font-medium text-sm capitalize dark:text-slate-200">{t}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Organization selector (required) */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <label className="block text-sm font-medium text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4" />Select Organization *
          </label>
          {isSuperAdmin ? (
            <select value={selectedOrg} onChange={e => { setSelectedOrg(e.target.value); setSelectedBranch(''); }} className="input-field" required>
              <option value="">Choose organization...</option>
              {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
            </select>
          ) : (
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{typeof user?.organization === 'object' ? (user?.organization as any)?.name : 'Current Organization'}</p>
          )}

          {/* Branch selector for users */}
          {type === 'users' && selectedOrg && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-amber-900 dark:text-amber-300 mb-1 flex items-center gap-2">
                <GitBranch className="w-4 h-4" />Default Branch for Users (optional)
              </label>
              <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="input-field">
                <option value="">No default branch</option>
                {filteredBranches.map(b => <option key={b._id} value={b._id}>{b.name} ({b.code})</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Download sample */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1. Download Sample Template</label>
          <button onClick={() => handleDownloadSample(type)} className="btn-secondary btn-sm">
            <Download className="w-4 h-4" />Download {type} template (.xlsx)
          </button>
        </div>

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">2. Upload Filled Excel</label>
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-8 text-center hover:border-primary-300 transition-colors">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" id="excel-upload" />
            <label htmlFor="excel-upload" className="cursor-pointer">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">{file ? file.name : 'Click to select .xlsx / .csv file'}</p>
            </label>
          </div>
        </div>

        <button onClick={handleUpload} disabled={!file || loading || !selectedOrg} className="btn-primary w-full">
          {loading ? 'Uploading...' : 'Process Upload'}
        </button>

        {/* Results */}
        {results && (
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="font-medium dark:text-white">{results.created} records created successfully</span>
            </div>
            {results.errors?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-sm text-amber-600 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">{results.errors.length} errors</span>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {results.errors.map((e: any, i: number) => (
                    <p key={i} className="text-xs text-amber-800 dark:text-amber-300">Row {e.row}: {e.error}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

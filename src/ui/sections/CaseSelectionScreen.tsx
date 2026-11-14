import React, { useState, useEffect } from 'react';
import { CaseRecord, fetchUserCases, deleteCaseRecord, signOut } from '../../lib/supabase';
import {
  FolderLock,
  Plus,
  LogOut,
  Building2,
  User,
  ArrowRight,
  Shield,
  Search,
  Trash2,
} from 'lucide-react';

interface CaseSelectionScreenProps {
  currentUser: any;
  onSelectCase: (caseRecord: CaseRecord) => void;
  onCreateNewCase: () => void;
  onSignOut: () => void;
}

export const CaseSelectionScreen: React.FC<CaseSelectionScreenProps> = ({
  currentUser,
  onSelectCase,
  onCreateNewCase,
  onSignOut,
}) => {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCases() {
      setIsLoading(true);
      setError(null);
      try {
        const userCases = await fetchUserCases(currentUser.id, currentUser.orgId);
        setCases(userCases);
      } catch (err: unknown) {
        console.error('Failed to load user cases:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    }
    loadCases();
  }, [currentUser]);

  const handleSignOutClick = async () => {
    await signOut();
    onSignOut();
  };

  const handleDeleteCase = async (e: React.MouseEvent, caseId: string, caseName: string) => {
    e.stopPropagation();
    const ok = window.confirm(`Are you sure you want to delete case "${caseName}"? This action cannot be undone.`);
    if (!ok) return;

    try {
      await deleteCaseRecord(caseId);
      setCases((prev) => prev.filter((c) => c.id !== caseId));
      try {
        const activeRaw = localStorage.getItem('pramaan_active_case_record') || sessionStorage.getItem('pramaan_active_case_record');
        if (activeRaw) {
          const active = JSON.parse(activeRaw);
          if (active.id === caseId) {
            localStorage.removeItem('pramaan_active_case_record');
            sessionStorage.removeItem('pramaan_active_case_record');
          }
        }
      } catch {
        // ignore
      }
    } catch (err: unknown) {
      console.error('Failed to delete case:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const filteredCases = cases.filter(
    (c) =>
      c.case_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.case_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.owner_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#F2EFE2] text-ink overflow-y-auto selection:bg-yellow selection:text-ink">
      {/* Background Dot Matrix Grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(rgba(15, 15, 15, 0.22) 1.2px, transparent 1.2px)',
          backgroundSize: '20px 20px',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-start min-h-screen">
        {/* Main High-Contrast Window Card */}
        <div className="bg-white border-3 border-ink shadow-[8px_8px_0px_#0F0F0F] rounded-lg overflow-hidden flex flex-col flex-1">
          {/* Top Window Bar */}
          <div className="bg-[#0F0F0F] px-4 py-3 border-b-3 border-ink flex items-center justify-between text-white">
            <div className="flex items-center space-x-2.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#E8452C] border border-white/40" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#FFE24A] border border-white/40" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#35D07F] border border-white/40" />
              <span className="ml-3 font-mono text-xs sm:text-sm text-white font-black uppercase tracking-wider">
                PRAMAAN // CASE MANAGEMENT REPOSITORY
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase bg-yellow text-ink border border-ink shadow-brutal-sm">
                <Shield className="w-3 h-3" />
                <span>AUTHENTICATED</span>
              </span>
              <button
                type="button"
                onClick={handleSignOutClick}
                className="py-1 px-2.5 bg-red hover:bg-red/80 text-white font-mono text-xs font-bold border border-white/40 rounded flex items-center space-x-1.5 transition-all"
                title="Sign out of your session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>

          {/* Subheader / User Info Bar */}
          <div className="px-6 py-4 bg-[#FAF7EE] border-b-2 border-ink flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded bg-ink text-yellow font-mono font-black flex items-center justify-center text-sm border-2 border-ink shadow-brutal-sm">
                {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'U'}
              </div>
              <div>
                <div className="text-sm font-bold text-ink font-sans flex items-center space-x-2">
                  <span>{currentUser.fullName || currentUser.email}</span>
                  <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase bg-ink text-white rounded">
                    {currentUser.accountType === 'organisation' ? (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-2.5 h-2.5 text-yellow" />
                        {currentUser.orgName || 'ORGANISATION'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <User className="w-2.5 h-2.5 text-yellow" />
                        INDIVIDUAL
                      </span>
                    )}
                  </span>
                </div>
                <div className="text-xs font-mono text-muted">{currentUser.email}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={onCreateNewCase}
              className="py-2 px-4 bg-yellow hover:bg-yellow/90 text-ink font-mono font-bold text-xs uppercase tracking-wider border-2 border-ink shadow-[3px_3px_0px_#0F0F0F] flex items-center justify-center space-x-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Case</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="p-6 sm:p-8 flex-1 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-black text-ink font-sans tracking-tight">
                  Your Case Dossiers
                </h1>
                <p className="text-xs font-mono text-muted mt-1">
                  Select an authorized dossier to manage evidence and custody records.
                </p>
              </div>

              {cases.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search cases or reference..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                  />
                  <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-2.5" />
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 bg-red/10 border-2 border-red text-ink text-xs font-mono">
                {error}
              </div>
            )}

            {/* Loading State */}
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-3 font-mono text-xs text-muted">
                <div className="w-6 h-6 border-3 border-ink border-t-yellow rounded-full animate-spin" />
                <span>Loading accessible case records...</span>
              </div>
            ) : cases.length === 0 ? (
              /* Required Empty State */
              <div className="flex-1 flex flex-col items-center justify-center py-16 border-2 border-dashed border-ink/40 bg-[#FAF7EE] rounded-lg text-center p-8 space-y-4">
                <div className="w-14 h-14 rounded-full bg-paper border-2 border-ink flex items-center justify-center shadow-brutal-sm">
                  <FolderLock className="w-7 h-7 text-ink" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-sans font-bold text-lg text-ink">No cases yet</h3>
                  <p className="font-mono text-xs text-muted max-w-sm">
                    Create a case to begin organizing evidence securely.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCreateNewCase}
                  className="py-2.5 px-5 bg-yellow hover:bg-yellow/90 text-ink font-mono font-bold text-xs uppercase tracking-wider border-2 border-ink shadow-[4px_4px_0px_#0F0F0F] flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create new case</span>
                </button>
              </div>
            ) : (
              /* Case Grid Cards */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCases.map((c) => {
                  const updatedDate = new Date(c.updated_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={c.id}
                      className="p-5 bg-white border-2 border-ink shadow-[4px_4px_0px_#0F0F0F] hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Metadata Badges */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="px-2 py-0.5 bg-paper text-ink border border-ink text-[10px] font-mono font-bold uppercase truncate max-w-[180px]">
                            REF: {c.case_reference}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase border border-ink ${
                              c.status === 'active'
                                ? 'bg-green/20 text-emerald-950 border-green'
                                : c.status === 'archived'
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-yellow/30 text-ink'
                            }`}
                          >
                            {c.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Title and Owner */}
                        <h3 className="font-sans font-black text-lg text-ink line-clamp-1 mb-1">
                          {c.case_name}
                        </h3>
                        <p className="font-mono text-xs text-muted line-clamp-1 mb-4">
                          Evidence Owner: <span className="text-ink font-semibold">{c.owner_name}</span>
                        </p>

                        {/* Description snippet if any */}
                        {c.case_description && (
                          <p className="font-sans text-xs text-ink/75 line-clamp-2 mb-4 bg-paper p-2 border border-ink/20">
                            {c.case_description}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-ink/20 space-y-3">
                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                          <div className="p-1.5 bg-paper border border-ink/30 rounded">
                            <span className="text-muted block">FILES</span>
                            <span className="font-bold text-ink">{c.evidence_count || 0}</span>
                          </div>
                          <div className="p-1.5 bg-paper border border-ink/30 rounded">
                            <span className="text-muted block">SEAL</span>
                            <span className="font-bold text-ink truncate block">
                              {c.last_fingerprint_status || 'Unsealed'}
                            </span>
                          </div>
                          <div className="p-1.5 bg-paper border border-ink/30 rounded">
                            <span className="text-muted block">UPDATED</span>
                            <span className="font-bold text-ink truncate block">{updatedDate}</span>
                          </div>
                        </div>

                        {/* Actions Row: Open and Delete */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectCase(c)}
                            className="flex-1 py-2 px-3 bg-paper hover:bg-yellow text-ink font-mono font-bold text-xs uppercase border-2 border-ink shadow-brutal-sm flex items-center justify-center space-x-1.5 transition-colors"
                          >
                            <span>Open case</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCase(e, c.id, c.case_name)}
                            className="py-2 px-3 bg-paper hover:bg-red hover:text-white text-ink border-2 border-ink shadow-brutal-sm font-mono text-xs font-bold transition-colors flex items-center justify-center gap-1"
                            title="Delete this case dossier"
                            aria-label={`Delete case ${c.case_name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


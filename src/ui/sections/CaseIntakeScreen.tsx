import React, { useState, useEffect } from 'react';
import { CaseDetails, CustodyEntry } from '../../core/types';
import { canonicalJson } from '../../core/canonical';
import { sha256Hex } from '../../core/hash';
import { appendCustodyLogEntry, updateCaseDetails } from '../../storage/db';
import { appendEntry } from '../../core/custody';
import { ShieldCheck, ArrowRight } from 'lucide-react';

interface CaseIntakeScreenProps {
  details: CaseDetails;
  caseTitle: string;
  log: CustodyEntry[];
  onEnterWorkspace: (details: CaseDetails, title: string, newLogEntry?: CustodyEntry) => void;
}

export const CaseIntakeScreen: React.FC<CaseIntakeScreenProps> = ({
  details,
  caseTitle,
  log,
  onEnterWorkspace,
}) => {
  // Section 1: Party Details
  const [name, setName] = useState(details.name || '');
  const [parentage, setParentage] = useState(details.parentage || '');
  const [address, setAddress] = useState(details.address || '');
  const [title, setTitle] = useState(caseTitle || 'Untitled Case Dossier');

  // Section 2: Device Information
  const [sourceType, setSourceType] = useState(details.device?.sourceType || 'Mobile Phone');
  const [makeModel, setMakeModel] = useState(details.device?.model || '');
  const [colour, setColour] = useState(details.device?.colour || '');
  const [serialNumber, setSerialNumber] = useState(details.device?.serialNumber || '');
  const [identifier, setIdentifier] = useState(details.device?.identifier || '');
  const [ownership, setOwnership] = useState<string>(
    details.device?.ownershipRelationship || 'Owned'
  );

  const [previewHash, setPreviewHash] = useState<string>('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Compute live canonical preview hash as user types
  useEffect(() => {
    const payload = {
      name,
      parentage,
      address,
      title,
      device: {
        sourceType,
        model: makeModel,
        colour,
        serialNumber,
        identifier,
        ownershipRelationship: ownership,
      },
    };
    const canonical = canonicalJson(payload);
    sha256Hex(canonical).then(setPreviewHash);
  }, [name, parentage, address, title, sourceType, makeModel, colour, serialNumber, identifier, ownership]);

  const handleProceed = async () => {
    setIsTransitioning(true);

    const updatedDetails: CaseDetails = {
      ...details,
      name,
      parentage,
      address,
      relationship: ownership,
      title,
      device: {
        ...details.device,
        sourceType,
        model: makeModel,
        colour,
        serialNumber,
        identifier,
        ownershipRelationship: ownership,
      },
    };

    // Save to IndexedDB
    await updateCaseDetails(updatedDetails, title);

    // Append custody log entry
    let logEntry: CustodyEntry | undefined;
    try {
      logEntry = await appendEntry(
        log,
        'DETAILS_SAVED',
        {
          title,
          deponentName: name,
          deviceModel: makeModel,
          deviceSource: sourceType,
          ownership,
          canonicalHash: previewHash,
          timestamp: new Date().toISOString(),
        }
      );
      await appendCustodyLogEntry(logEntry);
    } catch (err) {
      console.warn('Could not append custody log entry on intake:', err);
    }

    // Smooth transition exit delay before unmounting intake view
    setTimeout(() => {
      onEnterWorkspace(updatedDetails, title, logEntry);
    }, 680);
  };

  return (
    <div
      className={`fixed inset-0 z-40 bg-paper text-ink overflow-y-auto selection:bg-yellow selection:text-ink transition-all duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] ${
        isTransitioning
          ? '-translate-y-full opacity-0 pointer-events-none filter blur-[2px]'
          : 'translate-y-0 opacity-100'
      }`}
    >
      {/* Background Dot Matrix Paper Grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(rgba(0, 0, 0, 0.16) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center min-h-screen">
        {/* Terminal Header Window Card */}
        <div className="neo-card bg-terminal text-terminal-text border-3 border-ink shadow-[8px_8px_0px_#000] rounded-lg overflow-hidden">
          {/* Top Window Bar */}
          <div className="bg-[#141414] px-4 py-3 border-b-2 border-gray-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red border border-ink" />
              <div className="w-3 h-3 rounded-full bg-yellow border border-ink" />
              <div className="w-3 h-3 rounded-full bg-green border border-ink" />
              <span className="ml-3 font-mono text-xs text-gray-200 font-bold uppercase tracking-wider">
                README.md · CASE DOSSIER &amp; INTAKE // SECTION 63(4) BSA
              </span>
            </div>

            <div className="flex items-center space-x-2 text-[11px] font-mono text-yellow bg-yellow/10 px-2.5 py-1 rounded border border-yellow/30 font-bold">
              <span className="w-2 h-2 rounded-full bg-yellow animate-ping" />
              <span>INITIAL INTAKE</span>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8 space-y-8">
            {/* SECTION 1 :- PARTY DETAILS */}
            <div className="space-y-4">
              <div className="border-b border-gray-800 pb-2 flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-black font-sans text-yellow uppercase tracking-wider flex items-center space-x-2">
                  <span className="w-2 h-4 bg-yellow inline-block rounded-xs" />
                  <span>SECTION 1 :- PARTY DETAILS</span>
                </h3>
                <span className="text-[10px] font-mono uppercase text-gray-400 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                  BSA Schedule Part A
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 font-mono text-xs sm:text-sm">
                {/* NAME */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-gray-300 font-bold uppercase tracking-wider flex items-center space-x-2">
                    <span className="text-green text-xs font-mono">01</span>
                    <span>NAME:</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter Complainant / Deponent full name"
                    className="flex-1 bg-black/60 border-2 border-gray-800 focus:border-yellow text-terminal-text px-3 py-2 rounded focus:outline-none"
                  />
                </div>

                {/* son / daughter / spouse of: */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-gray-300 font-bold uppercase tracking-wider flex items-center space-x-2">
                    <span className="text-green text-xs font-mono">02</span>
                    <span>son / daughter / spouse of:</span>
                  </label>
                  <input
                    type="text"
                    value={parentage}
                    onChange={(e) => setParentage(e.target.value)}
                    placeholder="e.g. S/o, D/o, or W/o [Parent / Spouse Name]"
                    className="flex-1 bg-black/60 border-2 border-gray-800 focus:border-yellow text-terminal-text px-3 py-2 rounded focus:outline-none"
                  />
                </div>

                {/* address: */}
                <div className="flex flex-col sm:flex-row sm:items-start space-y-1 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-gray-300 font-bold uppercase tracking-wider flex items-center space-x-2 mt-2">
                    <span className="text-green text-xs font-mono">03</span>
                    <span>address:</span>
                  </label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter complete residential or official address"
                    className="flex-1 bg-black/60 border-2 border-gray-800 focus:border-yellow text-terminal-text px-3 py-2 rounded focus:outline-none resize-none"
                  />
                </div>

                {/* case title: */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-blue font-bold uppercase tracking-wider flex items-center space-x-2">
                    <span className="text-green text-xs font-mono">04</span>
                    <span>case title:</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. WhatsApp Stalking &amp; Harassment Dossier 2026"
                    className="flex-1 bg-black/60 border-2 border-gray-800 focus:border-blue text-terminal-text px-3 py-2 rounded focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2 :- DEVICE INFORMATION */}
            <div className="space-y-4 pt-4 border-t-2 border-gray-800/80">
              <div className="border-b border-gray-800 pb-2 flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-black font-sans text-yellow uppercase tracking-wider flex items-center space-x-2">
                  <span className="w-2 h-4 bg-yellow inline-block rounded-xs" />
                  <span>SECTION 2 :- DEVICE INFORMATION</span>
                </h3>
                <span className="text-[10px] font-mono uppercase text-gray-400 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                  BSA Schedule Part B
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 font-mono text-xs sm:text-sm">
                {/* Source type */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-gray-300 font-bold uppercase tracking-wider flex items-center space-x-2">
                    <span className="text-green text-xs font-mono">01</span>
                    <span>Source type</span>
                  </label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="flex-1 bg-black/60 border-2 border-gray-800 focus:border-yellow text-terminal-text px-3 py-2 rounded focus:outline-none font-mono"
                  >
                    <option value="Mobile Phone">Mobile Phone (Smartphone)</option>
                    <option value="Laptop">Laptop / Notebook</option>
                    <option value="Desktop PC">Desktop PC / Workstation</option>
                    <option value="Hard Disk">Hard Disk / SSD / External Storage</option>
                    <option value="Cloud Storage">Cloud Storage / Drive</option>
                    <option value="CCTV / DVR">CCTV / DVR Recording Unit</option>
                    <option value="Voice Recorder">Audio Voice Recorder</option>
                    <option value="Tablet">Tablet Device (iPad / Android)</option>
                    <option value="Other">Other Digital Storage Device</option>
                  </select>
                </div>

                {/* Make and model */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-gray-300 font-bold uppercase tracking-wider flex items-center space-x-2">
                    <span className="text-green text-xs font-mono">02</span>
                    <span>Make and model</span>
                  </label>
                  <input
                    type="text"
                    value={makeModel}
                    onChange={(e) => setMakeModel(e.target.value)}
                    placeholder="e.g. Apple iPhone 15 Pro / Samsung Galaxy S24"
                    className="flex-1 bg-black/60 border-2 border-gray-800 focus:border-yellow text-terminal-text px-3 py-2 rounded focus:outline-none"
                  />
                </div>

                {/* Colour */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-gray-300 font-bold uppercase tracking-wider flex items-center space-x-2">
                    <span className="text-green text-xs font-mono">03</span>
                    <span>Colour</span>
                  </label>
                  <input
                    type="text"
                    value={colour}
                    onChange={(e) => setColour(e.target.value)}
                    placeholder="e.g. Space Black / Natural Titanium / Midnight Blue"
                    className="flex-1 bg-black/60 border-2 border-gray-800 focus:border-yellow text-terminal-text px-3 py-2 rounded focus:outline-none"
                  />
                </div>

                {/* Serial number  If available */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-gray-300 font-bold uppercase tracking-wider flex items-center space-x-2">
                    <span className="text-green text-xs font-mono">04</span>
                    <span>Serial number</span>
                    <span className="text-gray-400 font-normal text-[11px] normal-case">(If available)</span>
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. F2LXM94ABC12 or [Not Available]"
                    className="flex-1 bg-black/60 border-2 border-gray-800 focus:border-yellow text-terminal-text px-3 py-2 rounded focus:outline-none"
                  />
                </div>

                {/* IMEI / UIN / UID / MAC / Cloud ID */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-gray-300 font-bold uppercase tracking-wider flex items-center space-x-2">
                    <span className="text-green text-xs font-mono">05</span>
                    <span>IMEI / UIN / UID / MAC / Cloud ID</span>
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 356938035643809 / user@icloud.com"
                    className="flex-1 bg-black/60 border-2 border-gray-800 focus:border-yellow text-terminal-text px-3 py-2 rounded focus:outline-none"
                  />
                </div>

                {/* Ownership relationship  Owned / Maintained / Managed / */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-gray-300 font-bold uppercase tracking-wider flex items-center space-x-2">
                    <span className="text-green text-xs font-mono">06</span>
                    <span>Ownership relationship</span>
                  </label>
                  <div className="flex flex-wrap gap-2 flex-1">
                    {['Owned', 'Maintained', 'Managed', 'Operated'].map((rel) => (
                      <button
                        key={rel}
                        type="button"
                        onClick={() => setOwnership(rel)}
                        className={`px-3 py-1.5 rounded font-mono text-xs font-bold border transition-all ${
                          ownership === rel
                            ? 'bg-yellow text-ink border-ink shadow-[2px_2px_0px_#000]'
                            : 'bg-black/40 text-gray-400 border-gray-800 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        {rel}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions & ENTER Button */}
            <div className="pt-6 border-t-2 border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2 text-muted font-mono text-xs">
                <ShieldCheck className="w-4 h-4 text-green" />
                <span className="truncate max-w-[280px] sm:max-w-md">
                  CANONICAL SHA-256: <strong className="text-yellow">{previewHash.substring(0, 16)}…</strong>
                </span>
              </div>

              {/* ENTER BUTTON */}
              <button
                type="button"
                onClick={handleProceed}
                className="w-full md:w-auto px-8 py-3.5 bg-yellow hover:bg-yellow/90 text-ink font-mono font-black text-sm sm:text-base border-3 border-ink shadow-[5px_5px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all rounded flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>ENTER</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        {/* Security & Confidentiality Stamp */}
        <div className="mt-4 text-center font-mono text-xs text-muted">
          <span>◆ AIR-GAPPED BY DEFAULT · STORED LOCALLY IN BROWSER INDEXEDDB · ZERO TELEMETRY ◆</span>
        </div>
      </div>
    </div>
  );
};

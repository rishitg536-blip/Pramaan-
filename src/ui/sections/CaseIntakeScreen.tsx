import React, { useState, useEffect } from 'react';
import { CaseDetails, CustodyEntry } from '../../core/types';
import { canonicalJson } from '../../core/canonical';
import { sha256Hex } from '../../core/hash';
import { appendCustodyLogEntry, updateCaseDetails } from '../../storage/db';
import { appendEntry } from '../../core/custody';
import { ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';

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
  const [title, setTitle] = useState(caseTitle || '');

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Compute live canonical preview hash as user types
  useEffect(() => {
    const payload = {
      name,
      parentage,
      address,
      title: title || 'Untitled Case Dossier',
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

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = 'Complainant / Deponent name is required.';
    }
    if (!parentage.trim()) {
      errs.parentage = 'Son / daughter / spouse of relationship is required.';
    }
    if (!address.trim()) {
      errs.address = 'Residential / official address is required.';
    }
    if (!title.trim()) {
      errs.title = 'Case title is required.';
    }
    if (!makeModel.trim()) {
      errs.makeModel = 'Device make and model is required.';
    }
    return errs;
  };

  const handleProceed = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setHasAttemptedSubmit(true);

      // Focus first error field
      const firstErrorKey = Object.keys(validationErrors)[0];
      const el = document.getElementById(`intake-${firstErrorKey}`);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setErrors({});
    setIsTransitioning(true);

    const cleanTitle = title.trim();

    const updatedDetails: CaseDetails = {
      ...details,
      name: name.trim(),
      parentage: parentage.trim(),
      address: address.trim(),
      relationship: ownership,
      title: cleanTitle,
      device: {
        ...details.device,
        sourceType,
        model: makeModel.trim(),
        colour: colour.trim(),
        serialNumber: serialNumber.trim(),
        identifier: identifier.trim(),
        ownershipRelationship: ownership,
      },
    };

    // Save to IndexedDB
    await updateCaseDetails(updatedDetails, cleanTitle);

    // Append custody log entry
    let logEntry: CustodyEntry | undefined;
    try {
      logEntry = await appendEntry(
        log,
        'DETAILS_SAVED',
        {
          title: cleanTitle,
          deponentName: name.trim(),
          deviceModel: makeModel.trim(),
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

    // Smooth transition exit delay before revealing main workspace
    setTimeout(() => {
      onEnterWorkspace(updatedDetails, cleanTitle, logEntry);
    }, 550);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#F2EFE2] text-ink overflow-y-auto selection:bg-yellow selection:text-ink transition-all duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] ${
        isTransitioning
          ? '-translate-y-full opacity-0 pointer-events-none filter blur-[3px]'
          : 'translate-y-0 opacity-100'
      }`}
    >
      {/* Background Dot Matrix Grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(rgba(15, 15, 15, 0.22) 1.2px, transparent 1.2px)',
          backgroundSize: '20px 20px',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center min-h-screen">
        {/* Main High-Contrast Window Card */}
        <div className="bg-white border-3 border-ink shadow-[8px_8px_0px_#0F0F0F] rounded-lg overflow-hidden">
          {/* Top Window Bar */}
          <div className="bg-[#0F0F0F] px-4 py-3.5 border-b-3 border-ink flex items-center justify-between text-white">
            <div className="flex items-center space-x-2.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#E8452C] border border-white/40" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#FFE24A] border border-white/40" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#35D07F] border border-white/40" />
              <span className="ml-3 font-mono text-xs sm:text-sm text-white font-black uppercase tracking-wider">
                README.md · CASE DOSSIER &amp; INTAKE // SECTION 63(4) BSA
              </span>
            </div>

            <div className="flex items-center space-x-2 text-xs font-mono text-ink bg-yellow px-2.5 py-1 rounded border-2 border-white/30 font-black uppercase tracking-wider shadow-sm">
              <span className="w-2 h-2 rounded-full bg-ink animate-ping" />
              <span>INITIAL INTAKE</span>
            </div>
          </div>

          {/* Validation Alert Banner */}
          {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
            <div className="bg-red/10 border-b-2 border-red text-ink px-6 py-3.5 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red flex-shrink-0 mt-0.5" />
              <div className="text-xs font-mono">
                <span className="font-bold text-red uppercase block">
                  ALL CASE DETAILS ARE MANDATORY:
                </span>
                <span className="text-ink/80">
                  Please enter all required complainant and device information below before proceeding to the evidence workspace.
                </span>
              </div>
            </div>
          )}

          {/* Form Content */}
          <div className="p-6 sm:p-8 space-y-8 bg-[#FAF8F5]">
            {/* SECTION 1 :- PARTY DETAILS */}
            <div className="space-y-4 bg-white p-5 sm:p-6 rounded-md border-2 border-ink shadow-[4px_4px_0px_#0F0F0F]">
              <div className="border-b-2 border-ink/20 pb-3 flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-black font-sans text-ink uppercase tracking-wide flex items-center space-x-2">
                  <span className="w-2.5 h-5 bg-yellow inline-block rounded-xs border border-ink" />
                  <span>SECTION 1 :- PARTY DETAILS</span>
                </h3>
                <span className="text-[11px] font-mono uppercase text-ink font-black bg-yellow/30 px-2.5 py-1 rounded border border-ink">
                  BSA Schedule Part A
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 font-mono text-xs sm:text-sm pt-1">
                {/* NAME */}
                <div className="flex flex-col sm:flex-row sm:items-start space-y-1.5 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-ink font-bold uppercase tracking-wider flex items-center space-x-2 mt-2">
                    <span className="bg-green/30 text-emerald-950 border border-green px-1.5 py-0.5 rounded text-[11px] font-bold">01</span>
                    <span>NAME: <span className="text-red">*</span></span>
                  </label>
                  <div className="flex-1">
                    <input
                      id="intake-name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                      }}
                      placeholder="Enter Complainant / Deponent full name"
                      className={`w-full bg-white border-2 text-ink px-3.5 py-2.5 rounded focus:outline-none font-mono text-sm placeholder:text-gray-400 ${
                        errors.name
                          ? 'border-red shadow-[2px_2px_0px_#E8452C] bg-red/5'
                          : 'border-ink focus:border-blue shadow-[2px_2px_0px_#0F0F0F]'
                      }`}
                    />
                    {errors.name && (
                      <span className="text-red text-xs font-mono font-bold mt-1 block">
                        ⚠ {errors.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* son / daughter / spouse of: */}
                <div className="flex flex-col sm:flex-row sm:items-start space-y-1.5 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-ink font-bold uppercase tracking-wider flex items-center space-x-2 mt-2">
                    <span className="bg-green/30 text-emerald-950 border border-green px-1.5 py-0.5 rounded text-[11px] font-bold">02</span>
                    <span>son / daughter / spouse of: <span className="text-red">*</span></span>
                  </label>
                  <div className="flex-1">
                    <input
                      id="intake-parentage"
                      type="text"
                      value={parentage}
                      onChange={(e) => {
                        setParentage(e.target.value);
                        if (errors.parentage) setErrors((prev) => ({ ...prev, parentage: '' }));
                      }}
                      placeholder="e.g. S/o, D/o, or W/o [Parent / Spouse Name]"
                      className={`w-full bg-white border-2 text-ink px-3.5 py-2.5 rounded focus:outline-none font-mono text-sm placeholder:text-gray-400 ${
                        errors.parentage
                          ? 'border-red shadow-[2px_2px_0px_#E8452C] bg-red/5'
                          : 'border-ink focus:border-blue shadow-[2px_2px_0px_#0F0F0F]'
                      }`}
                    />
                    {errors.parentage && (
                      <span className="text-red text-xs font-mono font-bold mt-1 block">
                        ⚠ {errors.parentage}
                      </span>
                    )}
                  </div>
                </div>

                {/* address: */}
                <div className="flex flex-col sm:flex-row sm:items-start space-y-1.5 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-ink font-bold uppercase tracking-wider flex items-center space-x-2 mt-2">
                    <span className="bg-green/30 text-emerald-950 border border-green px-1.5 py-0.5 rounded text-[11px] font-bold">03</span>
                    <span>address: <span className="text-red">*</span></span>
                  </label>
                  <div className="flex-1">
                    <textarea
                      id="intake-address"
                      rows={2}
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        if (errors.address) setErrors((prev) => ({ ...prev, address: '' }));
                      }}
                      placeholder="Enter complete residential or official postal address"
                      className={`w-full bg-white border-2 text-ink px-3.5 py-2.5 rounded focus:outline-none font-mono text-sm placeholder:text-gray-400 resize-none ${
                        errors.address
                          ? 'border-red shadow-[2px_2px_0px_#E8452C] bg-red/5'
                          : 'border-ink focus:border-blue shadow-[2px_2px_0px_#0F0F0F]'
                      }`}
                    />
                    {errors.address && (
                      <span className="text-red text-xs font-mono font-bold mt-1 block">
                        ⚠ {errors.address}
                      </span>
                    )}
                  </div>
                </div>

                {/* case title: */}
                <div className="flex flex-col sm:flex-row sm:items-start space-y-1.5 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-blue font-black uppercase tracking-wider flex items-center space-x-2 mt-2">
                    <span className="bg-green/30 text-emerald-950 border border-green px-1.5 py-0.5 rounded text-[11px] font-bold">04</span>
                    <span>case title: <span className="text-red">*</span></span>
                  </label>
                  <div className="flex-1">
                    <input
                      id="intake-title"
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                      }}
                      placeholder="e.g. WhatsApp Stalking &amp; Harassment Dossier 2026"
                      className={`w-full bg-white border-2 text-ink px-3.5 py-2.5 rounded focus:outline-none font-mono text-sm placeholder:text-gray-400 ${
                        errors.title
                          ? 'border-red shadow-[2px_2px_0px_#E8452C] bg-red/5'
                          : 'border-blue shadow-[2px_2px_0px_#0F0F0F]'
                      }`}
                    />
                    {errors.title && (
                      <span className="text-red text-xs font-mono font-bold mt-1 block">
                        ⚠ {errors.title}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2 :- DEVICE INFORMATION */}
            <div className="space-y-4 bg-white p-5 sm:p-6 rounded-md border-2 border-ink shadow-[4px_4px_0px_#0F0F0F]">
              <div className="border-b-2 border-ink/20 pb-3 flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-black font-sans text-ink uppercase tracking-wide flex items-center space-x-2">
                  <span className="w-2.5 h-5 bg-yellow inline-block rounded-xs border border-ink" />
                  <span>SECTION 2 :- DEVICE INFORMATION</span>
                </h3>
                <span className="text-[11px] font-mono uppercase text-ink font-black bg-yellow/30 px-2.5 py-1 rounded border border-ink">
                  BSA Schedule Part B
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 font-mono text-xs sm:text-sm pt-1">
                {/* Source type */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1.5 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-ink font-bold uppercase tracking-wider flex items-center space-x-2">
                    <span className="bg-green/30 text-emerald-950 border border-green px-1.5 py-0.5 rounded text-[11px] font-bold">01</span>
                    <span>Source type</span>
                  </label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="flex-1 bg-white border-2 border-ink focus:border-blue text-ink px-3.5 py-2.5 rounded focus:outline-none shadow-[2px_2px_0px_#0F0F0F] font-mono text-sm font-bold"
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
                <div className="flex flex-col sm:flex-row sm:items-start space-y-1.5 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-ink font-bold uppercase tracking-wider flex items-center space-x-2 mt-2">
                    <span className="bg-green/30 text-emerald-950 border border-green px-1.5 py-0.5 rounded text-[11px] font-bold">02</span>
                    <span>Make and model: <span className="text-red">*</span></span>
                  </label>
                  <div className="flex-1">
                    <input
                      id="intake-makeModel"
                      type="text"
                      value={makeModel}
                      onChange={(e) => {
                        setMakeModel(e.target.value);
                        if (errors.makeModel) setErrors((prev) => ({ ...prev, makeModel: '' }));
                      }}
                      placeholder="e.g. Apple iPhone 15 Pro / OnePlus 11 5G"
                      className={`w-full bg-white border-2 text-ink px-3.5 py-2.5 rounded focus:outline-none font-mono text-sm placeholder:text-gray-400 ${
                        errors.makeModel
                          ? 'border-red shadow-[2px_2px_0px_#E8452C] bg-red/5'
                          : 'border-ink focus:border-blue shadow-[2px_2px_0px_#0F0F0F]'
                      }`}
                    />
                    {errors.makeModel && (
                      <span className="text-red text-xs font-mono font-bold mt-1 block">
                        ⚠ {errors.makeModel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Colour */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1.5 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-ink font-bold uppercase tracking-wider flex items-center space-x-2">
                    <span className="bg-green/30 text-emerald-950 border border-green px-1.5 py-0.5 rounded text-[11px] font-bold">03</span>
                    <span>Colour</span>
                  </label>
                  <input
                    type="text"
                    value={colour}
                    onChange={(e) => setColour(e.target.value)}
                    placeholder="e.g. Space Black / Natural Titanium / Blue"
                    className="flex-1 bg-white border-2 border-ink focus:border-blue text-ink px-3.5 py-2.5 rounded focus:outline-none shadow-[2px_2px_0px_#0F0F0F] font-mono text-sm placeholder:text-gray-400"
                  />
                </div>

                {/* Serial number  If available */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1.5 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-ink font-bold uppercase tracking-wider flex items-center space-x-2">
                    <span className="bg-green/30 text-emerald-950 border border-green px-1.5 py-0.5 rounded text-[11px] font-bold">04</span>
                    <span>Serial number</span>
                    <span className="text-muted font-normal text-xs normal-case">(If available)</span>
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. F2LXM94ABC12 or [Not Available]"
                    className="flex-1 bg-white border-2 border-ink focus:border-blue text-ink px-3.5 py-2.5 rounded focus:outline-none shadow-[2px_2px_0px_#0F0F0F] font-mono text-sm placeholder:text-gray-400"
                  />
                </div>

                {/* IMEI / UIN / UID / MAC / Cloud ID */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-1.5 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-ink font-bold uppercase tracking-wider flex items-center space-x-2">
                    <span className="bg-green/30 text-emerald-950 border border-green px-1.5 py-0.5 rounded text-[11px] font-bold">05</span>
                    <span>IMEI / UIN / UID / MAC / Cloud ID</span>
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 356938035643809 / user@icloud.com"
                    className="flex-1 bg-white border-2 border-ink focus:border-blue text-ink px-3.5 py-2.5 rounded focus:outline-none shadow-[2px_2px_0px_#0F0F0F] font-mono text-sm placeholder:text-gray-400"
                  />
                </div>

                {/* Ownership relationship  Owned / Maintained / Managed / */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <label className="sm:w-64 text-ink font-bold uppercase tracking-wider flex items-center space-x-2">
                    <span className="bg-green/30 text-emerald-950 border border-green px-1.5 py-0.5 rounded text-[11px] font-bold">06</span>
                    <span>Ownership relationship</span>
                  </label>
                  <div className="flex flex-wrap gap-2.5 flex-1">
                    {['Owned', 'Maintained', 'Managed', 'Operated'].map((rel) => (
                      <button
                        key={rel}
                        type="button"
                        onClick={() => setOwnership(rel)}
                        className={`px-4 py-2 rounded font-mono text-xs font-bold border-2 transition-all ${
                          ownership === rel
                            ? 'bg-yellow text-ink border-ink shadow-[3px_3px_0px_#0F0F0F] font-black'
                            : 'bg-white text-ink border-ink/40 hover:border-ink hover:bg-yellow/20'
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
            <div className="pt-4 border-t-2 border-ink/20 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2 text-ink font-mono text-xs bg-gray-100 p-2.5 rounded border border-ink/20">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="truncate max-w-[280px] sm:max-w-md">
                  CANONICAL SHA-256: <strong className="text-ink font-mono bg-yellow/40 px-1 py-0.5 rounded">{previewHash.substring(0, 16)}…</strong>
                </span>
              </div>

              {/* ENTER BUTTON */}
              <button
                type="button"
                onClick={handleProceed}
                className="w-full md:w-auto px-10 py-3.5 bg-yellow hover:bg-[#FFD700] text-ink font-mono font-black text-base sm:text-lg border-3 border-ink shadow-[5px_5px_0px_#0F0F0F] active:translate-x-1 active:translate-y-1 transition-all rounded flex items-center justify-center space-x-3 cursor-pointer"
              >
                <span>ENTER</span>
                <ArrowRight className="w-5 h-5 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>

        {/* Security & Confidentiality Stamp */}
        <div className="mt-4 text-center font-mono text-xs text-muted font-bold">
          <span>◆ AIR-GAPPED BY DEFAULT · STORED LOCALLY IN BROWSER INDEXEDDB · ZERO TELEMETRY ◆</span>
        </div>
      </div>
    </div>
  );
};

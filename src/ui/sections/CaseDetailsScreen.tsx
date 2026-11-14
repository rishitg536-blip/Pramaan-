import React, { useState, useEffect } from 'react';
import { CaseRecord, createCaseRecord, updateCaseRecord } from '../../lib/supabase';
import { CaseDetails, CustodyEntry } from '../../core/types';
import { canonicalJson } from '../../core/canonical';
import { sha256Hex } from '../../core/hash';
import { appendCustodyLogEntry, updateCaseDetails, setActiveCaseDb, getOrCreateCaseMeta, getCustodyLog } from '../../storage/db';
import { appendEntry } from '../../core/custody';
import {
  ShieldAlert,
  ArrowRight,
  Save,
  ArrowLeft,
  Calendar,
  AlertCircle,
  Lock,
  LogOut,
} from 'lucide-react';

interface CaseDetailsScreenProps {
  initialCase?: CaseRecord | null;
  currentUser?: any;
  isLocalMode?: boolean;
  log: CustodyEntry[];
  onEnterWorkspace: (savedCase: CaseRecord, details: CaseDetails, newLogEntry?: CustodyEntry) => void;
  onBackToSelection?: () => void;
  onSignOut?: () => void;
}

const DEVICE_SOURCES = [
  'Mobile Phone',
  'Computer / Storage Media',
  'DVR / NVR',
  'Flash Drive / USB',
  'CD / DVD',
  'Server',
  'Cloud Storage',
  'Other',
];

const OWNERSHIP_RELATIONSHIPS = [
  'Owned',
  'Maintained',
  'Managed',
  'Operated',
  'Authorized Custody',
  'Other',
];

export const CaseDetailsScreen: React.FC<CaseDetailsScreenProps> = ({
  initialCase,
  currentUser,
  isLocalMode = false,
  log: _log,
  onEnterWorkspace,
  onBackToSelection,
  onSignOut,
}) => {
  // Required Fields
  const [caseName, setCaseName] = useState(initialCase?.case_name || '');
  const [caseReference, setCaseReference] = useState(
    initialCase?.case_reference || `CR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [ownerName, setOwnerName] = useState(initialCase?.owner_name || '');
  const [incidentStartDate, setIncidentStartDate] = useState(initialCase?.incident_start_date || '');
  const [incidentEndDate, setIncidentEndDate] = useState(initialCase?.incident_end_date || '');
  const [caseDescription, setCaseDescription] = useState(initialCase?.case_description || '');

  // Optional Fields
  const [relationshipToDevice, setRelationshipToDevice] = useState(
    initialCase?.relationship_to_device || 'Owned'
  );
  const [parentage, setParentage] = useState(initialCase?.parentage || '');
  const [address, setAddress] = useState(initialCase?.address || '');
  const [enableAddress, setEnableAddress] = useState(Boolean(initialCase?.address));
  const [lawyerNotes, setLawyerNotes] = useState(initialCase?.lawyer_notes || '');
  const [assignedLawyer, setAssignedLawyer] = useState(initialCase?.assigned_lawyer || '');

  // Device Specific Attributes (for Section 63(4) statutory certificate)
  const initialDevice: any = initialCase?.device_info || {};
  const [sourceType, setSourceType] = useState<string>(initialDevice.sourceType || 'Mobile Phone');
  const [makeModel, setMakeModel] = useState<string>(initialDevice.model || '');
  const [colour, setColour] = useState<string>(initialDevice.colour || '');
  const [serialNumber, setSerialNumber] = useState<string>(initialDevice.serialNumber || '');
  const [identifier, setIdentifier] = useState<string>(initialDevice.identifier || '');

  // UI state
  const [previewHash, setPreviewHash] = useState('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Sync state whenever initialCase changes (or when resetting to create a brand new case)
  useEffect(() => {
    if (initialCase) {
      setCaseName(initialCase.case_name || '');
      setCaseReference(
        initialCase.case_reference ||
          `CR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      );
      setOwnerName(initialCase.owner_name || '');
      setIncidentStartDate(initialCase.incident_start_date || '');
      setIncidentEndDate(initialCase.incident_end_date || '');
      setCaseDescription(initialCase.case_description || '');
      setRelationshipToDevice(initialCase.relationship_to_device || 'Owned');
      setParentage(initialCase.parentage || '');
      setAddress(initialCase.address || '');
      setEnableAddress(Boolean(initialCase.address));
      setLawyerNotes(initialCase.lawyer_notes || '');
      setAssignedLawyer(initialCase.assigned_lawyer || '');

      const dev: any = initialCase.device_info || {};
      setSourceType(dev.sourceType || 'Mobile Phone');
      setMakeModel(dev.model || '');
      setColour(dev.colour || '');
      setSerialNumber(dev.serialNumber || '');
      setIdentifier(dev.identifier || '');
    } else {
      // Clean slate for brand new case
      setCaseName('');
      setCaseReference(`CR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setOwnerName('');
      setIncidentStartDate('');
      setIncidentEndDate('');
      setCaseDescription('');
      setRelationshipToDevice('Owned');
      setParentage('');
      setAddress('');
      setEnableAddress(false);
      setLawyerNotes('');
      setAssignedLawyer('');
      setSourceType('Mobile Phone');
      setMakeModel('');
      setColour('');
      setSerialNumber('');
      setIdentifier('');
    }
    setErrors({});
    setHasAttemptedSubmit(false);
  }, [initialCase]);

  // Compute live canonical preview hash as user types (only metadata hashes; raw personal details kept segregated)
  useEffect(() => {
    const metaPayload = {
      caseName: caseName.trim(),
      caseReference: caseReference.trim(),
      ownerName: ownerName.trim(),
      incidentStartDate,
      incidentEndDate,
      sourceType,
      makeModel: makeModel.trim(),
      colour: colour.trim(),
      serialNumber: serialNumber.trim(),
      identifier: identifier.trim(),
      relationshipToDevice,
    };
    sha256Hex(canonicalJson(metaPayload)).then(setPreviewHash);
  }, [
    caseName,
    caseReference,
    ownerName,
    incidentStartDate,
    incidentEndDate,
    sourceType,
    makeModel,
    colour,
    serialNumber,
    identifier,
    relationshipToDevice,
  ]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!caseName.trim()) errs.caseName = 'Case name is required.';
    if (!caseReference.trim()) errs.caseReference = 'Case reference number is required.';
    if (!ownerName.trim()) errs.ownerName = 'Evidence owner / concerned person name is required.';
    if (!incidentStartDate) errs.incidentStartDate = 'Incident start date is required.';
    if (!incidentEndDate) errs.incidentEndDate = 'Incident end date is required.';
    if (!caseDescription.trim()) errs.caseDescription = 'Short case description is required.';
    return errs;
  };

  const handleSave = async (isDraft: boolean) => {
    if (!isDraft) {
      const valErrors = validate();
      if (Object.keys(valErrors).length > 0) {
        setErrors(valErrors);
        setHasAttemptedSubmit(true);
        const firstKey = Object.keys(valErrors)[0];
        document.getElementById(`field-${firstKey}`)?.focus();
        return;
      }
    }

    setIsSaving(true);
    setErrors({});

    try {
      const cleanCaseName = caseName.trim() || 'Untitled Case Dossier';
      const cleanReference = caseReference.trim() || `CR-${Date.now()}`;
      const cleanOwnerName = ownerName.trim() || 'Unspecified';

      const devicePayload = {
        sourceType,
        model: makeModel.trim(),
        colour: colour.trim(),
        serialNumber: serialNumber.trim(),
        identifier: identifier.trim(),
        ownershipRelationship: relationshipToDevice,
      };

      const casePayload: Omit<CaseRecord, 'id' | 'created_at' | 'updated_at'> = {
        organization_id: currentUser?.orgId || null,
        created_by: currentUser?.id || 'local_user',
        case_name: cleanCaseName,
        case_reference: cleanReference,
        owner_name: cleanOwnerName,
        incident_start_date: incidentStartDate || null,
        incident_end_date: incidentEndDate || null,
        case_description: caseDescription.trim() || null,
        relationship_to_device: relationshipToDevice,
        parentage: parentage.trim() || null,
        address: enableAddress ? address.trim() : null,
        lawyer_notes: lawyerNotes.trim() || null,
        assigned_lawyer: assignedLawyer.trim() || null,
        device_info: devicePayload,
        status: isDraft ? 'draft' : 'active',
      };

      let savedRecord: CaseRecord;

      if (!isLocalMode && initialCase?.id) {
        await updateCaseRecord(initialCase.id, casePayload);
        savedRecord = { ...initialCase, ...casePayload, updated_at: new Date().toISOString() };
      } else if (!isLocalMode) {
        savedRecord = await createCaseRecord(casePayload);
      } else {
        // Local mode fallback
        savedRecord = {
          ...casePayload,
          id: initialCase?.id || `local_case_${Date.now()}`,
          created_at: initialCase?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          evidence_count: 0,
          last_fingerprint_status: 'Unsealed',
        };
      }

      // Convert to legacy CaseDetails for compatibility with Section 63(4) statutory certificate & workspace
      const legacyDetails: CaseDetails = {
        name: cleanOwnerName,
        parentage: parentage.trim(),
        address: enableAddress ? address.trim() : '',
        relationship: relationshipToDevice,
        title: cleanCaseName,
        device: {
          sourceType,
          model: makeModel.trim(),
          colour: colour.trim(),
          serialNumber: serialNumber.trim(),
          identifier: identifier.trim(),
          ownershipRelationship: relationshipToDevice,
        },
      };

      // Switch active DB to the saved case before persisting details
      setActiveCaseDb(savedRecord.id);

      // Ensure case metadata and genesis log entry exist in this case DB
      await getOrCreateCaseMeta();
      await updateCaseDetails(legacyDetails, cleanCaseName);

      // Append DETAILS_SAVED linked directly to this case's custody log
      let newLogEntry: CustodyEntry | undefined;
      try {
        const caseLog = await getCustodyLog();
        newLogEntry = await appendEntry(caseLog, 'DETAILS_SAVED', {
          caseId: savedRecord.id,
          title: cleanCaseName,
          reference: cleanReference,
          owner: cleanOwnerName,
          canonicalHash: previewHash,
          isDraft,
          timestamp: new Date().toISOString(),
        });
        await appendCustodyLogEntry(newLogEntry);
      } catch (logErr) {
        console.warn('Could not append custody entry on case details save:', logErr);
      }

      onEnterWorkspace(savedRecord, legacyDetails, newLogEntry);
    } catch (err: unknown) {
      console.error('Failed to save case details:', err);
      setErrors({ global: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsSaving(false);
    }
  };

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

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center min-h-screen">
        {/* Main High-Contrast Window Card */}
        <div className="bg-white border-3 border-ink shadow-[8px_8px_0px_#0F0F0F] rounded-lg overflow-hidden">
          {/* Top Window Bar */}
          <div className="bg-[#0F0F0F] px-4 py-3 border-b-3 border-ink flex items-center justify-between text-white">
            <div className="flex items-center space-x-2.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#E8452C] border border-white/40" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#FFE24A] border border-white/40" />
              <div className="w-3.5 h-3.5 rounded-full bg-[#35D07F] border border-white/40" />
              <span className="ml-3 font-mono text-xs sm:text-sm text-white font-black uppercase tracking-wider">
                CASE DOSSIER FORM // SECTION 63(4) BSA COMPLIANT
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {onBackToSelection && (
                <button
                  type="button"
                  onClick={onBackToSelection}
                  className="px-2 py-0.5 bg-paper hover:bg-yellow text-ink font-mono text-xs font-bold border border-white/30 rounded flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Cases</span>
                </button>
              )}
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="px-2 py-0.5 bg-paper hover:bg-red hover:text-white text-ink font-mono text-xs font-bold border border-white/30 rounded flex items-center space-x-1 transition-colors"
                  title={isLocalMode ? 'Exit local mode and return to login page' : 'Sign out'}
                >
                  <LogOut className="w-3 h-3" />
                  <span>{isLocalMode ? 'Exit to Login' : 'Sign Out'}</span>
                </button>
              )}
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-yellow text-ink border border-ink shadow-brutal-sm">
                {isLocalMode ? 'LOCAL MODE' : 'CLOUD REPOSITORY'}
              </span>
            </div>
          </div>

          {/* Validation Alert */}
          {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
            <div className="bg-red/10 border-b-2 border-red text-ink px-6 py-3.5 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red flex-shrink-0 mt-0.5" />
              <div className="text-xs font-mono">
                <span className="font-bold text-red uppercase block">
                  PLEASE COMPLETE REQUIRED CASE FIELDS:
                </span>
                <span className="text-ink/80">
                  Case name, reference number, deponent/owner name, date range, and short description are required.
                </span>
              </div>
            </div>
          )}

          <div className="p-6 sm:p-8 space-y-8">
            {/* Header info */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-ink font-sans tracking-tight">
                {initialCase ? 'Review & Update Case Details' : 'Create New Case Dossier'}
              </h1>
              <p className="mt-1 text-xs font-mono text-muted">
                Section 63(4) Bharatiya Sakshya Adhiniyam, 2023 evidentiary metadata record.
              </p>
            </div>

            {/* MANDATORY PRIVACY NOTICE BOX */}
            <div className="p-4 bg-amber-50 border-2 border-amber-500 rounded-md flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs font-mono text-amber-950 space-y-1">
                <div className="font-bold uppercase tracking-wide">
                  MANDATORY PRIVACY WARNING
                </div>
                <p className="leading-relaxed">
                  Personal details are sensitive. Only provide information needed for this case. Personal details must not be included in the case fingerprint unless the implementation explicitly hashes them according to the approved data model.
                </p>
                <div className="text-[10px] text-amber-800 pt-1 flex items-center space-x-2">
                  <span className="inline-flex items-center gap-1 font-bold">
                    <Lock className="w-3 h-3" /> Raw details kept private
                  </span>
                  <span>•</span>
                  <span>Only canonical hashes enter the custody log</span>
                </div>
              </div>
            </div>

            {/* SECTION 1: REQUIRED CASE IDENTIFIERS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-ink pb-2">
                <h2 className="text-sm font-mono font-black uppercase text-ink flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-ink text-white rounded text-[11px]">1</span>
                  <span>CASE DOSSIER IDENTIFIERS (REQUIRED)</span>
                </h2>
                <span className="text-[10px] font-mono text-red font-bold">* MANDATORY</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                    Case Name / Title *
                  </label>
                  <input
                    id="field-caseName"
                    type="text"
                    required
                    placeholder="e.g. State vs. Kumar (Forensic Dossier)"
                    value={caseName}
                    onChange={(e) => setCaseName(e.target.value)}
                    className={`w-full px-3.5 py-2.5 bg-paper border-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow ${
                      errors.caseName ? 'border-red bg-red/5' : 'border-ink'
                    }`}
                  />
                  {errors.caseName && (
                    <span className="text-[10px] font-mono text-red font-bold mt-1 block">
                      {errors.caseName}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                    Case Reference Number *
                  </label>
                  <input
                    id="field-caseReference"
                    type="text"
                    required
                    placeholder="CR-2026-4892"
                    value={caseReference}
                    onChange={(e) => setCaseReference(e.target.value)}
                    className={`w-full px-3.5 py-2.5 bg-paper border-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow ${
                      errors.caseReference ? 'border-red bg-red/5' : 'border-ink'
                    }`}
                  />
                  {errors.caseReference && (
                    <span className="text-[10px] font-mono text-red font-bold mt-1 block">
                      {errors.caseReference}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                  Evidence Owner or Concerned Person (Deponent) *
                </label>
                <input
                  id="field-ownerName"
                  type="text"
                  required
                  placeholder="Full legal name of the person producing electronic record"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-paper border-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow ${
                    errors.ownerName ? 'border-red bg-red/5' : 'border-ink'
                  }`}
                />
                {errors.ownerName && (
                  <span className="text-[10px] font-mono text-red font-bold mt-1 block">
                    {errors.ownerName}
                  </span>
                )}
              </div>

              {/* Date Range of Incident / Evidence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                    Incident / Evidence Start Date *
                  </label>
                  <div className="relative">
                    <input
                      id="field-incidentStartDate"
                      type="date"
                      required
                      value={incidentStartDate}
                      onChange={(e) => setIncidentStartDate(e.target.value)}
                      className={`w-full pl-9 pr-3.5 py-2.5 bg-paper border-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow ${
                        errors.incidentStartDate ? 'border-red bg-red/5' : 'border-ink'
                      }`}
                    />
                    <Calendar className="w-4 h-4 text-muted absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                  {errors.incidentStartDate && (
                    <span className="text-[10px] font-mono text-red font-bold mt-1 block">
                      {errors.incidentStartDate}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                    Incident / Evidence End Date *
                  </label>
                  <div className="relative">
                    <input
                      id="field-incidentEndDate"
                      type="date"
                      required
                      value={incidentEndDate}
                      onChange={(e) => setIncidentEndDate(e.target.value)}
                      className={`w-full pl-9 pr-3.5 py-2.5 bg-paper border-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow ${
                        errors.incidentEndDate ? 'border-red bg-red/5' : 'border-ink'
                      }`}
                    />
                    <Calendar className="w-4 h-4 text-muted absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                  {errors.incidentEndDate && (
                    <span className="text-[10px] font-mono text-red font-bold mt-1 block">
                      {errors.incidentEndDate}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                  Short Case Description * (Confidential)
                </label>
                <textarea
                  id="field-caseDescription"
                  required
                  rows={3}
                  placeholder="Summary of the dispute or forensic scope (e.g. WhatsApp extortion messages and financial transfer screenshots)."
                  value={caseDescription}
                  onChange={(e) => setCaseDescription(e.target.value)}
                  className={`w-full px-3.5 py-2 bg-paper border-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow resize-y ${
                    errors.caseDescription ? 'border-red bg-red/5' : 'border-ink'
                  }`}
                />
                {errors.caseDescription && (
                  <span className="text-[10px] font-mono text-red font-bold mt-1 block">
                    {errors.caseDescription}
                  </span>
                )}
                <span className="text-[10px] font-mono text-muted block mt-0.5">
                  Private case description is stored in access-controlled database and never leaked to public verifiers.
                </span>
              </div>
            </div>

            {/* SECTION 2: DEVICE & STATUTORY CERTIFICATE METADATA */}
            <div className="space-y-4 pt-4 border-t-2 border-ink">
              <div className="flex items-center justify-between border-b-2 border-ink pb-2">
                <h2 className="text-sm font-mono font-black uppercase text-ink flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-ink text-white rounded text-[11px]">2</span>
                  <span>DEVICE &amp; SOURCE INFORMATION (SECTION 63(4) SCHEDULE)</span>
                </h2>
                <span className="text-[10px] font-mono text-muted">FOR STATUTORY PART A</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                    Device Source Type
                  </label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                  >
                    {DEVICE_SOURCES.map((ds) => (
                      <option key={ds} value={ds}>
                        {ds}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                    Make &amp; Model
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apple iPhone 15 Pro"
                    value={makeModel}
                    onChange={(e) => setMakeModel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                    Colour
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Natural Titanium / Black"
                    value={colour}
                    onChange={(e) => setColour(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                    Serial Number (if available)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. F2LZW123ABCD"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                    IMEI / UID / Cloud ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 352849102938475"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                  Ownership / Custody Relationship
                </label>
                <select
                  value={relationshipToDevice}
                  onChange={(e) => setRelationshipToDevice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                >
                  {OWNERSHIP_RELATIONSHIPS.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel} by deponent
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SECTION 3: OPTIONAL STATUTORY & LEGAL PARTICULARS */}
            <div className="space-y-4 pt-4 border-t-2 border-ink">
              <div className="flex items-center justify-between border-b-2 border-ink pb-2">
                <h2 className="text-sm font-mono font-black uppercase text-ink flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-ink text-white rounded text-[11px]">3</span>
                  <span>OPTIONAL LEGAL PARTICULARS &amp; CERTIFICATE BLANKS</span>
                </h2>
                <span className="text-[10px] font-mono text-muted">CONFIDENTIAL</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                    Son / Daughter / Spouse of (Parentage)
                  </label>
                  <input
                    type="text"
                    placeholder="Required for Section 63(4) statutory certificate deponent blank"
                    value={parentage}
                    onChange={(e) => setParentage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                    Assigned Lawyer or Investigator
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Adv. S. Mehta / Cyber Cell Unit 4"
                    value={assignedLawyer}
                    onChange={(e) => setAssignedLawyer(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                  />
                </div>
              </div>

              {/* Residential Address Toggle */}
              <div>
                <label className="inline-flex items-center space-x-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={enableAddress}
                    onChange={(e) => setEnableAddress(e.target.checked)}
                    className="w-4 h-4 border-2 border-ink accent-yellow cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold uppercase text-ink">
                    Include deponent residential/official address in certificate
                  </span>
                </label>
                {enableAddress && (
                  <textarea
                    rows={2}
                    placeholder="Full residential or official address of the deponent"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-ink mb-1">
                  Notes for the Lawyer or Forensic Expert (Private)
                </label>
                <textarea
                  rows={2}
                  placeholder="Special instructions, chain of custody observations, or forensic notes..."
                  value={lawyerNotes}
                  onChange={(e) => setLawyerNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-paper border-2 border-ink font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow"
                />
              </div>
            </div>

            {/* LIVE TELEMETRY CANONICAL PREVIEW */}
            <div className="p-4 bg-terminal text-terminal-text border border-ink rounded font-mono text-xs space-y-1">
              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <span>CANONICAL DOSSIER METADATA HASH (SHA-256):</span>
                <span className="text-green font-bold">READY</span>
              </div>
              <div className="text-yellow text-[11px] break-all">
                {previewHash}
              </div>
              <div className="text-[9px] text-gray-400 pt-1">
                Raw deponent particulars are kept separate from the Merkle tree and public verification files.
              </div>
            </div>

            {/* BUTTON BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t-2 border-ink">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none py-2.5 px-4 bg-paper hover:bg-gray-100 text-ink font-mono text-xs font-bold border-2 border-ink shadow-brutal-sm flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5 text-muted" />
                  <span>Save as Draft</span>
                </button>

                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="flex-1 sm:flex-none py-2.5 px-4 bg-paper hover:bg-red/10 text-ink font-mono text-xs font-bold border-2 border-ink shadow-brutal-sm flex items-center justify-center space-x-1.5 transition-colors"
                    title={isLocalMode ? 'Exit local mode and return to login page' : 'Sign out'}
                  >
                    <LogOut className="w-3.5 h-3.5 text-muted" />
                    <span>{isLocalMode ? 'Exit Local' : 'Sign Out'}</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="w-full sm:w-auto py-3 px-6 bg-yellow hover:bg-yellow/90 text-ink font-mono font-black text-xs uppercase tracking-wider border-2 border-ink shadow-[4px_4px_0px_#0F0F0F] flex items-center justify-center space-x-2 transition-all active:translate-x-0.5 active:translate-y-0.5"
              >
                {isSaving ? (
                  <span>Saving Dossier...</span>
                ) : (
                  <>
                    <span>Enter Evidence Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


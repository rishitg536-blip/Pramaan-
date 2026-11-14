import React, { useState, useEffect } from 'react';
import { DerivedItem } from '../../core/types';
import {
  Clock,
  CheckCircle2,
  CheckCheck,
  Edit2,
  FileText,
  Image as ImageIcon,
  Mic,
  MessageSquare,
  ExternalLink,
  Filter,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';

interface TimelineSectionProps {
  items: DerivedItem[];
  isBuilding: boolean;
  onBuildTimeline: () => void;
  onConfirmItem: (id: string) => void;
  onConfirmAll?: (confirmValue?: boolean) => void;
  onEditItemText: (id: string, newText: string) => void;
  onScrollToFile: (fileId: string) => void;
}

export const TimelineSection: React.FC<TimelineSectionProps> = ({
  items,
  isBuilding,
  onBuildTimeline,
  onConfirmItem,
  onConfirmAll,
  onEditItemText,
  onScrollToFile,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'chat' | 'ocr' | 'transcript'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isPacketCollapsed, setIsPacketCollapsed] = useState<boolean>(true);

  const allConfirmed = items.length > 0 && items.every((item) => item.confirmed);
  const confirmedCount = items.filter((item) => item.confirmed).length;

  // Auto-collapse into packet when all items are confirmed
  useEffect(() => {
    if (allConfirmed) {
      setIsPacketCollapsed(true);
    }
  }, [allConfirmed]);

  const filteredItems = items.filter((item) => {
    if (filterType === 'all') return true;
    if (filterType === 'chat') {
      const lower = item.sourceRef.fileName.toLowerCase();
      return lower.endsWith('.txt') || lower.endsWith('.zip');
    }
    if (filterType === 'ocr') {
      const lower = item.sourceRef.fileName.toLowerCase();
      return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp');
    }
    if (filterType === 'transcript') {
      const lower = item.sourceRef.fileName.toLowerCase();
      const isAudio = /\.(mp3|wav|ogg|m4a|opus|aac|flac|webm)$/i.test(lower);
      return isAudio || item.sender === 'Voice Recording';
    }
    return true;
  });

  const getSourceIcon = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.txt') || lower.endsWith('.zip')) {
      return <MessageSquare className="w-3.5 h-3.5 text-blue" />;
    }
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
      return <ImageIcon className="w-3.5 h-3.5 text-pink" />;
    }
    if (/\.(mp3|wav|ogg|m4a|opus|aac|flac|webm)$/i.test(lower) || lower.includes('voice') || lower.includes('audio')) {
      return <Mic className="w-3.5 h-3.5 text-green" />;
    }
    return <FileText className="w-3.5 h-3.5 text-muted" />;
  };

  const startEdit = (item: DerivedItem) => {
    setEditingId(item.id);
    setEditValue(item.userText || item.text);
  };

  const saveEdit = (id: string) => {
    onEditItemText(id, editValue);
    setEditingId(null);
  };

  const handleConfirmAllClick = () => {
    if (onConfirmAll) {
      if (allConfirmed) {
        onConfirmAll(false); // Unconfirm all
        setIsPacketCollapsed(false);
      } else {
        onConfirmAll(true); // Confirm all
        setIsPacketCollapsed(true);
      }
    }
  };

  // Derive packet metrics
  const timestamps = items.map((i) => i.ts).filter(Boolean) as string[];
  const earliestDate = timestamps.length > 0 ? timestamps[0].replace('T', ' ') : 'Start of timeline';
  const latestDate = timestamps.length > 0 ? timestamps[timestamps.length - 1].replace('T', ' ') : 'End of timeline';

  // Group unique source files
  const sourceFileMap: Record<string, { fileName: string; count: number }> = {};
  items.forEach((it) => {
    const fid = it.sourceRef.fileId;
    if (!sourceFileMap[fid]) {
      sourceFileMap[fid] = { fileName: it.sourceRef.fileName, count: 0 };
    }
    sourceFileMap[fid].count++;
  });
  const sourceFiles = Object.entries(sourceFileMap).map(([fileId, data]) => ({
    fileId,
    fileName: data.fileName,
    count: data.count,
  }));

  return (
    <section id="section-timeline" className="py-8 px-4 sm:px-6 lg:px-8 border-b-4 border-ink bg-paper">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 bg-purple-600 text-white border-2 border-ink text-[10px] font-mono font-black uppercase tracking-wider shadow-brutal-sm">
            FEATURE 03 // EVIDENCE TIMELINE RECONSTRUCTION (timeline)
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-ink pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-purple-700" />
              <h2 className="text-xl font-bold font-mono uppercase tracking-wider text-ink">
                EVIDENCE TIMELINE
              </h2>
            </div>
            <p className="text-xs font-mono text-muted mt-1">
              Deterministic chronological merge of chats, OCR screenshots, and voice notes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {items.length > 0 && onConfirmAll && (
              <button
                data-guide="timeline.confirmAll"
                onClick={handleConfirmAllClick}
                className={`neo-btn px-3 py-2 font-mono text-xs font-bold flex items-center space-x-1.5 shadow-brutal transition-colors ${
                  allConfirmed
                    ? 'bg-green text-ink border-2 border-ink'
                    : 'bg-white hover:bg-green/20 text-ink border-2 border-ink'
                }`}
                title={allConfirmed ? 'Click to unconfirm all items' : 'Confirm all items and collapse into 1 packet'}
              >
                <CheckCheck className={`w-4 h-4 ${allConfirmed ? 'text-ink' : 'text-green'}`} />
                <span>{allConfirmed ? 'ALL CONFIRMED ✓' : 'CONFIRM ALL'}</span>
              </button>
            )}

            <button
              data-guide="timeline.build"
              onClick={onBuildTimeline}
              disabled={isBuilding}
              className="neo-btn px-4 py-2 bg-yellow hover:bg-yellow/80 text-ink font-mono text-xs font-bold flex items-center space-x-2 shadow-brutal disabled:opacity-50"
            >
              <span>{isBuilding ? 'BUILDING TIMELINE...' : 'MERGE & BUILD TIMELINE'}</span>
            </button>
          </div>
        </div>

        {/* Progress or Status */}
        {isBuilding && (
          <div
            data-guide="timeline.progress"
            className="p-3 bg-terminal text-green font-mono text-xs border-2 border-ink flex items-center space-x-2"
          >
            <div className="w-3 h-3 border-2 border-green border-t-transparent rounded-full animate-spin" />
            <span>Scanning evidence files and ordering timestamps...</span>
          </div>
        )}

        {/* Items Container */}
        {items.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-ink/40 bg-paper font-mono text-xs text-muted">
            No timeline items generated yet. Click "MERGE & BUILD TIMELINE" to parse your added evidence files.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filter and packet toggle bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div data-guide="timeline.filter" className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold text-ink flex items-center space-x-1 mr-1">
                  <Filter className="w-3 h-3" />
                  <span>FILTER:</span>
                </span>
                {(['all', 'chat', 'ocr', 'transcript'] as const).map((type) => (
                  <button
                    key={type}
                    data-guide="timeline.filterButton"
                    onClick={() => setFilterType(type)}
                    className={`px-2.5 py-1 text-xs font-mono font-bold border-2 border-ink transition-colors uppercase ${
                      filterType === type ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-yellow'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono ml-auto">
                <span className="text-muted">
                  {confirmedCount}/{items.length} confirmed
                </span>

                {allConfirmed && (
                  <button
                    data-guide="timeline.packetToggle"
                    onClick={() => setIsPacketCollapsed(!isPacketCollapsed)}
                    className="neo-btn px-2.5 py-1 bg-paper hover:bg-yellow text-ink border-2 border-ink font-bold flex items-center space-x-1"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{isPacketCollapsed ? 'EXPAND FULL STREAM' : 'COLLAPSE TO 1 PACKET'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* If all items are confirmed and packet is collapsed -> Show Single Packet Card */}
            {allConfirmed && isPacketCollapsed ? (
              <div className="neo-card bg-paper border-4 border-ink shadow-brutal p-6 relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-ink pb-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-full bg-green/20 border-2 border-green flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-6 h-6 text-green" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-mono text-base font-bold text-ink uppercase tracking-wide">
                          CONFIRMED TIMELINE EVIDENCE PACKET
                        </h3>
                        <span className="px-2.5 py-0.5 text-[10px] font-mono font-black bg-green text-ink border-2 border-ink shadow-brutal-sm inline-flex items-center gap-1 uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3 text-ink" />
                          VERIFIED PACKET ✓
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-yellow text-ink border border-ink shadow-brutal-sm">
                          {items.length} ITEMS SEALED
                        </span>
                      </div>
                      <p className="text-xs font-mono text-muted mt-1 leading-relaxed">
                        All {items.length} extracted chronological items from {sourceFiles.length} evidence file(s) have been verified and collapsed into this single evidentiary packet.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      data-guide="timeline.packetToggle"
                      onClick={() => setIsPacketCollapsed(false)}
                      className="neo-btn px-3 py-1.5 bg-yellow hover:bg-yellow/80 text-ink font-mono text-xs font-bold border-2 border-ink flex items-center space-x-1.5 shadow-brutal-sm"
                    >
                      <ChevronDown className="w-4 h-4" />
                      <span>EXPAND FULL STREAM ({items.length} ITEMS)</span>
                    </button>
                  </div>
                </div>

                {/* Packet Summary Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 text-xs font-mono">
                  <div className="bg-paper p-3 border-2 border-ink">
                    <span className="text-[10px] text-muted block uppercase font-bold">TOTAL VERIFIED</span>
                    <span className="text-base font-bold text-ink">{items.length} items</span>
                  </div>
                  <div className="bg-paper p-3 border-2 border-ink">
                    <span className="text-[10px] text-muted block uppercase font-bold">TIME SPAN</span>
                    <span className="text-xs font-bold text-ink truncate block" title={`${earliestDate} → ${latestDate}`}>
                      {earliestDate.split('T')[0] || earliestDate} → {latestDate.split('T')[0] || latestDate}
                    </span>
                  </div>
                  <div className="bg-paper p-3 border-2 border-ink">
                    <span className="text-[10px] text-muted block uppercase font-bold">SOURCES</span>
                    <span className="text-xs font-bold text-ink">{sourceFiles.length} file(s) bundled</span>
                  </div>
                  <div className="bg-paper p-3 border-2 border-ink">
                    <span className="text-[10px] text-muted block uppercase font-bold">PACKET STATUS</span>
                    <span className="text-xs font-bold text-emerald-800 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green inline" />
                      <span>100% CONFIRMED</span>
                    </span>
                  </div>
                </div>

                {/* Included Sources Tags */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-ink/20">
                  <span className="text-[10px] font-mono font-bold text-muted uppercase">Included in packet:</span>
                  {sourceFiles.map((sf) => (
                    <button
                      key={sf.fileId}
                      onClick={() => onScrollToFile(sf.fileId)}
                      className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 border border-ink/40 bg-paper hover:bg-yellow rounded transition-colors"
                      title="Click to jump to evidence file card"
                    >
                      {getSourceIcon(sf.fileName)}
                      <span className="truncate max-w-[140px] font-bold">{sf.fileName}</span>
                      <span className="text-muted text-[9px]">({sf.count} lines)</span>
                      <ExternalLink className="w-2.5 h-2.5 text-muted" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Expanded Full Stream */
              <div className="space-y-3">
                {allConfirmed && (
                  <div className="flex items-center justify-between p-2.5 bg-green/10 border-2 border-green text-emerald-950 font-mono text-xs">
                    <span className="font-bold flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-green" />
                      <span>All {items.length} items confirmed. Click "Collapse to 1 Packet" to condense this view.</span>
                    </span>
                    <button
                      data-guide="timeline.packetToggle"
                      onClick={() => setIsPacketCollapsed(true)}
                      className="px-2 py-0.5 bg-green text-ink border border-ink font-bold shadow-brutal-sm hover:opacity-90 flex items-center space-x-1"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Collapse to 1 Packet</span>
                    </button>
                  </div>
                )}

                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    data-guide="timeline.item"
                    className="neo-card p-4 bg-paper border-2 border-ink shadow-brutal flex flex-col md:flex-row gap-4 items-start justify-between"
                  >
                    {/* Left: Time and Sender */}
                    <div className="w-full md:w-56 shrink-0 space-y-1">
                      <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-ink">
                        <Clock className="w-3 h-3 text-muted" />
                        <span>{item.ts ? item.ts.replace('T', ' ') : 'NO TIMESTAMP'}</span>
                      </div>

                      <div className="text-xs font-mono font-semibold text-field truncate">
                        {item.sender ? item.sender : <span className="text-muted italic">System / Unspecified</span>}
                      </div>

                      {/* Source file tag */}
                      <div className="pt-1">
                        <button
                          data-guide="timeline.sourceLink"
                          onClick={() => onScrollToFile(item.sourceRef.fileId)}
                          className="inline-flex items-center space-x-1 text-[10px] font-mono px-1.5 py-0.5 border border-ink/40 bg-paper hover:bg-yellow transition-colors rounded"
                        >
                          {getSourceIcon(item.sourceRef.fileName)}
                          <span className="truncate max-w-[120px]">{item.sourceRef.fileName}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-muted" />
                        </button>
                        {item.sourceRef.line && (
                          <span className="text-[10px] font-mono text-muted ml-1">
                            :L{item.sourceRef.line}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Message content or edit input */}
                    <div className="flex-1 min-w-0 w-full space-y-2">
                      {editingId === item.id ? (
                        <div className="space-y-2">
                          <textarea
                            data-guide="timeline.editText"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full p-2 border-2 border-ink font-mono text-xs bg-paper focus:bg-white resize-y"
                            rows={3}
                          />
                          <div className="flex space-x-2">
                            <button
                              data-guide="timeline.saveCorrection"
                              onClick={() => saveEdit(item.id)}
                              className="px-2 py-0.5 bg-ink text-paper font-mono text-xs font-bold"
                            >
                              Save Correction
                            </button>
                            <button
                              data-guide="timeline.cancelCorrection"
                              onClick={() => setEditingId(null)}
                              className="px-2 py-0.5 bg-paper text-ink border border-ink font-mono text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {/* Visual Indicator for Audio Transcripts */}
                          {(item.sender === 'Voice Recording' || /\.(mp3|wav|ogg|m4a|opus|aac|flac|webm)$/i.test(item.sourceRef.fileName)) && (
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="px-2 py-0.5 bg-green/20 text-emerald-900 border border-green text-[10px] font-mono font-bold uppercase inline-flex items-center gap-1">
                                <Mic className="w-3 h-3 text-green" /> AUDIO TRANSCRIPTION
                              </span>
                              <span className="text-[10px] font-mono text-muted">Speech-to-text extraction</span>
                            </div>
                          )}
                          <p className="font-sans text-xs text-ink whitespace-pre-wrap leading-relaxed font-medium">
                            {item.userText || item.text}
                          </p>
                          {item.userText && (
                            <span className="text-[10px] font-mono text-muted italic block mt-1">
                              (Edited by user; original preserved: "{item.text.slice(0, 40)}...")
                            </span>
                          )}
                        </div>
                      )}

                      {/* Flags (deleted, edited, system, etc) */}
                      {item.flags && item.flags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.flags.map((flag) => (
                            <span
                              key={flag}
                              className="px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase border border-ink/40 bg-yellow/30 text-ink"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Attachment metadata */}
                      {item.attachment && (
                        <div className="flex items-center space-x-1.5 text-[11px] font-mono text-muted bg-paper p-1.5 border border-ink/20">
                          <FileText className="w-3 h-3 text-ink" />
                          <span>
                            Attachment:{' '}
                            {item.attachment.omitted
                              ? '[Media omitted in export]'
                              : item.attachment.name || 'Unknown file'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: Confirmation and Edit buttons */}
                    <div className="flex items-center space-x-2 shrink-0 pt-2 md:pt-0 self-end md:self-start">
                      <button
                        data-guide="timeline.edit"
                        onClick={() => startEdit(item)}
                        className="p-1 border border-ink hover:bg-paper rounded text-ink"
                        title="Correct or annotate text"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        data-guide="timeline.confirm"
                        onClick={() => onConfirmItem(item.id)}
                        className={`px-2 py-1 font-mono text-xs font-bold border-2 border-ink flex items-center space-x-1 transition-colors ${
                          item.confirmed
                            ? 'bg-green/30 text-emerald-950 border-green'
                            : 'bg-paper hover:bg-green/10 text-ink'
                        }`}
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${item.confirmed ? 'text-green' : 'text-muted'}`} />
                        <span>{item.confirmed ? 'CONFIRMED ✓' : 'CONFIRM'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

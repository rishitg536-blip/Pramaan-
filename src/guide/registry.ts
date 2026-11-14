export type GuideDataClass = 'none' | 'device' | 'fingerprint' | 'helper' | 'cloud';

export interface GuideEntry {
  id: string;
  title: string;
  what: string;
  when?: string;
  data: GuideDataClass;
  careful?: string;
  next?: string;
  related?: string[];
}

export const GUIDE_REGISTRY: Record<string, GuideEntry> = {
  // Global
  'global.ticker': {
    id: 'global.ticker',
    title: 'Custody Git Ticker',
    what: 'The strip at the top lists your latest custody-log entries, like a diary of what you did.',
    when: 'Look here to verify that your recent actions were chained into the ledger.',
    data: 'device',
  },
  'global.quickExit': {
    id: 'global.quickExit',
    title: 'Quick Exit (Panic Button)',
    what: 'Instantly leaves this page and opens a neutral weather website, in case someone walks in.',
    when: 'Use if you are in a compromised environment and need to conceal your activity.',
    data: 'none',
    careful: 'It does not delete your saved evidence or custody log.',
  },
  'global.backToTop': {
    id: 'global.backToTop',
    title: 'Back to Top',
    what: 'Smoothly scrolls back to the top orientation section of the case workspace.',
    data: 'none',
  },
  'global.verifyPill': {
    id: 'global.verifyPill',
    title: 'Standalone Verify Link',
    what: 'Opens the standalone offline verify page where anyone can check a file against a fingerprint file.',
    when: 'Send this page to a lawyer, expert, or investigator to test evidence integrity.',
    data: 'device',
  },
  'global.guidePill': {
    id: 'global.guidePill',
    title: 'Guide Mode Toggle',
    what: 'Turns Guide Mode on or off. While on, click anything on the screen to learn what it does instead of triggering it.',
    data: 'none',
  },
  'global.modeChip': {
    id: 'global.modeChip',
    title: 'Privacy Mode Indicator',
    what: 'Shows whether AI features can access the internet. Local Mode keeps 100% of data on your device.',
    when: 'Click to open the Privacy Drawer to toggle Cloud AI or view the AI-call log.',
    data: 'device',
  },

  // Hero & Stats
  'hero.stat.files': {
    id: 'hero.stat.files',
    title: 'Hashed Files Count',
    what: 'The total number of original evidence files that have been hashed and stored locally.',
    data: 'device',
  },
  'hero.stat.log': {
    id: 'hero.stat.log',
    title: 'Chained Log Entries',
    what: 'How many cryptographically chained custody log records exist for this case.',
    data: 'device',
  },
  'hero.stat.seal': {
    id: 'hero.stat.seal',
    title: 'Case Seal Status',
    what: 'Whether the case is sealed and which seal snapshot number represents all current evidence.',
    data: 'device',
  },
  'hero.stat.timestamp': {
    id: 'hero.stat.timestamp',
    title: 'Public Timestamp Status',
    what: 'State of the public cryptographic timestamp: not requested, pending, or confirmed on the Bitcoin blockchain.',
    data: 'fingerprint',
  },
  'hero.typeBar': {
    id: 'hero.typeBar',
    title: 'Evidence Breakdown Bar',
    what: 'Visual share of file types collected in your case (chat exports, images, voice notes, others).',
    data: 'device',
  },

  // Editor Window & Tabs
  'editor.tab.readme': {
    id: 'editor.tab.readme',
    title: 'README.md Tab',
    what: 'Jumps to the Case Details editor where you enter Section 63(4) Part A deponent information.',
    data: 'device',
  },
  'editor.tab.evidence': {
    id: 'editor.tab.evidence',
    title: 'evidence/ Tab',
    what: 'Jumps to the evidence gallery to add and inspect fingerprinted files.',
    data: 'device',
  },
  'editor.tab.timeline': {
    id: 'editor.tab.timeline',
    title: 'timeline/ Tab',
    what: 'Jumps to the merged date-wise timeline combining parsed chats, OCR, and transcripts.',
    data: 'device',
  },
  'editor.tab.checks': {
    id: 'editor.tab.checks',
    title: 'checks/ Tab',
    what: 'Jumps to the forensic consistency findings and readiness checklist.',
    data: 'device',
  },
  'editor.tab.custody': {
    id: 'editor.tab.custody',
    title: 'custody.log Tab',
    what: 'Jumps to the tamper-evident hash-chained custody timeline.',
    data: 'device',
  },
  'editor.tab.certificate': {
    id: 'editor.tab.certificate',
    title: 'seal & certify Tab',
    what: 'Jumps to case sealing, member pass, and Section 63(4) draft PDF certificate download.',
    data: 'device',
  },
  'editor.chip.files': {
    id: 'editor.chip.files',
    title: 'Files Status Chip',
    what: 'Quick count of active evidence items in the repository workspace.',
    data: 'device',
  },
  'editor.chip.log': {
    id: 'editor.chip.log',
    title: 'Log Status Chip',
    what: 'Total entries currently appended to the custody chain.',
    data: 'device',
  },
  'editor.chip.branch': {
    id: 'editor.chip.branch',
    title: 'Branch Label',
    what: 'Current repository working branch (defaults to main).',
    data: 'device',
  },
  'editor.chip.seal': {
    id: 'editor.chip.seal',
    title: 'Seal Status Chip',
    what: 'Identifies the latest active Merkle root seal snapshot.',
    data: 'device',
  },

  // Readme Form Fields
  'readme.name': {
    id: 'readme.name',
    title: 'Deponent Full Name',
    what: 'Your full legal name, used only to fill the draft Section 63(4) Part A certificate.',
    when: 'Required before draft certificate PDF can be generated.',
    data: 'device',
    careful: 'Never sent anywhere; stays 100% on this device.',
  },
  'readme.parentage': {
    id: 'readme.parentage',
    title: 'Parent or Spouse Name',
    what: 'Son, daughter, or spouse of: a statutory field required by the BSA Section 63(4) Schedule form.',
    data: 'device',
  },
  'readme.address': {
    id: 'readme.address',
    title: 'Deponent Address',
    what: 'Your postal address for the draft certificate paperwork.',
    data: 'device',
  },
  'readme.relationship': {
    id: 'readme.relationship',
    title: 'Relationship to Device',
    what: 'How you relate to the computer, phone, or account where the evidence originated (e.g. lawful owner).',
    data: 'device',
  },
  'readme.title': {
    id: 'readme.title',
    title: 'Case Reference Title',
    what: 'An optional title for this case to help you and your legal advisor reference it.',
    data: 'device',
  },
  'readme.preview': {
    id: 'readme.preview',
    title: 'Live Part A Draft Preview',
    what: 'Live preview of the Section 63(4) Part A fields as they will appear in the generated certificate.',
    data: 'device',
  },
  'readme.traces': {
    id: 'readme.traces',
    title: 'Runtime Traces',
    what: 'Shows the latest events recorded in the custody log with color-coded status dots.',
    data: 'device',
  },

  // Evidence Section
  'evidence.add': {
    id: 'evidence.add',
    title: 'Add Evidence Dropzone',
    what: 'Add chats, screenshots, and voice notes. Each is fingerprinted directly in your browser with SHA-256.',
    when: 'Add original WhatsApp exports (.txt or .zip), screenshots (.png, .jpg), or audio voice notes.',
    data: 'device',
  },
  'evidence.tip': {
    id: 'evidence.tip',
    title: 'Original Export Recommendation',
    what: 'Explains why adding original chat exports (.txt or .zip) is forensic evidence stronger than screenshots alone.',
    data: 'none',
  },
  'evidence.card': {
    id: 'evidence.card',
    title: 'Evidence Lanyard Card',
    what: 'A visual ID card hanging from a lanyard representing a fingerprinted evidence file.',
    data: 'device',
  },
  'evidence.hash': {
    id: 'evidence.hash',
    title: 'SHA-256 File Hash',
    what: "The file's cryptographic fingerprint. Changing even a single character changes this value completely.",
    data: 'device',
  },
  'evidence.copyHash': {
    id: 'evidence.copyHash',
    title: 'Copy Hash Button',
    what: 'Copies the 64-character SHA-256 hash to your clipboard so you can verify it in any terminal tool.',
    data: 'none',
  },
  'evidence.verifyAgain': {
    id: 'evidence.verifyAgain',
    title: 'Re-Verify File Button',
    what: 'Re-hashes the stored file in IndexedDB right now and confirms it still matches the original fingerprint.',
    data: 'device',
  },
  'evidence.download': {
    id: 'evidence.download',
    title: 'Download Original File',
    what: 'Downloads the exact byte-for-byte original file stored in your local browser database.',
    data: 'device',
  },
  'evidence.remove': {
    id: 'evidence.remove',
    title: 'Remove Evidence File',
    what: 'Deletes this uploaded file and any derived helper items from your local storage so you can re-upload if selected by mistake.',
    data: 'device',
  },
  'evidence.sealedStamp': {
    id: 'evidence.sealedStamp',
    title: 'Seal Status Stamp',
    what: 'Shows SEALED if this file is anchored inside the latest Merkle tree seal, or NOT SEALED if added after.',
    data: 'device',
  },
  'evidence.chip.text': {
    id: 'evidence.chip.text',
    title: 'Text Extraction Status',
    what: 'Indicates whether text has been extracted from this file (parsed chat, OCR, or transcript). Helper text is never evidence.',
    data: 'device',
  },
  'evidence.parse': {
    id: 'evidence.parse',
    title: 'Parse Chat Button',
    what: 'Reads WhatsApp export text lines into structured, timestamped messages completely on your device.',
    data: 'device',
  },
  'evidence.ocr': {
    id: 'evidence.ocr',
    title: 'Read Text (OCR) Button',
    what: 'Extracts visible text lines from this screenshot using bundled local Tesseract OCR.',
    data: 'device',
    careful: 'OCR may make errors. Always compare extracted text with the original screenshot.',
  },
  'evidence.transcribe': {
    id: 'evidence.transcribe',
    title: 'Transcribe Audio Button',
    what: 'Sends voice note audio to the local helper server to produce timestamped Hindi/English text segments.',
    data: 'helper',
    careful: 'Transcription is a helper aid, not court evidence.',
  },

  // Timeline Section
  'timeline.build': {
    id: 'timeline.build',
    title: 'Build Timeline Button',
    what: 'Parses all chat exports, reads screenshots, transcribes audio, and merges them into one chronological timeline.',
    when: 'Click after adding your evidence files to see the complete narrative sequence.',
    data: 'device',
  },
  'timeline.progress': {
    id: 'timeline.progress',
    title: 'Timeline Progress Panel',
    what: 'Shows live progress while files are parsed, OCRed, and transcribed.',
    data: 'device',
  },
  'timeline.filter': {
    id: 'timeline.filter',
    title: 'Timeline Source Filters',
    what: 'Filter the timeline to show only chat messages, screenshot OCR lines, or voice transcripts.',
    data: 'none',
  },
  'timeline.item': {
    id: 'timeline.item',
    title: 'Timeline Item Card',
    what: 'One chronological message or line, permanently linked to the original evidence file it came from.',
    data: 'device',
  },
  'timeline.confirm': {
    id: 'timeline.confirm',
    title: 'Confirm Accuracy Button',
    what: 'Marks that you have visually verified this machine-read line against the original file.',
    data: 'device',
  },
  'timeline.confirmAll': {
    id: 'timeline.confirmAll',
    title: 'Confirm All Evidence Lines',
    what: 'Marks all timeline items as reviewed and confirmed in one click, collapsing them into a single evidence packet.',
    data: 'device',
  },
  'timeline.packetToggle': {
    id: 'timeline.packetToggle',
    title: 'Collapse/Expand Evidence Packet',
    what: 'Toggles between a single compact confirmed evidence packet and the full scrollable line-by-line stream.',
    data: 'none',
  },
  'timeline.edit': {
    id: 'timeline.edit',
    title: 'Edit Extracted Text',
    what: 'Correct an OCR or transcription mistake. The raw original machine output is always preserved.',
    data: 'device',
  },
  'timeline.sourceLink': {
    id: 'timeline.sourceLink',
    title: 'Source Evidence Link',
    what: 'Smoothly scrolls to and highlights the original file card in the evidence gallery.',
    data: 'none',
  },
  'timeline.more': {
    id: 'timeline.more',
    title: 'Show More Items',
    what: 'Loads additional timeline entries paginated in batches of 50.',
    data: 'none',
  },

  // Checks Section
  'checks.run': {
    id: 'checks.run',
    title: 'Run Consistency Checks',
    what: 'Compares evidence files against each other using 12 forensic rules to find timeline gaps or discrepancies.',
    data: 'device',
  },
  'checks.summary': {
    id: 'checks.summary',
    title: 'Findings Summary Counters',
    what: 'Totals of alerts (red), warnings (pink), info observations (yellow), and verified matches (green).',
    data: 'device',
  },
  'checks.finding': {
    id: 'checks.finding',
    title: 'Forensic Finding Panel',
    what: 'One specific observation detected by the checker. States only whether items match, do not match, or cannot tell.',
    data: 'device',
  },
  'checks.explainToggle': {
    id: 'checks.explainToggle',
    title: 'Explanation Format Toggle',
    what: 'Switch between deterministic local templates and plain-language AI explanations (in Cloud mode).',
    data: 'cloud',
  },
  'checks.action': {
    id: 'checks.action',
    title: 'Suggested Next Action',
    what: 'Clear advice on what to preserve or export next to address this warning.',
    data: 'none',
  },
  'checks.readiness': {
    id: 'checks.readiness',
    title: 'Readiness Checklist',
    what: 'An actionable to-do list built from current warnings to ensure your evidence bundle is complete.',
    data: 'none',
  },

  // Custody Log
  'custody.badge': {
    id: 'custody.badge',
    title: 'Chain Integrity Badge',
    what: 'Verifies the cryptographic hash-chain across all entries. Shows green CHAIN OK or red CHAIN BROKEN.',
    data: 'device',
  },
  'custody.sort': {
    id: 'custody.sort',
    title: 'Log Sort Order Toggle',
    what: 'Toggle custody entries between newest-first or oldest-first (genesis).',
    data: 'none',
  },
  'custody.terminal': {
    id: 'custody.terminal',
    title: 'Terminal View Toggle',
    what: 'Switches between the visual timeline and a dark git log --oneline console panel.',
    data: 'none',
  },
  'custody.entry': {
    id: 'custody.entry',
    title: 'Custody Log Entry Card',
    what: 'An immutable record of an action, containing the hash of the preceding entry (prevHash) and its own entryHash.',
    data: 'device',
  },
  'custody.expand': {
    id: 'custody.expand',
    title: 'Expand Raw Entry Details',
    what: 'Reveals the raw canonical JSON, prevHash, and entryHash for independent inspection.',
    data: 'none',
  },

  // Seal & Certify
  'seal.button': {
    id: 'seal.button',
    title: 'Seal Case Button',
    what: 'Constructs a Merkle tree of all current files, binds it to the custody log head, and issues a Case Fingerprint.',
    when: 'Click when you have finished adding evidence files for this snapshot.',
    data: 'device',
  },
  'seal.history': {
    id: 'seal.history',
    title: 'Seal History Snapshots',
    what: 'Lists earlier seal snapshots and the number of files anchored in each.',
    data: 'device',
  },
  'seal.pass': {
    id: 'seal.pass',
    title: 'Member Pass ID Card',
    what: 'Your case badge showing the Case ID, the single Case Fingerprint, and a visual barcode.',
    data: 'device',
  },
  'seal.barcode': {
    id: 'seal.barcode',
    title: 'Fingerprint Barcode',
    what: 'A visual barcode rendered directly from the 32 raw bytes of the case fingerprint.',
    data: 'device',
  },
  'seal.downloadFp': {
    id: 'seal.downloadFp',
    title: 'Download Fingerprint JSON',
    what: 'Downloads the pramaan-<caseId>-seal<n>.json file that the verify page reads. Contains no personal names or addresses.',
    data: 'device',
  },
  'seal.declarations': {
    id: 'seal.declarations',
    title: 'Section 63(4) Statutory Declarations',
    what: 'Statements you must review and tick to confirm proper computer functioning before the draft PDF can be generated.',
    data: 'device',
  },
  'seal.downloadPdf': {
    id: 'seal.downloadPdf',
    title: 'Download Draft Certificate PDF',
    what: 'Downloads the 5-page A4 DRAFT Part A Certificate and Hash Report with diagonal watermarks for lawyer review.',
    data: 'device',
  },
  'seal.downloadAnnex': {
    id: 'seal.downloadAnnex',
    title: 'Download Expert Technical Annex',
    what: 'Downloads a technical annex for digital forensics experts detailing algorithms, worked Merkle examples, and repeatability script.',
    data: 'device',
  },
  'seal.timestamp': {
    id: 'seal.timestamp',
    title: 'Request Public Timestamp Button',
    what: 'Sends only the 64-character case fingerprint to OpenTimestamps to anchor proof of existence on the Bitcoin blockchain.',
    data: 'fingerprint',
    careful: 'No files, names, or messages are ever sent.',
  },
  'seal.timestampStatus': {
    id: 'seal.timestampStatus',
    title: 'Timestamp Status Indicator',
    what: 'Pending means submitted to public calendar servers. Confirmed means confirmed in a Bitcoin block. SAMPLE means demo proof.',
    data: 'fingerprint',
  },
  'seal.otsDownload': {
    id: 'seal.otsDownload',
    title: 'Download .ots Proof File',
    what: 'Downloads the OpenTimestamps proof file so an expert can verify the timestamp independently using ots verify.',
    data: 'device',
  },
  'seal.notBox': {
    id: 'seal.notBox',
    title: 'Honesty Limitation Box',
    what: 'Mandatory disclosure: Pramaan is not legal advice, cannot guarantee admissibility, and cannot complete Part B.',
    data: 'none',
  },

  // Privacy, Safety, Lock
  'privacy.mode': {
    id: 'privacy.mode',
    title: 'Local / Cloud AI Toggle',
    what: 'Switches between Local Mode (100% on device) and Cloud AI assistance with explicit consent.',
    data: 'none',
  },
  'privacy.consent': {
    id: 'privacy.consent',
    title: 'Cloud AI Consent Modal',
    what: 'Explains what data is sent, to which provider, and why, before Cloud AI features can be enabled.',
    data: 'none',
  },
  'privacy.table': {
    id: 'privacy.table',
    title: 'Data Destinations Table',
    what: 'A complete breakdown of where each feature processes data (this device, helper server, public timestamp, or cloud AI).',
    data: 'none',
  },
  'privacy.aiLog': {
    id: 'privacy.aiLog',
    title: 'AI Call Audit Log',
    what: 'An immutable table recording every outbound helper and AI call with timestamps, data classes, and payload hashes.',
    data: 'device',
  },
  'privacy.aiLogRow': {
    id: 'privacy.aiLogRow',
    title: 'AI Call Log Record',
    what: 'Details of a specific server call including provider, byte count, redaction status, and payload hash.',
    data: 'device',
  },
  'privacy.server': {
    id: 'privacy.server',
    title: 'Helper Server Config',
    what: 'Configures the address and tests the live status of the local Python helper server.',
    data: 'none',
  },
  'safety.pin': {
    id: 'safety.pin',
    title: 'PIN Vault Configuration',
    what: 'Sets or changes the PIN that encrypts your local IndexedDB storage using Argon2id + AES-GCM.',
    data: 'device',
  },
  'safety.duress': {
    id: 'safety.duress',
    title: 'Duress PIN Protection',
    what: 'A separate PIN that silently opens an empty decoy vault if someone forces you to unlock the application.',
    data: 'device',
  },
  'safety.autolock': {
    id: 'safety.autolock',
    title: 'Auto-Lock Inactivity Timer',
    what: 'Automatically locks the vault after 5 minutes of inactivity or when the browser tab is hidden.',
    data: 'none',
  },
  'safety.backup': {
    id: 'safety.backup',
    title: 'Encrypted Vault Backup',
    what: 'Exports a password-encrypted backup of your case vault so you can restore if you forget your PIN.',
    data: 'device',
  },
  'safety.restore': {
    id: 'safety.restore',
    title: 'Restore Vault Backup',
    what: 'Restores case evidence and custody log from an encrypted backup file.',
    data: 'device',
  },
  'safety.wipe': {
    id: 'safety.wipe',
    title: 'Wipe All Data Modal',
    what: 'Permanently deletes all stored files, custody logs, and case metadata from this browser.',
    data: 'none',
  },
  'footer.wipe': {
    id: 'footer.wipe',
    title: 'Reset Database Link',
    what: 'Opens the confirmation dialog to completely wipe all local storage and reset the workspace.',
    data: 'none',
  },
  'lock.pad': {
    id: 'lock.pad',
    title: 'PIN Lock Keypad',
    what: 'Enter your 6-digit PIN or passphrase to decrypt and open your local evidence vault.',
    data: 'device',
  },
  'lock.forgot': {
    id: 'lock.forgot',
    title: 'Forgotten PIN Help',
    what: 'Explains that an encrypted vault cannot be recovered without the PIN or an encrypted backup file.',
    data: 'none',
  },
  'footer.nav': {
    id: 'footer.nav',
    title: 'Footer Section Navigation',
    what: 'Quick links to jump directly to any section of the case workspace.',
    data: 'none',
  },

  // Guide Drawer & Verify
  'guide.chat': {
    id: 'guide.chat',
    title: 'Guide AI Assistant Chat',
    what: 'Ask questions about app features, forensic concepts, or next steps in plain language.',
    data: 'cloud',
  },
  'guide.next': {
    id: 'guide.next',
    title: 'What Should I Do Next? Coach',
    what: 'Analyzes your current case readiness and recommends the single best next action.',
    data: 'cloud',
  },
  'guide.exit': {
    id: 'guide.exit',
    title: 'Exit Guide Mode',
    what: 'Returns to normal interaction mode where clicking elements triggers their actions.',
    data: 'none',
  },
  'verify.dropFp': {
    id: 'verify.dropFp',
    title: 'Verify Dropzone: Fingerprint File',
    what: 'Drop the pramaan-*.json fingerprint file to initiate independent verification.',
    data: 'device',
  },
  'verify.dropFiles': {
    id: 'verify.dropFiles',
    title: 'Verify Dropzone: Evidence Files',
    what: 'Drop the evidence files to compare against the cryptographic Merkle proofs in the fingerprint file.',
    data: 'device',
  },
  'verify.stamp': {
    id: 'verify.stamp',
    title: 'Verification Result Rubber Stamp',
    what: 'Large rubber stamp indicating green MATCH (unchanged since sealed) or red DOES NOT MATCH.',
    data: 'none',
  },
  'verify.crosscheck': {
    id: 'verify.crosscheck',
    title: 'Standard Tool Cross-Check Commands',
    what: 'Shows exact sha256sum, shasum, and Get-FileHash commands to verify hashes without relying on Pramaan.',
    data: 'none',
  },
  'verify.timestamp': {
    id: 'verify.timestamp',
    title: 'Public Timestamp Verification Block',
    what: 'Displays the OpenTimestamps status and independent ots verify terminal instructions.',
    data: 'none',
  },

  // Additional Interactive Elements & Controls
  'main.resetDb': {
    id: 'main.resetDb',
    title: 'Reset Database & Reload',
    what: 'Wipes all local IndexedDB data and reloads the application to start fresh.',
    data: 'none',
  },
  'consent.close': {
    id: 'consent.close',
    title: 'Close Consent Dialog',
    what: 'Dismisses the Cloud AI consent prompt without enabling Cloud features.',
    data: 'none',
  },
  'consent.confirm': {
    id: 'consent.confirm',
    title: 'Consent Confirmation Checkbox',
    what: 'Confirms you understand and consent that redacted text snippets will be sent to external AI providers.',
    data: 'none',
  },
  'consent.cancel': {
    id: 'consent.cancel',
    title: 'Cancel Consent',
    what: 'Aborts enabling Cloud AI and keeps Pramaan in 100% on-device Local Mode.',
    data: 'none',
  },
  'consent.enable': {
    id: 'consent.enable',
    title: 'Confirm & Enable Cloud AI',
    what: 'Enables Cloud AI mode for higher quality timeline parsing and narrative consistency checking.',
    data: 'cloud',
  },
  'guide.closeChat': {
    id: 'guide.closeChat',
    title: 'Close Guide Drawer',
    what: 'Closes the Guide AI conversation panel.',
    data: 'none',
  },
  'guide.promptInput': {
    id: 'guide.promptInput',
    title: 'Guide AI Question Input',
    what: 'Type any question about legal requirements, file hashing, or what to do next.',
    data: 'none',
  },
  'guide.sendPrompt': {
    id: 'guide.sendPrompt',
    title: 'Send Question to Guide AI',
    what: 'Submits your question to the Pramaan Guide assistant.',
    data: 'cloud',
  },
  'lock.unlockBtn': {
    id: 'lock.unlockBtn',
    title: 'Unlock Vault Button',
    what: 'Derives the cryptographic key using Argon2id to decrypt and open your local evidence storage.',
    data: 'device',
  },
  'privacy.close': {
    id: 'privacy.close',
    title: 'Close Privacy Drawer',
    what: 'Dismisses the privacy configuration panel.',
    data: 'none',
  },
  'privacy.tab.mode': {
    id: 'privacy.tab.mode',
    title: 'Privacy Mode Tab',
    what: 'Switches to the Local vs Cloud AI privacy selector.',
    data: 'none',
  },
  'privacy.tab.ailog': {
    id: 'privacy.tab.ailog',
    title: 'AI Network Call Log Tab',
    what: 'Shows a complete audit history of every outbound helper or AI request.',
    data: 'device',
  },
  'privacy.tab.server': {
    id: 'privacy.tab.server',
    title: 'Helper Server Config Tab',
    what: 'Settings and health check for the local Python helper server.',
    data: 'none',
  },
  'privacy.tab.safety': {
    id: 'privacy.tab.safety',
    title: 'Safety & Vault Settings Tab',
    what: 'Configure PIN protection, duress PIN decoy, auto-lock, and encrypted backups.',
    data: 'none',
  },
  'privacy.toggleMode': {
    id: 'privacy.toggleMode',
    title: 'Toggle Privacy Mode',
    what: 'Switches between Local Mode (0 network requests) and Cloud AI mode.',
    data: 'none',
  },
  'privacy.refreshLog': {
    id: 'privacy.refreshLog',
    title: 'Refresh AI Call Log',
    what: 'Reloads the list of logged network requests from the local IndexedDB gate log.',
    data: 'device',
  },
  'privacy.backLog': {
    id: 'privacy.backLog',
    title: 'Back to Call Log List',
    what: 'Closes the detailed payload inspector and returns to the AI call history table.',
    data: 'none',
  },
  'privacy.serverUrl': {
    id: 'privacy.serverUrl',
    title: 'Helper Server URL Input',
    what: 'Specifies the HTTP address of the local helper server (default: http://127.0.0.1:8000).',
    data: 'none',
  },
  'privacy.testServer': {
    id: 'privacy.testServer',
    title: 'Test Helper Server Connection',
    what: 'Checks whether the local Python helper server is running and reachable.',
    data: 'none',
  },
  'privacy.changePin': {
    id: 'privacy.changePin',
    title: 'Change Vault PIN',
    what: 'Opens prompt to set or update your 6-digit vault encryption PIN.',
    data: 'device',
  },
  'wipe.close': {
    id: 'wipe.close',
    title: 'Close Wipe Dialog',
    what: 'Dismisses the wipe confirmation dialog without deleting any data.',
    data: 'none',
  },
  'wipe.input': {
    id: 'wipe.input',
    title: 'Wipe Confirmation Text Input',
    what: 'Type the exact confirmation phrase (e.g. WIPE ALL) to prevent accidental erasure.',
    data: 'none',
  },
  'wipe.cancel': {
    id: 'wipe.cancel',
    title: 'Cancel Database Wipe',
    what: 'Aborts data deletion and leaves all stored files and custody logs intact.',
    data: 'none',
  },
  'wipe.confirm': {
    id: 'wipe.confirm',
    title: 'Confirm Permanent Data Wipe',
    what: 'Irrevocably deletes all stored evidence, custody logs, and seals from this device.',
    data: 'none',
  },
  'evidence.fileInput': {
    id: 'evidence.fileInput',
    title: 'Evidence File Selector',
    what: 'System file dialog to pick files for local SHA-256 fingerprinting.',
    data: 'device',
  },
  'evidence.tamperDemo': {
    id: 'evidence.tamperDemo',
    title: 'Tamper 1-Byte (Demo Feature)',
    what: 'Downloads an intentionally modified copy of this file (1 byte flipped) to prove the verify page detects tampering.',
    data: 'device',
  },
  'custody.simulateTamper': {
    id: 'custody.simulateTamper',
    title: 'Simulate Tampered Custody Log',
    what: 'Flips a byte in a past custody entry hash to demonstrate cryptographic break detection.',
    data: 'device',
  },
  'custody.restoreChain': {
    id: 'custody.restoreChain',
    title: 'Restore Custody Chain',
    what: 'Restores the untampered custody log back to its valid cryptographic state.',
    data: 'device',
  },
  'seal.declaration': {
    id: 'seal.declaration',
    title: 'Deponent Truth Declaration',
    what: 'Section 63(4) Part A mandatory declaration that the computer was operating properly and evidence is unmanipulated.',
    data: 'device',
  },
  'seal.requestTimestamp': {
    id: 'seal.requestTimestamp',
    title: 'Request Public Blockchain Timestamp',
    what: 'Submits the case fingerprint to OpenTimestamps calendar servers to prove its existence in Bitcoin history.',
    data: 'fingerprint',
  },
  'seal.checkStatus': {
    id: 'seal.checkStatus',
    title: 'Check Timestamp Status',
    what: 'Queries OpenTimestamps calendar servers to check if the timestamp proof has confirmed into a Bitcoin block.',
    data: 'fingerprint',
  },
  'seal.cancelFilenameWarning': {
    id: 'seal.cancelFilenameWarning',
    title: 'Cancel File Download',
    what: 'Closes the filename warning dialog.',
    data: 'none',
  },
  'seal.confirmFilenameDownload': {
    id: 'seal.confirmFilenameDownload',
    title: 'Proceed with Download',
    what: 'Proceeds to download the fingerprint file to your computer.',
    data: 'device',
  },
  'seal.toggleHonestyBox': {
    id: 'seal.toggleHonestyBox',
    title: 'Honest Limits & Non-Claims',
    what: 'Expands the full legal and forensic scope of what Pramaan does and does NOT claim.',
    data: 'none',
  },
  'footer.nav.readme': {
    id: 'footer.nav.readme',
    title: 'Navigate to Case Details',
    what: 'Jumps to the Case Details and Deponent Information section.',
    data: 'none',
  },
  'footer.nav.evidence': {
    id: 'footer.nav.evidence',
    title: 'Navigate to Evidence Gallery',
    what: 'Jumps to the Evidence Files and Hash Report section.',
    data: 'none',
  },
  'footer.nav.timeline': {
    id: 'footer.nav.timeline',
    title: 'Navigate to Timeline & Checks',
    what: 'Jumps to the Timeline and Forensic Consistency Checks section.',
    data: 'none',
  },
  'footer.nav.custody': {
    id: 'footer.nav.custody',
    title: 'Navigate to Custody Chain',
    what: 'Jumps to the SHA-256 Custody Log section.',
    data: 'none',
  },
  'footer.nav.seal': {
    id: 'footer.nav.seal',
    title: 'Navigate to Seal & Certify',
    what: 'Jumps to the Section 63(4) Case Seal and PDF Certificate section.',
    data: 'none',
  },
  'timeline.filterButton': {
    id: 'timeline.filterButton',
    title: 'Timeline Filter Button',
    what: 'Filters timeline entries by evidence source (Chat, OCR, Voice Transcript, or All).',
    data: 'none',
  },
  'timeline.editText': {
    id: 'timeline.editText',
    title: 'Timeline Line Editor',
    what: 'Edit or correct an extracted timeline text entry locally. Original evidence files remain completely untouched.',
    data: 'helper',
  },
  'timeline.saveCorrection': {
    id: 'timeline.saveCorrection',
    title: 'Save Timeline Correction',
    what: 'Saves your manual text adjustment in the local helper derived store.',
    data: 'helper',
  },
  'timeline.cancelCorrection': {
    id: 'timeline.cancelCorrection',
    title: 'Cancel Timeline Correction',
    what: 'Discards uncommitted changes to this timeline item.',
    data: 'none',
  },
  'verify.selectFp': {
    id: 'verify.selectFp',
    title: 'Select Fingerprint File',
    what: 'Choose a pramaan-*.json case fingerprint file to verify.',
    data: 'device',
  },
  'verify.selectFiles': {
    id: 'verify.selectFiles',
    title: 'Select Evidence Files',
    what: 'Choose evidence files to check against the fingerprint file Merkle proofs.',
    data: 'device',
  },
  'verify.reverify': {
    id: 'verify.reverify',
    title: 'Re-Verify Files',
    what: 'Re-runs the SHA-256 hashing and Merkle membership verification on all loaded files.',
    data: 'device',
  },
  'verify.clear': {
    id: 'verify.clear',
    title: 'Clear Verification Workspace',
    what: 'Clears the loaded fingerprint and evidence files to verify a different case.',
    data: 'none',
  },
};


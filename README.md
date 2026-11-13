# Pramaan

**Privacy-first digital evidence organization, consistency checking, and verification for harassment and stalking cases.**

Pramaan helps users preserve mixed digital evidence—such as chat exports, screenshots, voice notes, and attachments—without uploading the original files by default. It creates verifiable fingerprints, records custody events, identifies inconsistencies between files, and prepares a certificate-ready draft for review by a lawyer or qualified expert.

> Pramaan is a prototype for a hackathon. It is not legal advice, does not certify evidence, and does not guarantee admissibility in court.

## The problem

Victims of online harassment often have useful evidence, but that evidence is scattered across screenshots, chat exports, audio files, and forwarded attachments. It can be difficult to show:

- Which files were preserved and when.

- Whether a file changed after it was saved.

- Whether a screenshot matches the original chat export.

- Whether timestamps, senders, and attachments are consistent.

- How to organize the material for a lawyer or forensic expert.

- How to protect sensitive data from unnecessary cloud uploads.

Pramaan addresses the organization and technical-verification problem. It does **not** decide whether an incident really happened or whether a court will accept the evidence.

## Core principles

1. **Local by default** — Original evidence is processed in the browser or on the user’s own helper server whenever possible.

1. **Deterministic trust layer** — Hashing, custody logging, Merkle trees, fingerprints, and verification are implemented with reproducible code rather than an LLM.

1. **AI as a helper** — AI may extract, explain, summarize, or guide. AI output is never treated as evidence.

1. **Uncertainty is explicit** — The system says `matches`, `does_not_match`, `cannot_tell`, `warning`, or `information`; it never declares evidence “real,” “fake,” or automatically admissible.

1. **Originals are preserved** — Derived OCR text, transcripts, summaries, and explanations remain separate from the original evidence.

1. **Privacy is visible** — Cloud processing requires consent, is minimized and redacted where possible, and is recorded in an AI-call log.

## Main workflow

```
Add evidence
    ↓
Calculate local file hashes
    ↓
Record custody events
    ↓
Build Merkle root and case fingerprint
    ↓
Parse and compare evidence
    ↓
Show structured findings and suggested actions
    ↓
Generate a draft certificate packet
    ↓
Verify files independently
```

## Features

### Tier 1: Core verification

Tier 1 is the minimum reliable product:

- Add evidence files in the browser.

- Calculate SHA-256 fingerprints locally.

- Maintain a hash-chained custody log.

- Calculate a Merkle root for all case files.

- Combine the Merkle root with the custody-log head into a case fingerprint.

- Export a fingerprint file containing file hashes, Merkle data, proofs, and metadata.

- Generate a clearly marked draft certificate PDF with Part A fields, a hash table, and a blank Part B section.

- Provide a standalone verification page that works without login or file upload.

- Demonstrate a green verification result, a red result after changing one byte, and green again after restoring the file.

### Tier 2: Evidence understanding and guidance

Tier 2 extends the core with:

- Rule-based WhatsApp export parsing.

- Screenshot OCR, local by default.

- Hindi and English voice-note transcription, preferably locally or through a localhost helper server.

- Cross-evidence consistency checks.

- Public timestamp submission using OpenTimestamps or another clearly labeled timestamp service.

- Local/Cloud privacy modes.

- Consent before cloud processing.

- AI-call logging using metadata and hashes rather than raw content.

- A read-only Pramaan Guide that explains controls and findings.

- Optional technical annex describing how the evidence was processed.

- Optional encrypted local vault and safety lock.

### Tier 3: Future work

- Quiet Match through a verified counselor network.

- Support for additional messengers and evidence formats.

- Mobile on-device OCR and speech-to-text.

- Hindi and other regional-language interfaces.

- Security and data-protection reviews.

- Pilots with legal-aid clinics, NGOs, and women’s helplines.

## How the cryptographic layer works

Each file receives a SHA-256 hash. Custody events are linked so that each entry includes the hash of the previous entry.

```json
{
  "index": 3,
  "time": "2026-11-13T10:02:11Z",
  "action": "FILE_ADDED",
  "fileId": "f1",
  "details": {
    "sha256": "ab12..."
  },
  "prevHash": "5d0e...",
  "entryHash": "SHA-256 of the canonical entry"
}
```

The fingerprint file contains the evidence hashes, Merkle root, Merkle proofs, custody-log head, and case fingerprint:

```json
{
  "version": "pramaan-1",
  "algorithm": "SHA-256",
  "files": [
    {
      "id": "f1",
      "name": "chat-export.txt",
      "size": 18234,
      "sha256": "ab12...",
      "addedAt": "2026-11-13T10:02:11Z"
    }
  ],
  "merkleRoot": "9f3c...",
  "custodyHead": "77de...",
  "caseFingerprint": "c41a...",
  "timestamp": {
    "service": "opentimestamps",
    "status": "pending",
    "proofFile": "case.ots"
  }
}
```

Conceptually:

```
caseFingerprint = SHA-256(version + merkleRoot + custodyHead)
```

A hash proves that a file has not changed since it was fingerprinted. It does **not** prove that the file was genuine originally, that a screenshot represents a real conversation, or that an event occurred. The original device, original exports, custody information, expert review, and the court remain important.

An external timestamp is an additional anchor. A custody event added after the last timestamp is not covered by that earlier timestamp and should be re-anchored if necessary.

## Role of AI

AI is deliberately not the foundation of Pramaan.

### AI may help with

- OCR and speech-to-text.

- Explaining structured consistency findings.

- Translating technical terms into simple language.

- Guiding the user through the interface.

- Suggesting preservation steps.

- Handling optional, consented explanations in Cloud mode.

### AI must not control

- SHA-256 hashing.

- The custody log.

- Merkle-tree construction.

- Case-fingerprint generation.

- Verification results.

- Timestamp proof.

- Evidence deletion or modification.

- Privacy-mode changes.

- Legal conclusions.

- Claims that evidence is authentic, fake, or admissible.

The preferred architecture is:

```
Original files
    → local hashing and custody logging
    → local parsing and deterministic checks
    → structured findings
    → optional Groq explanation
    → user confirmation or editing
```

Groq should receive only the minimum information needed for an explanation. Raw chats, screenshots, audio, phone numbers, addresses, and names should remain local by default. The Groq API key must remain on the server and must never be exposed to the browser.

## Consistency checker

The checker uses deterministic rules and fuzzy matching to compare related evidence. Example checks include:

- Screenshot message versus WhatsApp export.

- Screenshot time versus export time.

- Sender names and phone numbers across files.

- Voice-note references versus supplied audio files.

- Missing original exports.

- Deleted-message markers.

- Out-of-order or conflicting messages.

- File metadata and possible re-encoding warnings.

A finding should point to its source files and remain cautious:

```json
{
  "id": "C-004",
  "level": "warn",
  "status": "does_not_match",
  "claim": "Screenshot s2 line 3 was not found in export chat.txt",
  "evidence": [
    { "file": "s2.png", "where": "line 3" },
    { "file": "chat.txt" }
  ],
  "explain": "This message appears only in the screenshot.",
  "action": "Save the original chat export from the same date range."
}
```

The system should use terms such as `matches`, `does_not_match`, `cannot_tell`, `warning`, and `information`. It should not use “authentic,” “fake,” or “proves guilt.”

## Architecture

```
web/                       React + TypeScript frontend
  src/core/                hash, custody, Merkle, fingerprint, vault
  src/parsers/             WhatsApp and OCR parsers
  src/checks/              Consistency rules and findings
  src/pdf/                 Certificate draft and annex generation
  src/ui/                  Evidence, timeline, report, privacy, lock screens
  src/verify/              Standalone verification page

server/                    Optional FastAPI helper server
  main.py                  API entry point
  stamp.py                 Timestamp integration
  transcribe.py            Local speech-to-text
  explain.py               Optional Groq explanation

data/synthetic/            Synthetic demo evidence only
tests/                      Core, parser, checker, privacy, and integration tests
README.md                  Project documentation
```

### Suggested technology stack

- Frontend: Vite, React, TypeScript, Tailwind CSS.

- Hashing: WebCrypto SHA-256 and/or `hash-wasm` for large files.

- Storage: IndexedDB with `idb`.

- Encryption: AES-GCM with a key derived from a user PIN using PBKDF2.

- OCR: `tesseract.js` with English and Hindi language data.

- Speech-to-text: Whisper or `faster-whisper` through a local helper server during prototyping.

- Matching: deterministic text comparison and a fuzzy string-similarity library.

- PDF: `pdf-lib` or `jsPDF`.

- Backend: FastAPI, only where a helper server is necessary.

- LLM: Groq API through the backend, using structured JSON output and server-side validation.

- Testing: Vitest for TypeScript and `pytest` for Python.

Pin dependency versions and check current provider and library documentation before deployment.

## Local development

The exact commands may vary depending on the implementation. A typical setup is:

### Frontend

```bash
cd web
npm install
npm run dev
```

### Helper server

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Environment variables

Keep secrets in a local `.env` file that is excluded from Git:

```
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=your_supported_model_id
HELPER_SERVER_URL=http://localhost:8000
```

Never place `GROQ_API_KEY` in frontend code, browser storage, a public fingerprint file, or a committed configuration file.

## Testing requirements

At minimum, the project should test:

### Cryptographic tests

- Pramaan hash equals the result of a standard tool such as `sha256sum`.

- Any modified custody entry breaks chain verification.

- Every file has a valid Merkle proof.

- The case fingerprint is reproducible.

- Canonical serialization produces stable hashes.

### Verification tests

- Original file plus fingerprint file produces green.

- A one-byte modification produces red.

- Restoring the original produces green again.

- The verifier performs no upload or login request.

### Parser and checker tests

Use synthetic cases with planted problems:

- Edited text.

- Changed timestamp.

- Deleted message.

- Swapped sender.

- Missing attachment.

- Missing original export.

- Clean matching evidence.

Report detection rates and false alarms honestly. These results are prototype measurements, not production accuracy claims.

### Privacy tests

- Local mode sends no evidence content over the network.

- Cloud mode cannot run without explicit consent.

- Cloud calls are recorded in the AI-call log.

- The API key is never present in browser bundles or network responses.

- AI output is excluded from the case fingerprint.

## Demo flow

A recommended three-minute demonstration is:

1. Show a synthetic case containing a chat export, screenshots, and a voice note.

1. Add the files and show that hashes are calculated locally.

1. Display the custody timeline and case fingerprint.

1. Run the consistency checker and show a missing message and a timestamp conflict.

1. Generate the clearly labeled draft certificate PDF.

1. Submit or display the timestamp as pending or confirmed.

1. Open the standalone verifier and show green.

1. Change one byte and show red.

1. Restore the file and show green again.

1. Demonstrate Local mode and the AI-call log.

Use only synthetic data in the demo. Keep a preloaded sample case and a backup recording.

## Legal and safety disclaimer

Pramaan is an organizational and technical-verification prototype. It does not:

- Provide legal advice.

- Certify evidence.

- Guarantee court admissibility.

- Prove that an event occurred.

- Prove that a file was genuine when first created.

- Replace a lawyer, forensic expert, counselor, police officer, or court.

Part A declarations should be reviewed and completed by the concerned person. Part B should remain available for completion by an appropriate expert. Certificate wording must be copied from the applicable official Schedule and reviewed by a qualified legal or forensic professional before any real-world use.

Do not use real victim data during development or demonstrations. Use synthetic cases and invented identities.

## Roadmap

- Complete and harden Tier 1 before adding advanced features.

- Verify the official Section 63 Schedule wording.

- Add the text-only WhatsApp parser and consistency checker.

- Add timestamp status handling and proof verification.

- Improve Hindi OCR and speech-to-text.

- Add a reviewed mobile-first workflow.

- Conduct security and data-protection reviews.

- Pilot with legal-aid organizations and women’s helplines.

- Build Quiet Match only with verified accounts, rate limits, independent reports, counselor involvement, and appropriate legal safeguards.

## Contributing

Contributions are welcome. Please:

1. Use synthetic data only.

1. Do not add real personal information to fixtures, screenshots, logs, or test cases.

1. Add tests for changes to hashing, custody, Merkle proofs, verification, privacy, or AI output handling.

1. Keep security-sensitive operations deterministic and auditable.

1. Avoid legal claims unless they are supported by reviewed sources.

1. Do not introduce a dependency that sends evidence to a third party without an explicit privacy review.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Project status

Pramaan is an experimental hackathon prototype. Features may be incomplete, simulated, or limited to synthetic data. The repository should clearly label every feature as one of:

- **Built and tested**

- **Simulated for the demo**

- **Experimental**

- **Roadmap**

The goal is to make evidence more organized, checkable, and privacy-conscious—not to replace professional legal or forensic judgment.

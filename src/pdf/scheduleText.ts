// Schedule to Section 63(4)(c) of the Bharatiya Sakshya Adhiniyam, 2023 (Part A & Part B).
// Verified against official statutory gazette notification.

export const SCHEDULE_TEXT_VERIFIED = true;

export const SCHEDULE_HEADER = 'THE SCHEDULE';
export const SECTION_REFERENCE = '[See section 63(4)(c)]';
export const CERTIFICATE_TITLE = 'CERTIFICATE';

export const PART_A_TITLE = 'PART A\n(To be filled by the Party)';

export const PART_A_DECLARATIONS: { id: string; text: string }[] = [
  {
    id: 'd1',
    text: 'The digital device or the digital record source was under the lawful control for regularly creating, storing or processing information for the purposes of carrying out regular activities and during this period, the computer or the communication device was working properly and the relevant information was regularly fed into the computer during the ordinary course of business.',
  },
  {
    id: 'd2',
    text: 'If the computer/digital device at any point of time was not working properly or out of operation, then it has not affected the electronic/digital record or its accuracy.',
  },
  {
    id: 'd3',
    text: 'The digital device or the source of the digital record is owned, maintained, managed, or operated by me as specified in this certificate.',
  },
  {
    id: 'd4',
    text: 'I state that the HASH value/s of the electronic/digital record/s is obtained through the SHA-256 algorithm and enclosed in the attached Hash Report.',
  },
];

export const PART_A_FIELD_LABELS = {
  name: 'Name of Deponent / Complainant',
  parentage: 'Son / daughter / spouse of',
  address: 'Residential / official address',
  relationship: 'Relationship to device / source (Owned / Maintained / Managed / Operated)',
};

export const PART_B_TITLE = 'PART B\n(To be filled by the Expert)';

export const PART_B_PLACEHOLDER =
  'I, ________________________ (Name), Son/daughter/spouse of ________________________ residing/employed at ________________________ do hereby solemnly affirm and sincerely state and submit as follows:\n\nThe produced electronic record/output of the digital record are obtained from the specified digital record source, working properly under ordinary course.\n\nI state that the HASH value/s of the electronic/digital record/s is obtained through the SHA-256 algorithm as enclosed in the attached Hash Report.';

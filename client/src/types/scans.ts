export type ScanKind = 'message' | 'url' | 'job' | 'document' | 'image';
export type Risk = 'low' | 'moderate' | 'high' | 'unknown';

export type ScanInput =
  | { kind: 'message'; text: string }
  | { kind: 'url'; url: string }
  | {
      kind: 'job';
      text: string;
      company: string;
      title: string;
      email: string;
      url: string;
      payment: 'yes' | 'no' | 'unsure';
    }
  | { kind: 'document' | 'image'; mime: string; data: string };

export const imageFlagLabels = {
  suspicious_link: 'Suspicious link',
  payment_request: 'Suspicious payment request',
  credential_request: 'Request for passwords or verification codes',
  impersonation: 'Possible impersonation',
  possible_edit: 'Possible visual edit',
  unsafe_request: 'Suspicious request',
} as const;

export interface ScanReport {
  id: string;
  kind: ScanKind;
  createdAt: string;
  source: 'rules' | 'ai';
  risk: Risk;
  summary: string;
  findings: string[];
  actions: string[];
  limitations: string;
  imageFlags?: { kind: keyof typeof imageFlagLabels; evidence: string }[];
}

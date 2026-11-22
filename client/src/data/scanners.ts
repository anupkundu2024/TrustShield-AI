import {
  BriefcaseBusiness,
  FileSearch,
  Image as ImageIcon,
  Link2,
  MessageSquareText,
} from 'lucide-react';
import type { ScanKind } from '../types/scans';

export const scanners = {
  message: {
    label: 'Message Scanner',
    title: 'Analyze a suspicious message',
    description:
      'Check an SMS, email, or chat for pressure, payment requests, and other scam signals.',
    icon: MessageSquareText,
    tone: 'teal',
  },
  url: {
    label: 'URL Scanner',
    title: 'Check a suspicious link',
    description:
      'Inspect a link for misleading domains and other warning signs without opening it.',
    icon: Link2,
    tone: 'blue',
  },
  job: {
    label: 'Job Offer Checker',
    title: 'Check a job or internship offer',
    description:
      'Review recruitment messages for upfront fees, unverified recruiters, and unusual requests.',
    icon: BriefcaseBusiness,
    tone: 'violet',
  },
  image: {
    label: 'Screenshot & Photo Scanner',
    title: 'Scan a screenshot or photo',
    description:
      'Check visible links, payment requests, impersonation and possible edits in a PNG or JPEG.',
    icon: ImageIcon,
    tone: 'teal',
  },
  document: {
    label: 'Document Scanner',
    title: 'Review a suspicious document',
    description:
      'Review a PDF or screenshot for misleading claims and risky requests.',
    icon: FileSearch,
    tone: 'amber',
  },
} as const;

export const scanKinds = Object.keys(scanners) as ScanKind[];

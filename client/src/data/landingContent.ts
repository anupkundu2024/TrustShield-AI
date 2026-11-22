import {
  BriefcaseBusiness,
  ClipboardCheck,
  FileSearch,
  Link2,
  ListChecks,
  MessageSquareText,
  ScanLine,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const problems = [
  {
    icon: MessageSquareText,
    tone: 'teal',
    title: 'Messages that look familiar',
    description:
      'A text or email can imitate a trusted contact and make an unusual request feel routine.',
  },
  {
    icon: BriefcaseBusiness,
    tone: 'blue',
    title: 'Offers that come with a catch',
    description:
      'Fake recruiters can target students and jobseekers with convincing offers and requests for fees.',
  },
  {
    icon: Link2,
    tone: 'violet',
    title: 'Links that imitate trusted sites',
    description:
      'A phishing page can look like a familiar website while asking for your password or personal details.',
  },
] as const;

export const features = [
  {
    icon: MessageSquareText,
    tone: 'teal',
    title: 'Message Analysis',
    description:
      'Examine suspicious messages and identify potential scam indicators with AI-assisted explanations.',
  },
  {
    icon: Link2,
    tone: 'blue',
    title: 'Link Safety Assessment',
    description:
      'Review suspicious URLs and understand potential phishing-related warning signs.',
  },
  {
    icon: BriefcaseBusiness,
    tone: 'violet',
    title: 'Job Offer Verification Assistance',
    description:
      'Identify common warning signs in internship and recruitment offers before taking action.',
  },
  {
    icon: FileSearch,
    tone: 'teal',
    title: 'Document & Screenshot Analysis',
    description:
      'Review suspicious PDFs, screenshots and photos for misleading links, payment requests and possible edits.',
  },
] as const;

export const steps = [
  {
    icon: Send,
    tone: 'teal',
    title: 'Submit',
    description: 'Paste suspicious text or a URL, or upload a document.',
  },
  {
    icon: ScanLine,
    tone: 'blue',
    title: 'Analyze',
    description:
      'TrustShield checks the available evidence and uses AI when you enable it for a scan.',
  },
  {
    icon: ClipboardCheck,
    tone: 'violet',
    title: 'Understand',
    description:
      'Review potential warning signs, supporting evidence, and suggested safety actions.',
  },
] as const;

export const benefits = [
  {
    icon: ListChecks,
    tone: 'teal',
    title: 'Explainable Insights',
    description: 'Understand why a message or link may be suspicious.',
  },
  {
    icon: ShieldCheck,
    tone: 'blue',
    title: 'Safety-Focused Guidance',
    description: 'Get practical suggestions for checking suspicious content.',
  },
  {
    icon: Sparkles,
    tone: 'violet',
    title: 'Simple by Design',
    description:
      'Navigate a clean interface without needing cybersecurity expertise.',
  },
] as const;

export const faqs = [
  {
    question: 'What is TrustShield AI?',
    answer:
      'TrustShield AI helps you review suspicious messages, links, job offers, and documents. Create an account to run a scan and revisit your saved reports.',
  },
  {
    question: 'How does TrustShield assess suspicious content?',
    answer:
      'TrustShield uses rules and, when enabled, AI and link reputation checks. Assessments explain the warning signs and limitations so you can verify important requests independently.',
  },
  {
    question: 'Can TrustShield guarantee that a website is safe?',
    answer:
      'No. A risk assessment can highlight warning signs, but it cannot guarantee that a website is safe. Verify important requests through a trusted, independent source.',
  },
  {
    question: 'Can TrustShield review a suspicious job offer?',
    answer:
      'Yes. The job offer checker looks for warning signs such as upfront payment requests, personal recruiter email addresses, and unusual pressure to respond.',
  },
  {
    question: 'Can I analyze screenshots and documents?',
    answer:
      'Yes, when AI is enabled. You can submit a PNG, JPEG, or PDF up to 5 MB and review the resulting assessment.',
  },
  {
    question: 'Is TrustShield AI free to use?',
    answer:
      'The public demo is free to explore. An account gives you access to the scanners available on this installation.',
  },
];

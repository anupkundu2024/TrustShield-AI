import { ArrowRight, FileText, LockKeyhole, UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { Button, LinkButton } from '../components/ui/Button';
import { Alert, Spinner } from '../components/ui/Feedback';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Surfaces';
import { scanners } from '../data/scanners';
import { accountErrorMessage } from '../services/authApi';
import { scanApi } from '../services/scanApi';
import type { ScanInput, ScanKind } from '../types/scans';

const messageLimit = 8000;
const fileLimit = 5 * 1024 * 1024;
const imageTypes = ['image/png', 'image/jpeg'];
const documentTypes = ['application/pdf', ...imageTypes];
const example =
  'Congratulations! You were selected for a remote job. Pay a registration fee immediately to secure your interview.';
const webUrl = z
  .string()
  .trim()
  .regex(/^https?:\/\/[^\s\\]+$/i)
  .pipe(z.url({ protocol: /^https?$/ }));
const emailAddress = z.email();
const initialJob = {
  company: '',
  title: '',
  email: '',
  url: '',
  payment: 'unsure',
} as const;
const guidance = {
  message: [
    'Look for requests for codes or passwords.',
    'Verify payment requests using a contact you already trust.',
  ],
  url: [
    'Copy the link without visiting it.',
    'Compare the destination domain with the organization’s official website.',
  ],
  job: [
    'Verify the recruiter through the company’s official careers page.',
    'Check any request for training, processing, or equipment fees.',
  ],
  image: [
    'Use a clear PNG or JPEG up to 5 MB. Keep any relevant text and links visible.',
    'Cover sensitive details before uploading. Visible signs can suggest a scam or edit, but only independent verification can establish authenticity.',
  ],
  document: [
    'Use PNG, JPEG, or PDF up to 5 MB.',
    'Cover account numbers, IDs, passwords, and personal details before submitting.',
  ],
};

function fileData(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read this file.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(file);
  });
}

export function ScannerPage({ kind }: { kind: ScanKind }) {
  const { title, description, icon: Icon, tone } = scanners[kind];
  const navigate = useNavigate();
  const fileScan = kind === 'document' || kind === 'image';
  const acceptedTypes = kind === 'image' ? imageTypes : documentTypes;
  const fileTypes = kind === 'image' ? 'PNG or JPEG' : 'PNG, JPEG, or PDF';
  const active = useRef<AbortController | null>(null);
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [job, setJob] =
    useState<Omit<Extract<ScanInput, { kind: 'job' }>, 'kind' | 'text'>>(
      initialJob,
    );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState<
    'loading' | 'ai' | 'rules' | 'error'
  >('loading');
  const [consent, setConsent] = useState(false);
  const [reputationEnabled, setReputationEnabled] = useState(false);
  const [allowReputation, setAllowReputation] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void scanApi.capabilities(controller.signal).then(
      ({ aiEnabled, reputationEnabled }) => {
        if (controller.signal.aborted) return;
        setAvailability(aiEnabled ? 'ai' : 'rules');
        setReputationEnabled(reputationEnabled);
      },
      () => {
        if (!controller.signal.aborted) setAvailability('error');
      },
    );
    return () => {
      controller.abort();
      active.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function removeFile() {
    setFile(null);
    setPreview(null);
  }

  function selectFile(selected?: File) {
    if (busy || !selected) return;
    if (
      !acceptedTypes.includes(selected.type) ||
      selected.size === 0 ||
      selected.size > fileLimit
    ) {
      removeFile();
      setError('Choose a ' + fileTypes + ' file between 1 byte and 5 MB.');
      return;
    }
    setFile(selected);
    setPreview(
      selected.type === 'application/pdf'
        ? null
        : URL.createObjectURL(selected),
    );
    setError('');
  }

  function clear() {
    setText('');
    setUrl('');
    setJob(initialJob);
    removeFile();
    setConsent(false);
    setAllowReputation(false);
    setError('');
  }

  function validate() {
    if (fileScan && !consent)
      return 'Confirm that you want to send the submission for analysis.';
    if ((kind === 'message' || kind === 'job') && text.trim().length < 10)
      return 'Enter at least 10 characters.';
    if (kind === 'url' && !webUrl.safeParse(url.trim()).success)
      return 'Enter a full HTTP or HTTPS URL.';
    if (kind === 'job' && job.url && !webUrl.safeParse(job.url.trim()).success)
      return 'Enter a full HTTP or HTTPS job posting URL.';
    if (
      kind === 'job' &&
      job.email &&
      !emailAddress.safeParse(job.email).success
    )
      return 'Enter a valid recruiter email address.';
    if (fileScan && !file) return 'Choose a file to analyze.';
    return '';
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current) return;
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setError('');
    setBusy(true);
    try {
      let input: ScanInput;
      switch (kind) {
        case 'message':
          input = { kind, text };
          break;
        case 'url':
          input = { kind, url };
          break;
        case 'job':
          input = { kind, text, ...job };
          break;
        case 'image':
        case 'document':
          if (!file) return;
          input = { kind, mime: file.type, data: await fileData(file) };
      }
      const { report } = await scanApi.create(
        input,
        consent,
        allowReputation,
        controller.signal,
      );
      if (!controller.signal.aborted)
        void navigate('/app/history/' + report.id);
    } catch (failure) {
      if (!controller.signal.aborted) setError(accountErrorMessage(failure));
    } finally {
      active.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <div className="workspace-content grid gap-6">
      <div className="workspace-page-heading">
        <span className="workspace-icon" data-tone={tone}>
          <Icon size={24} aria-hidden="true" />
        </span>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="min-w-0 p-5 sm:p-7">
          <form onSubmit={submit} noValidate>
            <fieldset disabled={busy} className="grid min-w-0 gap-5">
              <legend className="mb-5 text-lg font-bold text-navy">
                Submission details
              </legend>

              {kind === 'job' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Company name (optional)"
                    value={job.company}
                    maxLength={120}
                    onChange={(e) =>
                      setJob({ ...job, company: e.target.value })
                    }
                  />
                  <Input
                    label="Job title (optional)"
                    value={job.title}
                    maxLength={120}
                    onChange={(e) => setJob({ ...job, title: e.target.value })}
                  />
                  <Input
                    label="Recruiter email (optional)"
                    type="email"
                    value={job.email}
                    maxLength={254}
                    onChange={(e) => setJob({ ...job, email: e.target.value })}
                  />
                  <Input
                    label="Job posting URL (optional)"
                    type="url"
                    value={job.url}
                    maxLength={2048}
                    onChange={(e) => setJob({ ...job, url: e.target.value })}
                  />
                  <label className="grid gap-2 font-semibold sm:col-span-2">
                    Did they ask for payment?
                    <select
                      className="workspace-field"
                      value={job.payment}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (
                          value === 'yes' ||
                          value === 'no' ||
                          value === 'unsure'
                        )
                          setJob({ ...job, payment: value });
                      }}
                    >
                      <option value="unsure">Not sure</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </label>
                </div>
              )}

              {(kind === 'message' || kind === 'job') && (
                <div className="grid gap-2">
                  <label htmlFor="scan-text" className="font-semibold">
                    {kind === 'job'
                      ? 'Job offer message'
                      : 'Paste the suspicious message'}
                  </label>
                  <textarea
                    id="scan-text"
                    value={text}
                    rows={8}
                    required
                    maxLength={messageLimit}
                    aria-describedby="scan-count"
                    className="workspace-field resize-y"
                    placeholder="Paste the message you want to assess"
                    onChange={(e) => setText(e.target.value)}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p id="scan-count" className="text-sm text-muted">
                      {text.length.toLocaleString()} /{' '}
                      {messageLimit.toLocaleString()} characters
                    </p>
                    {kind === 'message' && (
                      <button
                        className="workspace-action"
                        type="button"
                        onClick={() => {
                          setText(example);
                          setError('');
                        }}
                      >
                        Use an example
                      </button>
                    )}
                  </div>
                </div>
              )}

              {kind === 'url' && (
                <Input
                  label="Suspicious URL"
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  required
                  maxLength={2048}
                  onChange={(e) => setUrl(e.target.value)}
                />
              )}

              {fileScan && (
                <div className="grid gap-3">
                  <label
                    className="workspace-upload"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      selectFile(e.dataTransfer.files[0]);
                    }}
                  >
                    <UploadCloud
                      size={30}
                      className="text-teal-700"
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-navy">
                      Drop a file here or choose a file
                    </span>
                    <span className="text-sm text-muted">
                      {fileTypes} · up to 5 MB
                    </span>
                    <input
                      className="sr-only"
                      type="file"
                      aria-label={
                        kind === 'image'
                          ? 'Choose a screenshot or photo'
                          : 'Choose a document'
                      }
                      accept={acceptedTypes.join(',')}
                      onChange={(e) => {
                        selectFile(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {preview && (
                    <img
                      src={preview}
                      alt="Selected screenshot preview"
                      className="max-h-56 max-w-full rounded-xl border border-line object-contain"
                    />
                  )}
                  {file && (
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                      <FileText size={20} aria-hidden="true" />
                      <div className="min-w-0 grow wrap-anywhere">
                        <b>{file.name}</b>
                        <p className="text-sm text-muted">
                          {Math.ceil(file.size / 1024)} KB · {file.type}
                        </p>
                      </div>
                      <Button variant="secondary" onClick={removeFile}>
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {availability === 'ai' && (
                <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm leading-6">
                  <input
                    className="mt-1 size-4 shrink-0 accent-teal-700"
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    Use OpenAI to analyze this submission. The assessment will
                    be saved to my scan history.{' '}
                    {fileScan &&
                      'If Cloudinary storage is enabled, my original file will be stored privately until I delete the report.'}
                  </span>
                </label>
              )}
              {reputationEnabled &&
                (kind === 'url' || (kind === 'job' && job.url.trim())) && (
                  <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm leading-6">
                    <input
                      className="mt-1 size-4 shrink-0 accent-teal-700"
                      type="checkbox"
                      checked={allowReputation}
                      onChange={(e) => setAllowReputation(e.target.checked)}
                    />
                    <span>
                      Check the link against URLhaus malware records. URLhaus
                      receives the address without credentials, query
                      parameters, or fragments.
                    </span>
                  </label>
                )}
              {availability === 'ai' && !consent && !fileScan && (
                <p className="text-sm text-muted">
                  Rule-based checks are available without sending your
                  submission to OpenAI.
                </p>
              )}
              {availability === 'rules' && (
                <Alert>
                  {fileScan
                    ? 'Image and document scanning require an OpenAI API key configured on the server.'
                    : 'Rule-based checks are available. Your assessment will be saved to scan history.'}
                </Alert>
              )}
              {availability === 'error' && (
                <Alert variant="danger">
                  Could not check scanner availability. Reload this page and try
                  again.
                </Alert>
              )}
              {error && <Alert variant="danger">{error}</Alert>}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  disabled={
                    availability === 'loading' ||
                    availability === 'error' ||
                    (fileScan && availability === 'rules')
                  }
                >
                  {busy ? (
                    <Spinner label="Analyzing submission" />
                  ) : (
                    <>
                      Run analysis <ArrowRight size={17} aria-hidden="true" />
                    </>
                  )}
                </Button>
                <Button variant="secondary" onClick={clear}>
                  Clear
                </Button>
              </div>
            </fieldset>
          </form>
        </Card>

        <aside className="grid gap-4">
          <Card className="p-5">
            <h2 className="font-bold text-navy">Before you submit</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
              {guidance[kind].map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-bold text-navy">
              <LockKeyhole size={17} aria-hidden="true" /> Protect your privacy
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Remove sensitive details before submitting. Reports are accessible
              from your account.
            </p>
            <LinkButton to="/app/history" variant="secondary" className="mt-4">
              View scan history
            </LinkButton>
          </Card>
        </aside>
      </div>
    </div>
  );
}

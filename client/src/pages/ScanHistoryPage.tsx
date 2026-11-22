import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Flag,
  History,
  ShieldAlert,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button, LinkButton } from '../components/ui/Button';
import { Alert, Spinner } from '../components/ui/Feedback';
import { Card } from '../components/ui/Surfaces';
import { scanners } from '../data/scanners';
import { accountErrorMessage } from '../services/authApi';
import { scanApi } from '../services/scanApi';
import { imageFlagLabels, type Risk, type ScanReport } from '../types/scans';

const riskNames: Record<Risk, string> = {
  low: 'Low risk',
  moderate: 'Moderate risk',
  high: 'High risk',
  unknown: 'Insufficient evidence',
};
const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function RiskBadge({ risk }: { risk: Risk }) {
  return (
    <span className="workspace-risk" data-risk={risk}>
      {riskNames[risk]}
    </span>
  );
}

export function ScanHistoryPage() {
  const [reports, setReports] = useState<ScanReport[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);

  function load(before?: string) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError('');
    void scanApi
      .list(controller.signal, before)
      .then(
        (page) => {
          if (controller.signal.aborted) return;
          setReports((current) =>
            before ? [...current, ...page.reports] : page.reports,
          );
          setNext(page.next);
        },
        (failure) => {
          if (!controller.signal.aborted)
            setError(accountErrorMessage(failure));
        },
      )
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
  }

  useEffect(() => {
    const controller = new AbortController();
    void scanApi
      .list(controller.signal)
      .then(
        (page) => {
          if (!controller.signal.aborted) {
            setReports(page.reports);
            setNext(page.next);
          }
        },
        (failure) => {
          if (!controller.signal.aborted)
            setError(accountErrorMessage(failure));
        },
      )
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => {
      controller.abort();
      active.current?.abort();
    };
  }, []);

  return (
    <div className="workspace-content grid gap-6">
      <div className="workspace-page-heading">
        <span className="workspace-icon" data-tone="blue">
          <History size={24} aria-hidden="true" />
        </span>
        <div>
          <h1>Your scan history</h1>
          <p>Revisit the assessments saved to your account.</p>
        </div>
      </div>
      {error && (
        <Alert variant="danger">
          {error}{' '}
          <button
            type="button"
            className="workspace-action"
            onClick={() => load(next ?? undefined)}
          >
            Try again
          </button>
        </Alert>
      )}
      {reports.length > 0 && (
        <ul className="grid gap-3">
          {reports.map((report) => (
            <li key={report.id}>
              <Link
                to={'/app/history/' + report.id}
                className="workspace-history-row"
              >
                <div className="min-w-0">
                  <p className="font-bold text-navy">
                    {scanners[report.kind].label}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {dateFormat.format(new Date(report.createdAt))}
                  </p>
                </div>
                <RiskBadge risk={report.risk} />
                <ArrowRight
                  size={18}
                  aria-hidden="true"
                  className="ml-auto shrink-0"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {busy && <Spinner label="Loading reports" />}
      {!busy && !error && reports.length === 0 && (
        <Card className="grid justify-items-start gap-3 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-navy">No saved scans yet</h2>
          <p className="text-muted">Run a scan to see its report here.</p>
          <LinkButton to="/app#scanners">Choose a scanner</LinkButton>
        </Card>
      )}
      {next && !error && (
        <div>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => load(next)}
          >
            Load older reports
          </Button>
        </div>
      )}
    </div>
  );
}

export function ScanReportPage() {
  const { id = '' } = useParams();
  return <Report key={id} id={id} />;
}

function Report({ id }: { id: string }) {
  const navigate = useNavigate();
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void scanApi.detail(id, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setReport(data.report);
      },
      (failure) => {
        if (!controller.signal.aborted) setError(accountErrorMessage(failure));
      },
    );
    return () => controller.abort();
  }, [id]);

  async function remove() {
    setRemoving(true);
    setError('');
    try {
      await scanApi.remove(id);
      void navigate('/app/history', { replace: true });
    } catch (failure) {
      setError(accountErrorMessage(failure));
      setRemoving(false);
    }
  }

  return (
    <div className="workspace-content grid gap-5">
      <Link className="workspace-action w-fit" to="/app/history">
        <ArrowLeft size={17} aria-hidden="true" /> Scan history
      </Link>
      <h1 className="text-3xl font-bold tracking-tight text-navy">
        Assessment report
      </h1>
      {error && <Alert variant="danger">{error}</Alert>}
      {!report && !error && <Spinner label="Loading assessment" />}
      {report && (
        <>
          <Card className="grid gap-4 p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-3">
              <RiskBadge risk={report.risk} />
              <span className="text-sm font-semibold text-muted">
                {report.source === 'ai'
                  ? 'AI-assisted analysis'
                  : 'Rule-based analysis'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-navy">
              {scanners[report.kind].label}
            </h2>
            <p className="text-sm text-muted">
              {dateFormat.format(new Date(report.createdAt))}
            </p>
            <p className="leading-relaxed wrap-anywhere">{report.summary}</p>
          </Card>
          {report.imageFlags && report.imageFlags.length > 0 && (
            <section
              aria-labelledby="image-flags"
              className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-950 sm:p-7"
            >
              <h2
                id="image-flags"
                className="flex items-center gap-2 text-lg font-bold"
              >
                <Flag size={20} aria-hidden="true" /> Suspicious signs in this
                image
              </h2>
              <ul className="mt-4 grid gap-3">
                {report.imageFlags.map(({ kind, evidence }) => (
                  <li key={kind} className="wrap-anywhere">
                    <strong>{imageFlagLabels[kind]}</strong>
                    <p>{evidence}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {report.kind === 'image' && (
            <p className="rounded-xl border border-line bg-white p-4 text-sm text-muted">
              This is a visual assessment. Independent verification is needed to
              establish whether an image is authentic or whether a request is
              legitimate.
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <ReportList
              title="Warning signs"
              items={report.findings}
              empty="No specific warning signs were identified."
              icon={ShieldAlert}
            />
            <ReportList
              title="What to do next"
              items={report.actions}
              empty="Verify the request through an official contact."
              icon={CheckCircle2}
            />
          </div>
          <Alert>
            {report.limitations} Verify important requests independently before
            taking action.
          </Alert>
          <div className="flex flex-wrap items-center gap-3">
            {confirmDelete ? (
              <>
                <p className="text-sm font-semibold" role="status">
                  Remove this report from your scan history?
                </p>
                <Button onClick={remove} disabled={removing}>
                  {removing ? 'Deleting…' : 'Confirm deletion'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmDelete(false)}
                  disabled={removing}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(true)}
              >
                Delete report
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ReportList({
  title,
  items,
  empty,
  icon: Icon,
}: {
  title: string;
  items: string[];
  empty: string;
  icon: typeof ShieldAlert;
}) {
  return (
    <Card className="p-5 sm:p-7">
      <h2 className="flex items-center gap-2 text-lg font-bold text-navy">
        <Icon size={21} aria-hidden="true" /> {title}
      </h2>
      {items.length ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed wrap-anywhere text-muted">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-muted">{empty}</p>
      )}
    </Card>
  );
}

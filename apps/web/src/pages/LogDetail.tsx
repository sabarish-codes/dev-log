import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { LogFormDialog } from '../components/LogFormDialog';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { getLogByIdApi, type LogItem, type LogType } from '../api/logs';
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Folder,
  Loader2,
  Pencil,
  Tag as TagIcon,
  Trash2,
} from 'lucide-react';

export function LogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [log, setLog] = useState<LogItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (!id) return;

    getLogByIdApi(Number(id))
      .then((data) => {
        if (!ignore) {
          setLog(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError('Log entry not found.');
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  const reloadLog = async () => {
    if (!id) return;
    try {
      const data = await getLogByIdApi(Number(id));
      setLog(data);
    } catch {
      navigate('/logs');
    }
  };

  const getTypeBadgeClass = (type: LogType) => {
    switch (type) {
      case 'bug':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      case 'error':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'config':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'discovery':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center px-4">
        <h2 className="text-xl font-bold">Log Not Found</h2>
        <p className="text-sm text-muted-foreground">
          This entry either does not exist or belongs to another user.
        </p>
        <Link to="/logs">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to Logs
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      {/* Navigation Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 md:px-8 backdrop-blur-sm">
        <Link to="/logs">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Logs
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="gap-1.5"
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="gap-1.5 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 pt-8 space-y-6">
        {/* Meta Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`capitalize font-semibold text-xs ${getTypeBadgeClass(log.type)}`}
            >
              {log.type}
            </Badge>
            {log.project && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border px-2 py-0.5 rounded-sm">
                <Folder className="size-3" />
                {log.project}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{log.date ? log.date.slice(0, 10) : ''}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {log.timespentMinutes} minutes spent
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {log.title}
        </h1>

        {/* Tags */}
        {log.tags && log.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {log.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-sm bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground font-mono"
              >
                <TagIcon className="size-3 opacity-60" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Error Message Box (if present) */}
        {log.errorMsg && (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Error Output
            </span>
            <pre className="rounded-lg border bg-muted/50 p-3 text-xs font-mono text-destructive overflow-x-auto whitespace-pre-wrap">
              {log.errorMsg}
            </pre>
          </div>
        )}

        {/* What Happened */}
        {log.whatHappened && (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              What Happened
            </span>
            <p className="text-sm text-foreground/90 leading-relaxed rounded-lg border bg-card p-4">
              {log.whatHappened}
            </p>
          </div>
        )}

        {/* Fix / Takeaway (Primary Highlight) */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Fix & Takeaway
          </span>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {log.fixTakeaway}
          </div>
        </div>

        {/* Reference Link */}
        {log.link && (
          <div className="pt-2">
            <a
              href={log.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline underline-offset-4"
            >
              <span>{log.link}</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <LogFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        initialData={log}
        onSuccess={reloadLog}
      />

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        logId={log.id}
        logTitle={log.title}
        onSuccess={() => navigate('/logs')}
      />
    </div>
  );
}

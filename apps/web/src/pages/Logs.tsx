import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { LogFormDialog } from '../components/LogFormDialog';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { logoutApi } from '../api/auth';
import {
  getLogsApi,
  getStatsApi,
  type LogItem,
  type LogType,
  type Stats,
} from '../api/logs';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import {
  ArrowUpDown,
  Clock,
  Filter,
  Folder,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Search,
  Tag as TagIcon,
  Terminal,
  Trash2,
  User as UserIcon,
} from 'lucide-react';

export function LogsPage() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const [logsList, setLogsList] = useState<LogItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<LogItem | null>(null);
  const [deletingLog, setDeletingLog] = useState<LogItem | null>(null);

  const refreshData = async () => {
    try {
      const [fetchedLogs, fetchedStats] = await Promise.all([
        getLogsApi(),
        getStatsApi(),
      ]);
      setLogsList(fetchedLogs);
      setStats(fetchedStats);
    } catch {
      toast.error('Failed to refresh logs');
    }
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([getLogsApi(), getStatsApi()])
      .then(([fetchedLogs, fetchedStats]) => {
        if (!ignore) {
          setLogsList(fetchedLogs);
          setStats(fetchedStats);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError('Failed to load logs. Please try again.');
          setIsLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // Proceed with local cleanup
    } finally {
      clearAuth();
      toast.success('Logged out successfully');
      navigate('/');
    }
  };

  const handleOpenCreate = () => {
    setEditingLog(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (log: LogItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLog(log);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (log: LogItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingLog(log);
  };

  const formatHours = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 md:px-8 backdrop-blur-sm">
        <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
          <Terminal className="size-5 text-primary" />
          <span>dev-log</span>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleOpenCreate} className="gap-1.5">
            <Plus className="size-4" />
            <span className="hidden sm:inline">New Log</span>
          </Button>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground border-l pl-3 ml-1">
            <UserIcon className="size-3.5" />
            <span>{user?.username}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5 text-muted-foreground"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 px-4 py-6 md:px-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Top: Stats & Search/Filter Toolbar */}
        <section className="space-y-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border bg-card p-3 shadow-2xs">
              <span className="text-xs text-muted-foreground">Total Logs</span>
              <p className="text-2xl font-bold tracking-tight mt-1">
                {stats?.totalLogs ?? 0}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-3 shadow-2xs">
              <span className="text-xs text-muted-foreground">
                Time Debugging
              </span>
              <p className="text-2xl font-bold tracking-tight mt-1">
                {formatHours(stats?.totalTimespentMinutes ?? 0)}
              </p>
            </div>
          </div>

          {/* Search, Filter, Sort Toolbar (UI only for now) */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search logs by title, error, or fix... (UI only)"
                className="pl-8 text-sm"
                disabled
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" disabled>
                <Filter className="size-3.5 text-muted-foreground" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" disabled>
                <ArrowUpDown className="size-3.5 text-muted-foreground" />
                Sort
              </Button>
            </div>
          </div>
        </section>

        {/* Body: Log Cards */}
        <section>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-sm">Loading your logbook...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg p-6 bg-card">
              <p className="text-destructive text-sm font-medium">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : logsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-lg p-8">
              <Terminal className="size-10 text-muted-foreground/40 mb-3" />
              <h3 className="font-semibold text-lg">No logs captured yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Record your first engineering error or discovery to build your
                personal memory.
              </p>
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="mt-4 gap-1.5"
              >
                <Plus className="size-4" />
                Create First Log
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {logsList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/logs/${item.id}`)}
                  className="group relative flex flex-col justify-between rounded-lg border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm cursor-pointer"
                >
                  <div>
                    {/* Top Meta: Type, Project, Date, Time */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`capitalize font-semibold text-xs ${getTypeBadgeClass(item.type)}`}
                        >
                          {item.type}
                        </Badge>
                        {item.project && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Folder className="size-3" />
                            {item.project}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{item.date ? item.date.slice(0, 10) : ''}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" />
                          {item.timespentMinutes}m
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>

                    {/* Takeaway preview */}
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">
                      <strong className="text-foreground/80 font-medium">
                        Fix:{' '}
                      </strong>
                      {item.fixTakeaway}
                    </p>
                  </div>

                  {/* Bottom: Tags & Card Actions */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 rounded-sm bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground font-mono"
                        >
                          <TagIcon className="size-2.5 opacity-60" />
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => handleOpenEdit(item, e)}
                        title="Edit log"
                      >
                        <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => handleOpenDelete(item, e)}
                        title="Delete log"
                      >
                        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Shared Dialogs */}
      <LogFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingLog}
        onSuccess={refreshData}
      />

      <DeleteConfirmDialog
        open={Boolean(deletingLog)}
        onOpenChange={(open) => !open && setDeletingLog(null)}
        logId={deletingLog?.id ?? null}
        logTitle={deletingLog?.title ?? ''}
        onSuccess={refreshData}
      />
    </div>
  );
}

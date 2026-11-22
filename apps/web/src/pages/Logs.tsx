import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { LogFormDialog } from '../components/LogFormDialog';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { logoutApi } from '../api/auth';
import {
  getLogsApi,
  getProjectsApi,
  getStatsApi,
  getTagsApi,
  type LogItem,
  type LogType,
  type ProjectItem,
  type Stats,
  type TagItem,
} from '../api/logs';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Folder,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Tag as TagIcon,
  Terminal,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';

const LOG_TYPES: LogType[] = ['bug', 'error', 'config', 'discovery'];
const LIMIT_OPTIONS = [10, 20, 50];

export function LogsPage() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Query State
  const qParam = searchParams.get('q') || '';
  const typeParam = (searchParams.get('type') as LogType) || '';
  const projectParam = searchParams.get('project') || '';
  const tagsParam = searchParams.get('tags') || '';
  const fromParam = searchParams.get('from') || '';
  const toParam = searchParams.get('to') || '';
  const sortParam =
    (searchParams.get('sort') as 'newest' | 'oldest') || 'newest';
  const pageParam = Math.max(1, Number(searchParams.get('page')) || 1);
  const limitParam = Number(searchParams.get('limit')) || 10;

  // Sync search input with URL qParam using state derivation (zero refs during render)
  const [prevQ, setPrevQ] = useState(qParam);
  const [searchInput, setSearchInput] = useState(qParam);

  if (qParam !== prevQ) {
    setPrevQ(qParam);
    setSearchInput(qParam);
  }

  // Filter drawer toggle
  const [showFilters, setShowFilters] = useState(
    Boolean(typeParam || projectParam || tagsParam || fromParam || toParam),
  );

  // Data States
  const [logsList, setLogsList] = useState<LogItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [projectsList, setProjectsList] = useState<ProjectItem[]>([]);
  const [tagsList, setTagsList] = useState<TagItem[]>([]);

  // Loading States
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<LogItem | null>(null);
  const [deletingLog, setDeletingLog] = useState<LogItem | null>(null);

  // Active filter count
  const activeFiltersCount = [
    typeParam,
    projectParam,
    tagsParam,
    fromParam,
    toParam,
  ].filter(Boolean).length;

  // Helper to update URL params
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      setIsFetching(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, val] of Object.entries(updates)) {
          if (!val) {
            next.delete(key);
          } else {
            next.set(key, val);
          }
        }
        return next;
      });
    },
    [setSearchParams],
  );

  // 1. Fetch dropdown options (projects & tags) & stats once on mount
  useEffect(() => {
    let ignore = false;
    Promise.all([getStatsApi(), getProjectsApi(), getTagsApi()])
      .then(([fetchedStats, fetchedProjects, fetchedTags]) => {
        if (!ignore) {
          setStats(fetchedStats);
          setProjectsList(fetchedProjects);
          setTagsList(fetchedTags);
        }
      })
      .catch(() => {
        // Non-fatal if metadata options fail
      });

    return () => {
      ignore = true;
    };
  }, []);

  // 2. Fetch logs on URL params change
  useEffect(() => {
    let ignore = false;

    getLogsApi({
      q: qParam || undefined,
      type: typeParam || undefined,
      project: projectParam || undefined,
      tags: tagsParam || undefined,
      from: fromParam || undefined,
      to: toParam || undefined,
      sort: sortParam,
      page: pageParam,
      limit: limitParam,
    })
      .then((res) => {
        if (!ignore) {
          setLogsList(res.data);
          setTotalCount(res.meta.total);
          setIsInitialLoading(false);
          setIsFetching(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError('Failed to load logs. Please try again.');
          setIsInitialLoading(false);
          setIsFetching(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [
    qParam,
    typeParam,
    projectParam,
    tagsParam,
    fromParam,
    toParam,
    sortParam,
    pageParam,
    limitParam,
  ]);

  // 3. Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== qParam) {
        updateParams({
          q: searchInput.trim() || null,
          page: null, // Reset to page 1 on new search
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, qParam, updateParams]);

  const refreshData = async () => {
    try {
      setIsFetching(true);
      const [res, fetchedStats, fetchedProjects, fetchedTags] =
        await Promise.all([
          getLogsApi({
            q: qParam || undefined,
            type: typeParam || undefined,
            project: projectParam || undefined,
            tags: tagsParam || undefined,
            from: fromParam || undefined,
            to: toParam || undefined,
            sort: sortParam,
            page: pageParam,
            limit: limitParam,
          }),
          getStatsApi(),
          getProjectsApi(),
          getTagsApi(),
        ]);
      setLogsList(res.data);
      setTotalCount(res.meta.total);
      setStats(fetchedStats);
      setProjectsList(fetchedProjects);
      setTagsList(fetchedTags);
    } catch {
      toast.error('Failed to refresh data');
    } finally {
      setIsFetching(false);
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setPrevQ('');
    setIsFetching(true);
    setSearchParams(new URLSearchParams());
  };

  const handleToggleSort = () => {
    const nextSort = sortParam === 'newest' ? 'oldest' : 'newest';
    updateParams({ sort: nextSort === 'newest' ? null : nextSort, page: null });
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: newPage <= 1 ? null : String(newPage) });
  };

  const handleLimitChange = (newLimit: number) => {
    updateParams({
      limit: newLimit === 10 ? null : String(newLimit),
      page: null,
    });
  };

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

  const totalPages = Math.ceil(totalCount / limitParam) || 1;
  const startRange = totalCount === 0 ? 0 : (pageParam - 1) * limitParam + 1;
  const endRange = Math.min(pageParam * limitParam, totalCount);

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

          {/* Search, Filter, Sort Toolbar */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Debounced Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search title, error, what happened, or fix..."
                  className="pl-8 pr-8 text-sm"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      updateParams({ q: null, page: null });
                    }}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    title="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant={activeFiltersCount > 0 ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-1.5"
                >
                  <Filter className="size-3.5 text-muted-foreground" />
                  <span>Filter</span>
                  {activeFiltersCount > 0 && (
                    <span className="rounded-full bg-primary/20 text-primary px-1.5 py-0.2 text-[10px] font-semibold">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleSort}
                  className="gap-1.5"
                  title="Toggle sort order"
                >
                  <ArrowUpDown className="size-3.5 text-muted-foreground" />
                  <span className="capitalize">{sortParam}</span>
                </Button>

                {(activeFiltersCount > 0 || qParam) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="gap-1 text-muted-foreground hover:text-foreground text-xs"
                    title="Reset all filters and search"
                  >
                    <RotateCcw className="size-3" />
                    <span className="hidden sm:inline">Reset</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Expandable Filter Panel */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 rounded-lg border bg-card/60 p-3 shadow-2xs">
                {/* Type Filter */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Type
                  </label>
                  <select
                    value={typeParam}
                    onChange={(e) =>
                      updateParams({ type: e.target.value || null, page: null })
                    }
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:border-ring"
                  >
                    <option value="">All Types</option>
                    {LOG_TYPES.map((t) => (
                      <option key={t} value={t} className="capitalize">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Project Filter */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Project
                  </label>
                  <select
                    value={projectParam}
                    onChange={(e) =>
                      updateParams({
                        project: e.target.value || null,
                        page: null,
                      })
                    }
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:border-ring"
                  >
                    <option value="">All Projects</option>
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tag Filter */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Tag
                  </label>
                  <select
                    value={tagsParam}
                    onChange={(e) =>
                      updateParams({ tags: e.target.value || null, page: null })
                    }
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:border-ring"
                  >
                    <option value="">All Tags</option>
                    {tagsList.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* From Date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    From
                  </label>
                  <input
                    type="date"
                    value={fromParam}
                    onChange={(e) =>
                      updateParams({ from: e.target.value || null, page: null })
                    }
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:border-ring"
                  />
                </div>

                {/* To Date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    To
                  </label>
                  <input
                    type="date"
                    value={toParam}
                    onChange={(e) =>
                      updateParams({ to: e.target.value || null, page: null })
                    }
                    className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:border-ring"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Results Header: Count & Subtle Loading indicator */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <div className="flex items-center gap-2">
            <span>
              Showing{' '}
              <strong className="text-foreground font-semibold">
                {startRange}–{endRange}
              </strong>{' '}
              of <strong className="text-foreground">{totalCount}</strong> logs
            </span>
            {isFetching && (
              <Loader2 className="size-3 animate-spin text-primary" />
            )}
          </div>

          {/* Per Page Limit Selector */}
          <div className="flex items-center gap-1.5">
            <span>Per page:</span>
            {LIMIT_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleLimitChange(opt)}
                className={`px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
                  limitParam === opt
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Body: Log Cards */}
        <section>
          {isInitialLoading ? (
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
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-lg p-8">
              <Terminal className="size-10 text-muted-foreground/40 mb-3" />
              <h3 className="font-semibold text-lg">No matching logs found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                {activeFiltersCount > 0 || qParam
                  ? 'No entries match your active search terms or filters.'
                  : 'Record your first engineering error or discovery to build your personal memory.'}
              </p>

              {activeFiltersCount > 0 || qParam ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="mt-4 gap-1.5"
                >
                  <RotateCcw className="size-3.5" />
                  Clear All Filters
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleOpenCreate}
                  className="mt-4 gap-1.5"
                >
                  <Plus className="size-4" />
                  Create First Log
                </Button>
              )}
            </div>
          ) : (
            <div
              className={`grid grid-cols-1 gap-3 transition-opacity duration-150 ${
                isFetching ? 'opacity-60' : 'opacity-100'
              }`}
            >
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
                          onClick={(e) => {
                            e.stopPropagation();
                            updateParams({ tags: tag, page: null });
                          }}
                          className="inline-flex items-center gap-0.5 rounded-sm bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground font-mono hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"
                          title={`Filter by tag: ${tag}`}
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

        {/* Bottom Pagination Controls */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
            <div>
              Page <strong className="text-foreground">{pageParam}</strong> of{' '}
              <strong className="text-foreground">{totalPages}</strong>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pageParam <= 1 || isFetching}
                onClick={() => handlePageChange(pageParam - 1)}
                className="gap-1 text-xs"
              >
                <ChevronLeft className="size-3.5" />
                Previous
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={pageParam >= totalPages || isFetching}
                onClick={() => handlePageChange(pageParam + 1)}
                className="gap-1 text-xs"
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
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

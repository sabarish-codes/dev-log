import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  createLogApi,
  updateLogApi,
  type LogItem,
  type LogType,
} from '../api/logs';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface LogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: LogItem | null;
  onSuccess: () => void;
}

const LOG_TYPES: LogType[] = ['bug', 'error', 'config', 'discovery'];

export function LogFormDialog({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}: LogFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Log' : 'New Engineering Log'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update problem details or takeaways'
              : 'Record what broke and what fixed it in under a minute.'}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <LogFormContent
            key={initialData?.id ?? 'new'}
            initialData={initialData}
            onCancel={() => onOpenChange(false)}
            onSuccess={() => {
              onSuccess();
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface LogFormContentProps {
  initialData?: LogItem | null;
  onCancel: () => void;
  onSuccess: () => void;
}

function LogFormContent({
  initialData,
  onCancel,
  onSuccess,
}: LogFormContentProps) {
  const isEditing = Boolean(initialData);

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [type, setType] = useState<LogType>(initialData?.type ?? 'bug');
  const [project, setProject] = useState(initialData?.project ?? '');
  const [tags, setTags] = useState(initialData?.tags?.join(', ') ?? '');
  const [timespentMinutes, setTimespentMinutes] = useState(
    initialData?.timespentMinutes ?? 30,
  );
  const [date, setDate] = useState(() =>
    initialData?.date
      ? initialData.date.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [errorMsg, setErrorMsg] = useState(initialData?.errorMsg ?? '');
  const [whatHappened, setWhatHappened] = useState(
    initialData?.whatHappened ?? '',
  );
  const [fixTakeaway, setFixTakeaway] = useState(
    initialData?.fixTakeaway ?? '',
  );
  const [link, setLink] = useState(initialData?.link ?? '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title,
      type,
      project: project.trim() || null,
      tags: parsedTags,
      timespentMinutes: Number(timespentMinutes),
      date,
      errorMsg: errorMsg.trim() || null,
      whatHappened: whatHappened.trim() || null,
      fixTakeaway,
      link: link.trim() || null,
    };

    try {
      if (isEditing && initialData) {
        await updateLogApi(initialData.id, payload);
        toast.success('Log updated successfully');
      } else {
        await createLogApi(payload);
        toast.success('Log captured successfully');
      }
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || 'Failed to save log';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      {/* Type selector */}
      <div className="space-y-1.5">
        <Label>Type</Label>
        <div className="grid grid-cols-4 gap-2">
          {LOG_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`capitalize py-1.5 px-3 rounded-md text-xs font-medium border transition-all ${
                type === t
                  ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                  : 'border-border text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          placeholder="e.g. Docker container cannot reach host PostgreSQL"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Project & Tags */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="project">Project</Label>
          <Input
            id="project"
            placeholder="e.g. dev-log"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            placeholder="docker, postgres, networking"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
      </div>

      {/* Date & Time Spent */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="timespent">Time Spent (minutes) *</Label>
          <Input
            id="timespent"
            type="number"
            min={1}
            required
            value={timespentMinutes}
            onChange={(e) => setTimespentMinutes(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Error Message */}
      {type !== 'discovery' && (
        <div className="space-y-1.5">
          <Label htmlFor="errorMsg">Error Message / Code</Label>
          <Input
            id="errorMsg"
            placeholder="e.g. connect ECONNREFUSED 127.0.0.1:5432"
            value={errorMsg}
            onChange={(e) => setErrorMsg(e.target.value)}
          />
        </div>
      )}

      {/* What happened */}
      <div className="space-y-1.5">
        <Label htmlFor="whatHappened">What Happened</Label>
        <Textarea
          id="whatHappened"
          rows={2}
          placeholder="Context, environment, expected vs actual..."
          value={whatHappened}
          onChange={(e) => setWhatHappened(e.target.value)}
        />
      </div>

      {/* Fix / Takeaway */}
      <div className="space-y-1.5">
        <Label htmlFor="fixTakeaway">Fix / Takeaway *</Label>
        <Textarea
          id="fixTakeaway"
          rows={3}
          placeholder="The solution and why it worked..."
          required
          value={fixTakeaway}
          onChange={(e) => setFixTakeaway(e.target.value)}
        />
      </div>

      {/* Reference Link */}
      <div className="space-y-1.5">
        <Label htmlFor="link">Reference Link</Label>
        <Input
          id="link"
          type="url"
          placeholder="https://docs.docker.com/..."
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {isEditing ? 'Save Changes' : 'Create Entry'}
        </Button>
      </DialogFooter>
    </form>
  );
}

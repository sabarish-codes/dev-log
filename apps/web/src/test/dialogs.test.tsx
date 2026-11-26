import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LogFormDialog } from '../components/LogFormDialog';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import {
  createLogApi,
  deleteLogApi,
  updateLogApi,
  type LogItem,
} from '../api/logs';
import { toast } from 'sonner';

vi.mock('../api/logs', () => ({
  createLogApi: vi.fn(),
  updateLogApi: vi.fn(),
  deleteLogApi: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const sampleLog: LogItem = {
  id: 10,
  userId: 1,
  projectId: 2,
  project: 'dev-log',
  title: 'Old title',
  type: 'error',
  errorMsg: 'ECONNREFUSED',
  whatHappened: 'Container could not connect',
  fixTakeaway: 'Use host.docker.internal',
  link: null,
  date: '2026-11-01T00:00:00.000Z',
  timespentMinutes: 25,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  tags: ['docker', 'postgres'],
};

describe('Log Dialogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LogFormDialog', () => {
    it('creates a new log and hides error message input when discovery is selected', async () => {
      vi.mocked(createLogApi).mockResolvedValueOnce(sampleLog);
      const onSuccess = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <LogFormDialog
          open={true}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />,
      );

      expect(screen.getByText('New Engineering Log')).toBeInTheDocument();
      expect(screen.getByLabelText(/error message/i)).toBeInTheDocument();

      // Selecting discovery hides error message field
      fireEvent.click(screen.getByRole('button', { name: 'discovery' }));
      expect(screen.queryByLabelText(/error message/i)).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/title/i), {
        target: { value: 'Found Drizzle $onUpdate' },
      });
      fireEvent.change(screen.getByLabelText(/fix \/ takeaway/i), {
        target: { value: 'Runs automatically on update' },
      });
      fireEvent.change(screen.getByLabelText(/tags/i), {
        target: { value: 'drizzle, orm' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create entry/i }));

      await waitFor(() => {
        expect(createLogApi).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Found Drizzle $onUpdate',
            type: 'discovery',
            fixTakeaway: 'Runs automatically on update',
            tags: ['drizzle', 'orm'],
          }),
        );
      });

      expect(onSuccess).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('pre-fills fields in edit mode and calls updateLogApi', async () => {
      vi.mocked(updateLogApi).mockResolvedValueOnce({
        ...sampleLog,
        title: 'Updated title',
      });
      const onSuccess = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <LogFormDialog
          open={true}
          onOpenChange={onOpenChange}
          initialData={sampleLog}
          onSuccess={onSuccess}
        />,
      );

      expect(screen.getByText('Edit Log')).toBeInTheDocument();
      const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
      expect(titleInput.value).toBe('Old title');

      fireEvent.change(titleInput, { target: { value: 'Updated title' } });
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(updateLogApi).toHaveBeenCalledWith(
          10,
          expect.objectContaining({ title: 'Updated title' }),
        );
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe('DeleteConfirmDialog', () => {
    it('calls deleteLogApi and closes on confirm', async () => {
      vi.mocked(deleteLogApi).mockResolvedValueOnce(undefined);
      const onSuccess = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={onOpenChange}
          logId={10}
          logTitle="Old title"
          onSuccess={onSuccess}
        />,
      );

      expect(screen.getByText(/"Old title"/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

      await waitFor(() => {
        expect(deleteLogApi).toHaveBeenCalledWith(10);
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('shows error toast when delete fails', async () => {
      vi.mocked(deleteLogApi).mockRejectedValueOnce(new Error('Server error'));

      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={vi.fn()}
          logId={10}
          logTitle="Old title"
          onSuccess={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to delete log');
      });
    });
  });
});

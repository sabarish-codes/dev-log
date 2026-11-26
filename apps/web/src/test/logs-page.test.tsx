import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LogsPage } from '../pages/Logs';
import {
  getLogsApi,
  getProjectsApi,
  getStatsApi,
  getTagsApi,
  type LogItem,
} from '../api/logs';
import { useAuthStore } from '../stores/authStore';

vi.mock('../api/logs', () => ({
  getLogsApi: vi.fn(),
  getStatsApi: vi.fn(),
  getProjectsApi: vi.fn(),
  getTagsApi: vi.fn(),
  createLogApi: vi.fn(),
  updateLogApi: vi.fn(),
  deleteLogApi: vi.fn(),
}));

vi.mock('../api/auth', () => ({
  logoutApi: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

const sampleLogs: LogItem[] = [
  {
    id: 1,
    userId: 1,
    projectId: 1,
    project: 'dev-log',
    title: 'Docker ECONNREFUSED',
    type: 'error',
    errorMsg: 'ECONNREFUSED',
    whatHappened: null,
    fixTakeaway: 'Use host.docker.internal',
    link: null,
    date: '2026-11-01',
    timespentMinutes: 30,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    tags: ['docker'],
  },
];

describe('LogsPage URL state, search, filters, and pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setAuth(
      {
        id: 1,
        username: 'demo',
        email: 'demo@devlog.io',
        createdAt: '2026-11-01T00:00:00Z',
      },
      'token',
    );

    vi.mocked(getStatsApi).mockResolvedValue({
      totalLogs: 15,
      totalTimespentMinutes: 120,
    });
    vi.mocked(getProjectsApi).mockResolvedValue([
      { id: 1, name: 'dev-log', createdAt: '2026-11-01T00:00:00Z' },
    ]);
    vi.mocked(getTagsApi).mockResolvedValue([
      { id: 1, name: 'docker', createdAt: '2026-11-01T00:00:00Z' },
    ]);
    vi.mocked(getLogsApi).mockResolvedValue({
      data: sampleLogs,
      meta: { total: 15, page: 1, limit: 10 },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads initial filters and page from the URL and renders logs', async () => {
    render(
      <MemoryRouter initialEntries={['/logs?type=error&page=2']}>
        <Routes>
          <Route
            path="/logs"
            element={
              <>
                <LogsPage />
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Docker ECONNREFUSED')).toBeInTheDocument();
    });

    expect(getLogsApi).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        page: 2,
        sort: 'newest',
        limit: 10,
      }),
    );
  });

  it('syncs debounced search, filter changes, and pagination into the URL', async () => {
    render(
      <MemoryRouter initialEntries={['/logs']}>
        <Routes>
          <Route
            path="/logs"
            element={
              <>
                <LogsPage />
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Docker ECONNREFUSED')).toBeInTheDocument();
    });

    // Pagination -> page=2 in URL
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByTestId('location-search').textContent).toContain(
        'page=2',
      );
    });

    // Open filter drawer and pick project
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'dev-log' } });

    await waitFor(() => {
      const search = screen.getByTestId('location-search').textContent ?? '';
      expect(search).toContain('project=dev-log');
      expect(search).not.toContain('page=2'); // page resets on filter change
    });

    // Debounced search -> q=docker in URL
    vi.useFakeTimers();
    const searchInput = screen.getByPlaceholderText(/search title, error/i);
    fireEvent.change(searchInput, { target: { value: 'docker' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    vi.useRealTimers();
    await waitFor(() => {
      expect(screen.getByTestId('location-search').textContent).toContain(
        'q=docker',
      );
    });
  });

  it('shows empty state and clears all filters from URL', async () => {
    vi.mocked(getLogsApi).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 10 },
    });

    render(
      <MemoryRouter initialEntries={['/logs?q=nonexistent&type=bug']}>
        <Routes>
          <Route
            path="/logs"
            element={
              <>
                <LogsPage />
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('No matching logs found')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /clear all filters/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location-search').textContent).toBe('');
    });
  });
});

import { api } from '../lib/axios';

export type LogType = 'bug' | 'error' | 'config' | 'discovery';

export interface LogItem {
  id: number;
  userId: number;
  projectId: number | null;
  project: string | null;
  title: string;
  type: LogType;
  errorMsg: string | null;
  whatHappened: string | null;
  fixTakeaway: string;
  link: string | null;
  date: string;
  timespentMinutes: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface LogPayload {
  title: string;
  type: LogType;
  errorMsg?: string | null;
  whatHappened?: string | null;
  fixTakeaway: string;
  link?: string | null;
  date: string;
  timespentMinutes: number;
  project?: string | null;
  tags?: string[];
}

export interface Stats {
  totalLogs: number;
  totalTimespentMinutes: number;
}

export async function getLogsApi(): Promise<LogItem[]> {
  const { data } = await api.get<{ data: { logs: LogItem[] } }>('/api/v1/logs');
  return data.data.logs;
}

export async function getLogByIdApi(id: number): Promise<LogItem> {
  const { data } = await api.get<{ data: { log: LogItem } }>(
    `/api/v1/logs/${id}`,
  );
  return data.data.log;
}

export async function createLogApi(payload: LogPayload): Promise<LogItem> {
  const { data } = await api.post<{ data: { log: LogItem } }>(
    '/api/v1/logs',
    payload,
  );
  return data.data.log;
}

export async function updateLogApi(
  id: number,
  payload: Partial<LogPayload>,
): Promise<LogItem> {
  const { data } = await api.patch<{ data: { log: LogItem } }>(
    `/api/v1/logs/${id}`,
    payload,
  );
  return data.data.log;
}

export async function deleteLogApi(id: number): Promise<void> {
  await api.delete(`/api/v1/logs/${id}`);
}

export async function getStatsApi(): Promise<Stats> {
  const { data } = await api.get<{ data: { stats: Stats } }>('/api/v1/stats');
  return data.data.stats;
}

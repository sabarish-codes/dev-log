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

export interface GetLogsQueryParams {
  q?: string;
  type?: LogType;
  project?: string;
  tags?: string; // Comma-separated list e.g. "docker,postgres"
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  sort?: 'newest' | 'oldest';
  page?: number;
  limit?: number;
}

export interface LogsResponse {
  data: LogItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ProjectItem {
  id: number;
  name: string;
  createdAt: string;
}

export interface TagItem {
  id: number;
  name: string;
  createdAt: string;
}

export async function getLogsApi(
  params?: GetLogsQueryParams,
): Promise<LogsResponse> {
  const { data } = await api.get<LogsResponse>('/api/v1/logs', {
    params,
  });
  return data;
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

export async function getProjectsApi(): Promise<ProjectItem[]> {
  const { data } = await api.get<{ data: ProjectItem[] }>('/api/v1/projects');
  return data.data;
}

export async function getTagsApi(): Promise<TagItem[]> {
  const { data } = await api.get<{ data: TagItem[] }>('/api/v1/tags');
  return data.data;
}

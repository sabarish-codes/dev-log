import {
  escapeLike,
  normalizeTagNames,
  parseSearchWords,
} from '../../src/services/logs.js';
import { getLogsQuerySchema } from '../../src/routes/logs.js';

describe('Logs pure helpers', () => {
  describe('escapeLike', () => {
    it('escapes %, _, and \\ characters', () => {
      expect(escapeLike('100%')).toBe('100\\%');
      expect(escapeLike('user_id')).toBe('user\\_id');
      expect(escapeLike('a\\b')).toBe('a\\\\b');
      expect(escapeLike('50%_off\\now')).toBe('50\\%\\_off\\\\now');
    });

    it('leaves normal text untouched', () => {
      expect(escapeLike('postgres docker')).toBe('postgres docker');
    });
  });

  describe('parseSearchWords', () => {
    it('returns empty array for undefined, empty, or whitespace', () => {
      expect(parseSearchWords(undefined)).toEqual([]);
      expect(parseSearchWords('')).toEqual([]);
      expect(parseSearchWords('   \t\n  ')).toEqual([]);
    });

    it('splits multi-word queries on arbitrary whitespace', () => {
      expect(parseSearchWords('  docker   postgres\t5432 ')).toEqual([
        'docker',
        'postgres',
        '5432',
      ]);
    });
  });

  describe('normalizeTagNames', () => {
    it('trims, drops empty strings, and deduplicates case-insensitively keeping first casing', () => {
      expect(
        normalizeTagNames([
          ' Docker ',
          'postgres',
          'docker',
          '',
          '  ',
          'POSTGRES',
        ]),
      ).toEqual(['docker', 'POSTGRES']);
    });
  });
});

describe('getLogsQuerySchema', () => {
  it('applies defaults when query is empty', () => {
    const parsed = getLogsQuerySchema.parse({});
    expect(parsed).toEqual({
      sort: 'newest',
      page: 1,
      limit: 10,
    });
  });

  it('converts empty strings to undefined for optional filters', () => {
    const parsed = getLogsQuerySchema.parse({
      q: '',
      type: '',
      project: '',
      tags: '',
      from: '',
      to: '',
    });
    expect(parsed.q).toBeUndefined();
    expect(parsed.type).toBeUndefined();
    expect(parsed.project).toBeUndefined();
    expect(parsed.tags).toBeUndefined();
    expect(parsed.from).toBeUndefined();
    expect(parsed.to).toBeUndefined();
  });

  it('parses comma-separated tags and coerces page/limit', () => {
    const parsed = getLogsQuerySchema.parse({
      tags: ' docker , postgres , ',
      page: '3',
      limit: '25',
      sort: 'oldest',
    });
    expect(parsed.tags).toEqual(['docker', 'postgres']);
    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(25);
    expect(parsed.sort).toBe('oldest');
  });

  it('rejects invalid type, sort, date format, or out-of-range limit', () => {
    expect(getLogsQuerySchema.safeParse({ type: 'invalid' }).success).toBe(
      false,
    );
    expect(getLogsQuerySchema.safeParse({ sort: 'random' }).success).toBe(
      false,
    );
    expect(getLogsQuerySchema.safeParse({ from: '2026/01/01' }).success).toBe(
      false,
    );
    expect(getLogsQuerySchema.safeParse({ limit: '100' }).success).toBe(false);
    expect(getLogsQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });
});

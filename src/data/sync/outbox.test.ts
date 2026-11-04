import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { outbox } from '../../lib/outbox';
import { reportError, resetReportingForTests } from '../../lib/report';
import { setDataContext } from '../context';
import { createSync } from './engine';
import { createFakeServer } from './fakeRemote';

const USER = '00000000-0000-4000-8000-0000000000dd';

// A tiny pretend localStorage and page, because these tests run without a browser
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal('window', { location: { pathname: '/party/abc' }, addEventListener: () => undefined });
  resetReportingForTests();
  setDataContext({ userId: USER, shopId: null });
});

describe('outbox', () => {
  it('keeps what is added, removes what is sent, and never grows past 50', () => {
    const ids = Array.from({ length: 60 }, (_, i) => outbox.add('feedback', { kind: 'idea', message: `m${i}` }));
    expect(outbox.size()).toBe(50);
    outbox.remove([ids[59]]);
    expect(outbox.size()).toBe(49);
    expect(outbox.all().some((i) => i.id === ids[59])).toBe(false);
  });
  it('survives broken stored data', () => {
    store.set('hv_outbox', '{not json');
    expect(outbox.all()).toEqual([]);
    expect(() => outbox.add('feedback', { kind: 'idea', message: 'x' })).not.toThrow();
  });
});

describe('error reports', () => {
  it('records what, where, which version and which phone, nothing about the khata', () => {
    expect(reportError(new Error('Boom'), 'screen')).toBe(true);
    const [item] = outbox.all();
    expect(item.table).toBe('error_log');
    expect(item.row).toMatchObject({ message: 'screen: Boom', path: '/party/abc' });
    expect(Object.keys(item.row).sort()).toEqual(['app_version', 'created_at', 'message', 'path', 'stack', 'user_agent']);
  });
  it('the same error again and again is one report', () => {
    const e = new Error('Same');
    expect(reportError(e)).toBe(true);
    expect(reportError(e)).toBe(false);
    expect(outbox.size()).toBe(1);
  });
  it('at most 10 per session, and noise is ignored', () => {
    for (let i = 0; i < 25; i++) reportError(new Error(`different ${i}`));
    expect(outbox.size()).toBe(10);
    resetReportingForTests();
    outbox.remove(outbox.all().map((i) => i.id));
    expect(reportError('ResizeObserver loop completed with undelivered notifications.')).toBe(false);
    expect(reportError('Script error.')).toBe(false);
  });
  it('works for things that are not Error objects', () => {
    expect(reportError('plain text problem')).toBe(true);
    expect(reportError(undefined)).toBe(true);
  });
});

describe('sending the outbox to our tables', () => {
  it('feedback and error reports go with the login id, then leave the outbox', async () => {
    const server = createFakeServer(USER);
    const sync = createSync(async () => server);
    outbox.add('feedback', { kind: 'problem', message: 'Voice nahi chalti', app_version: 'v1' });
    reportError(new Error('Crash'));
    await sync.flushOutbox();
    expect(outbox.size()).toBe(0);
    expect([...server.logs.feedback.values()][0]).toMatchObject({ kind: 'problem', message: 'Voice nahi chalti', user_id: USER });
    expect([...server.logs.error_log.values()][0]).toMatchObject({ message: 'Crash', user_id: USER });
  });

  it('without internet everything waits, then goes later (and only once)', async () => {
    const server = createFakeServer(USER);
    const sync = createSync(async () => server);
    outbox.add('feedback', { kind: 'idea', message: 'Ek idea' });
    server.offline = true;
    await sync.flushOutbox();
    expect(outbox.size()).toBe(1);
    server.offline = false;
    await sync.flushOutbox();
    await sync.flushOutbox();
    expect(outbox.size()).toBe(0);
    expect(server.logs.feedback.size).toBe(1);
  });

  it('an answer that got lost does not make a second copy (same id)', async () => {
    const server = createFakeServer(USER);
    const sync = createSync(async () => server);
    const id = outbox.add('feedback', { kind: 'thanks', message: 'Bahut achha' });
    await sync.flushOutbox();
    outbox.add('feedback', { kind: 'thanks', message: 'Bahut achha' }); // pretend the phone never noticed it was sent
    store.set('hv_outbox', JSON.stringify([{ id, table: 'feedback', row: { kind: 'thanks', message: 'Bahut achha' } }]));
    await sync.flushOutbox();
    expect(server.logs.feedback.size).toBe(1);
  });

  it('a report the server refuses is dropped, the good ones still go', async () => {
    const server = createFakeServer(USER);
    const sync = createSync(async () => server);
    outbox.add('feedback', { kind: 'idea', message: '   ' }); // empty: the database refuses it
    outbox.add('feedback', { kind: 'idea', message: 'Achha' });
    await sync.flushOutbox();
    expect(outbox.size()).toBe(0);
    expect(server.logs.feedback.size).toBe(1);
  });

  it('nothing is sent while logged out, and the reports are kept', async () => {
    const server = createFakeServer(USER);
    const sync = createSync(async () => server);
    outbox.add('feedback', { kind: 'idea', message: 'Achha' });
    setDataContext(null);
    await sync.flushOutbox();
    expect(outbox.size()).toBe(1);
    expect(server.calls.length).toBe(0);
  });
});

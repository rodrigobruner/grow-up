import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { AccessTrackingService } from './access-tracking.service';
import { AuthService } from './auth.service';
import { LoggerService } from './logger.service';

describe('AccessTrackingService', () => {
  it('upserts daily access event', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: () => ({ upsert })
    };

    TestBed.configureTestingModule({
      providers: [
        AccessTrackingService,
        { provide: AuthService, useValue: { getClient: () => client } },
        { provide: LoggerService, useValue: { warn: vi.fn() } }
      ]
    });

    const service = TestBed.inject(AccessTrackingService);
    await service.trackDailyAccess('user-1');

    expect(upsert).toHaveBeenCalled();
  });

  it('logs when upsert fails', async () => {
    const warn = vi.fn();
    const upsert = vi.fn().mockResolvedValue({ error: { message: 'fail' } });
    const client = {
      from: () => ({ upsert })
    };

    TestBed.configureTestingModule({
      providers: [
        AccessTrackingService,
        { provide: AuthService, useValue: { getClient: () => client } },
        { provide: LoggerService, useValue: { warn } }
      ]
    });

    const service = TestBed.inject(AccessTrackingService);
    await service.trackDailyAccess('user-1');

    expect(warn).toHaveBeenCalledWith('admin.access.track.failed', { message: 'fail' });
  });

  it('does not log warning for RLS forbidden errors', async () => {
    const warn = vi.fn();
    const upsert = vi.fn().mockResolvedValue({
      error: { code: '42501', message: 'new row violates row-level security policy' }
    });
    const client = {
      from: () => ({ upsert })
    };

    TestBed.configureTestingModule({
      providers: [
        AccessTrackingService,
        { provide: AuthService, useValue: { getClient: () => client } },
        { provide: LoggerService, useValue: { warn } }
      ]
    });

    const service = TestBed.inject(AccessTrackingService);
    await service.trackDailyAccess('user-1');

    expect(warn).not.toHaveBeenCalled();
  });

  it('uses date key from current date', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: () => ({ upsert })
    };
    const dateSpy = vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-10T10:00:00Z'));

    TestBed.configureTestingModule({
      providers: [
        AccessTrackingService,
        { provide: AuthService, useValue: { getClient: () => client } },
        { provide: LoggerService, useValue: { warn: vi.fn() } }
      ]
    });

    const service = TestBed.inject(AccessTrackingService);
    await service.trackDailyAccess('user-1');

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: 'user-1',
        accessed_at: '2026-02-10'
      }),
      { onConflict: 'owner_id,accessed_at' }
    );
    vi.useRealTimers();
  });
});

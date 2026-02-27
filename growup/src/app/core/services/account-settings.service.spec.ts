import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { AccountSettingsService } from './account-settings.service';
import { GrowUpDbService } from './growup-db.service';
import { AuthService } from './auth.service';
import { TranslateService } from '@ngx-translate/core';
import { AccountSettings } from '../models/account-settings';

describe('AccountSettingsService', () => {
  it('fills missing role, plan and flags when settings exist', async () => {
    const saveAccountSettings = vi.fn();
    const settings = { id: 'account', language: 'en', role: null, plan: null, flags: null } as unknown as AccountSettings;

    TestBed.configureTestingModule({
      providers: [
        AccountSettingsService,
        { provide: GrowUpDbService, useValue: { getAccountSettings: vi.fn().mockResolvedValue(settings), saveAccountSettings } },
        { provide: TranslateService, useValue: { setDefaultLang: vi.fn(), use: vi.fn(), currentLang: 'en', getDefaultLang: () => 'en' } },
        { provide: AuthService, useValue: { isLoggedIn: () => false } }
      ]
    });

    const service = TestBed.inject(AccountSettingsService);
    const result = await service.loadOrSeed(true);

    expect(saveAccountSettings).toHaveBeenCalledWith({
      id: 'account',
      language: 'en',
      role: 'USER',
      plan: 'FREE',
      flags: {}
    });
    expect(result?.role).toBe('USER');
    expect(result?.plan).toBe('FREE');
    expect(result?.flags).toEqual({});
  });

  it('loads plan flags when user is logged in', async () => {
    const saveAccountSettings = vi.fn();
    const settings: AccountSettings = { id: 'account', language: 'en', role: 'USER', plan: 'PRO', flags: {} };
    const rpc = vi.fn().mockResolvedValue({ data: { rewards: true, tasks: false }, error: null });

    TestBed.configureTestingModule({
      providers: [
        AccountSettingsService,
        { provide: GrowUpDbService, useValue: { getAccountSettings: vi.fn().mockResolvedValue(settings), saveAccountSettings } },
        { provide: TranslateService, useValue: { setDefaultLang: vi.fn(), use: vi.fn(), currentLang: 'en', getDefaultLang: () => 'en' } },
        { provide: AuthService, useValue: { isLoggedIn: () => true, getClient: () => ({ rpc }) } }
      ]
    });

    const service = TestBed.inject(AccountSettingsService);
    const result = await service.loadOrSeed(true);

    expect(rpc).toHaveBeenCalledWith('get_current_plan_feature_flags');
    expect(result?.flags).toEqual({ rewards: true, tasks: false });
    expect(saveAccountSettings).not.toHaveBeenCalled();
  });

  it('overrides stale local flags with RPC flags when user is logged in', async () => {
    const saveAccountSettings = vi.fn();
    const settings: AccountSettings = {
      id: 'account',
      language: 'en',
      role: 'USER',
      plan: 'PRO',
      flags: { rewards: false, tasks: true, profiles: true }
    };
    const rpc = vi.fn().mockResolvedValue({ data: { rewards: true, tasks: false, profiles: false }, error: null });

    TestBed.configureTestingModule({
      providers: [
        AccountSettingsService,
        { provide: GrowUpDbService, useValue: { getAccountSettings: vi.fn().mockResolvedValue(settings), saveAccountSettings } },
        { provide: TranslateService, useValue: { setDefaultLang: vi.fn(), use: vi.fn(), currentLang: 'en', getDefaultLang: () => 'en' } },
        { provide: AuthService, useValue: { isLoggedIn: () => true, getClient: () => ({ rpc }) } }
      ]
    });

    const service = TestBed.inject(AccountSettingsService);
    const result = await service.loadOrSeed(true);

    expect(rpc).toHaveBeenCalledWith('get_current_plan_feature_flags');
    expect(result?.flags).toEqual({ rewards: true, tasks: false, profiles: false });
    expect(saveAccountSettings).not.toHaveBeenCalled();
  });

  it('returns null when plan flags response is invalid', async () => {
    const saveAccountSettings = vi.fn();
    const settings: AccountSettings = { id: 'account', language: 'en', role: 'USER', plan: 'PRO', flags: {} };
    const rpc = vi.fn().mockResolvedValue({ data: 'invalid', error: null });

    TestBed.configureTestingModule({
      providers: [
        AccountSettingsService,
        { provide: GrowUpDbService, useValue: { getAccountSettings: vi.fn().mockResolvedValue(settings), saveAccountSettings } },
        { provide: TranslateService, useValue: { setDefaultLang: vi.fn(), use: vi.fn(), currentLang: 'en', getDefaultLang: () => 'en' } },
        { provide: AuthService, useValue: { isLoggedIn: () => true, getClient: () => ({ rpc }) } }
      ]
    });

    const service = TestBed.inject(AccountSettingsService);
    const result = await service.loadOrSeed(true);

    expect(rpc).toHaveBeenCalledWith('get_current_plan_feature_flags');
    expect(result?.flags).toEqual({});
    expect(saveAccountSettings).not.toHaveBeenCalled();
  });

  it('updates language while preserving role, plan and flags', async () => {
    const saveAccountSettings = vi.fn();
    const settings: AccountSettings = {
      id: 'account',
      language: 'en',
      role: 'ADMIN',
      plan: 'DEV',
      flags: { rewards: true }
    };

    TestBed.configureTestingModule({
      providers: [
        AccountSettingsService,
        { provide: GrowUpDbService, useValue: { getAccountSettings: vi.fn().mockResolvedValue(settings), saveAccountSettings } },
        { provide: TranslateService, useValue: { setDefaultLang: vi.fn(), use: vi.fn(), currentLang: 'en', getDefaultLang: () => 'en' } },
        { provide: AuthService, useValue: { isLoggedIn: () => false } }
      ]
    });

    const service = TestBed.inject(AccountSettingsService);
    const result = await service.updateLanguage('pt');

    expect(saveAccountSettings).toHaveBeenCalledWith({
      id: 'account',
      language: 'pt',
      role: 'ADMIN',
      plan: 'DEV',
      flags: { rewards: true }
    });
    expect(result.language).toBe('pt');
    expect(result.role).toBe('ADMIN');
    expect(result.plan).toBe('DEV');
    expect(result.flags).toEqual({ rewards: true });
  });
});

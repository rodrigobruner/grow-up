import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AccountSettings } from '../models/account-settings';
import { AuthService } from './auth.service';
import { GrowUpDbService } from './growup-db.service';

@Injectable({ providedIn: 'root' })
export class AccountSettingsService {
  private readonly db = inject(GrowUpDbService);
  private readonly translate = inject(TranslateService);
  private readonly auth = inject(AuthService);

  constructor() {
    this.translate.setDefaultLang('en');
    this.translate.use('en');
  }

  async loadOrSeed(seedIfEmpty: boolean): Promise<AccountSettings | null> {
    const settings = await this.db.getAccountSettings();
    if (settings) {
      if (!settings.role || !settings.plan || !settings.flags) {
        const next: AccountSettings = {
          ...settings,
          role: settings.role ?? 'USER',
          plan: settings.plan ?? 'FREE',
          flags: settings.flags ?? {}
        };
        await this.db.saveAccountSettings(next);
        this.applyLanguage(next.language);
        return this.applyEffectiveFlags(next);
      }
      this.applyLanguage(settings.language);
      return this.applyEffectiveFlags(settings);
    }
    if (!seedIfEmpty) {
      return null;
    }
    const next: AccountSettings = { id: 'account', language: 'en', role: 'USER', plan: 'FREE', flags: {} };
    await this.db.saveAccountSettings(next);
    this.applyLanguage(next.language);
    return this.applyEffectiveFlags(next);
  }

  applyLanguage(language: AccountSettings['language']): void {
    this.translate.use(language);
  }

  async updateLanguage(language: AccountSettings['language']): Promise<AccountSettings> {
    const current = this.db.getAccountSettings();
    const resolved = await current;
    const next: AccountSettings = {
      id: 'account',
      language,
      role: resolved?.role ?? 'USER',
      plan: resolved?.plan ?? 'FREE',
      flags: resolved?.flags ?? {}
    };
    await this.db.saveAccountSettings(next);
    this.applyLanguage(language);
    return next;
  }

  private async applyEffectiveFlags(settings: AccountSettings): Promise<AccountSettings> {
    if (!this.auth.isLoggedIn()) {
      return settings;
    }
    const flags = await this.loadPlanFlags();
    if (!flags) {
      return settings;
    }
    return { ...settings, flags };
  }

  private async loadPlanFlags(): Promise<Record<string, boolean> | null> {
    const { data, error } = await this.auth.getClient().rpc('get_current_plan_feature_flags');
    if (error) {
      return null;
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return null;
    }
    const resolved: Record<string, boolean> = {};
    Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        resolved[key] = value;
      }
    });
    return resolved;
  }
}

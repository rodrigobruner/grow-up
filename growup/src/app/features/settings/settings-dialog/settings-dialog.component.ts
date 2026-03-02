import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, computed, EventEmitter, inject, Input, OnChanges, Output, signal, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AccountSettings } from '../../../core/models/account-settings';
import { Profile } from '../../../core/models/profile';
import { Settings } from '../../../core/models/settings';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { DeleteAccountDialogComponent } from '../delete-account-dialog/delete-account-dialog.component';
import { AuthErrorDialogComponent } from '../../auth/auth-error-dialog/auth-error-dialog.component';
import { SettingsLanguageSectionComponent } from './sections/settings-language-section/settings-language-section.component';
import { SettingsProfilesSectionComponent } from './sections/settings-profiles-section/settings-profiles-section.component';
import { SettingsCycleSectionComponent } from './sections/settings-cycle-section/settings-cycle-section.component';
import { SettingsLevelupSectionComponent } from './sections/settings-levelup-section/settings-levelup-section.component';
import { SettingsCacheSectionComponent } from './sections/settings-cache-section/settings-cache-section.component';
import { SettingsDangerSectionComponent } from './sections/settings-danger-section/settings-danger-section.component';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    TranslateModule,
    SettingsLanguageSectionComponent,
    SettingsProfilesSectionComponent,
    SettingsCycleSectionComponent,
    SettingsLevelupSectionComponent,
    SettingsCacheSectionComponent,
    SettingsDangerSectionComponent
  ],
  templateUrl: './settings-dialog.component.html',
  styleUrl: './settings-dialog.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class SettingsDialogComponent implements OnChanges {
  @Input() accountSettings: AccountSettings | null = null;
  @Input() profileSettings: Settings | null = null;
  @Input() profiles: Profile[] = [];
  @Input() activeProfileId: string | null = null;
  @Output() closeSettings = new EventEmitter<void>();
  @Output() saveSettings = new EventEmitter<{
    language: AccountSettings['language'];
    profile: Pick<Settings, 'avatarId' | 'displayName' | 'cycleType' | 'cycleStartDate' | 'levelUpPoints'>;
  }>();
  @Output() selectProfile = new EventEmitter<string>();
  @Output() deleteProfile = new EventEmitter<string>();

  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly document = inject(DOCUMENT);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly translateService = inject(TranslateService);
  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());
  avatars = signal<Array<{ id: string; name: string; description?: string }>>([]);

  form = this.formBuilder.group({
    language: this.formBuilder.control<AccountSettings['language']>('en', { validators: [Validators.required] }),
    displayName: this.formBuilder.control<string>('', {
      validators: [Validators.required, Validators.maxLength(40)]
    }),
    avatarId: this.formBuilder.control<Settings['avatarId']>('01', { validators: [Validators.required] }),
    cycleType: this.formBuilder.control<Settings['cycleType']>('biweekly', { validators: [Validators.required] }),
    cycleStartDate: this.formBuilder.control<Settings['cycleStartDate']>(this.today(), {
      validators: [Validators.required]
    }),
    levelUpPoints: this.formBuilder.control<Settings['levelUpPoints']>(100, {
      validators: [Validators.required, Validators.min(10)]
    })
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['accountSettings'] && this.accountSettings) {
      this.form.reset({
        language: this.accountSettings.language,
        displayName: this.form.get('displayName')?.value ?? '',
        avatarId: this.form.get('avatarId')?.value ?? '01',
        cycleType: this.form.get('cycleType')?.value ?? 'biweekly',
        cycleStartDate: this.form.get('cycleStartDate')?.value ?? this.today(),
        levelUpPoints: this.form.get('levelUpPoints')?.value ?? 100
      });
    }
    if (changes['profileSettings'] && this.profileSettings) {
      this.form.reset({
        language: this.form.get('language')?.value ?? 'en',
        displayName: this.profileSettings.displayName ?? '',
        avatarId: this.profileSettings.avatarId ?? '01',
        cycleType: this.profileSettings.cycleType ?? 'biweekly',
        cycleStartDate: this.profileSettings.cycleStartDate ?? this.today(),
        levelUpPoints: this.profileSettings.levelUpPoints
      });
    }
    if (changes['accountSettings'] || changes['profileSettings']) {
      this.loadAvatars();
    }
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    this.saveSettings.emit({
      language: value.language,
      profile: {
        displayName: value.displayName,
        avatarId: value.avatarId ?? '01',
        cycleType: value.cycleType,
        cycleStartDate: value.cycleStartDate,
        levelUpPoints: value.levelUpPoints
      }
    });
  }

  close(): void {
    this.closeSettings.emit();
  }

  async clearCacheAndReload(): Promise<void> {
    await this.clearCache();
    window.location.reload();
  }

  async clearAllDataAndReload(): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: this.translateService.instant('settingsDialog.clearAllConfirmTitle'),
          message: this.translateService.instant('settingsDialog.clearAllConfirmMessage'),
          confirmLabel: this.translateService.instant('settingsDialog.clearAllConfirmAction'),
          cancelLabel: this.translateService.instant('confirm.cancel')
        }
      }).afterClosed()
    );
    if (!confirmed) {
      return;
    }
    this.closeSettings.emit();

    await this.clearCache();
    localStorage.clear();
    sessionStorage.clear();
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases?.();
      if (databases?.length) {
        await Promise.all(
          databases
            .map((db) => db.name)
            .filter((name): name is string => Boolean(name))
            .map((name) => {
              return new Promise<void>((resolve) => {
                const request = indexedDB.deleteDatabase(name);
                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
                request.onblocked = () => resolve();
              });
            })
        );
      }
    }
    window.location.reload();
  }

  private async clearAllDataAfterDelete(): Promise<void> {
    try {
      await this.clearCache();
      localStorage.clear();
      sessionStorage.clear();
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases?.();
        if (databases?.length) {
          await Promise.all(
            databases
              .map((db) => db.name)
              .filter((name): name is string => Boolean(name))
              .map((name) => {
                return new Promise<void>((resolve) => {
                  const request = indexedDB.deleteDatabase(name);
                  request.onsuccess = () => resolve();
                  request.onerror = () => resolve();
                  request.onblocked = () => resolve();
                });
              })
          );
        }
      }
    } finally {
      window.location.reload();
    }
  }

  private async clearCache(): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    sessionStorage.clear();
  }

  async openDeleteAccount(): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      return;
    }
    const ref = this.dialog.open(DeleteAccountDialogComponent);
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) {
      return;
    }
    const error = await this.auth.deleteAccount();
    if (error) {
      this.dialog.open(AuthErrorDialogComponent, { data: error.message });
      return;
    }
    this.closeSettings.emit();
    await this.clearAllDataAfterDelete();
  }

  onSelectProfile(profileId: string): void {
    this.selectProfile.emit(profileId);
  }

  trackProfileById(_: number, profile: Profile): string {
    return profile.id;
  }

  async onDeleteProfile(profileId: string, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    const profile = this.profiles.find((item) => item.id === profileId);
    if (!profile) {
      return;
    }
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: this.translateService.instant('confirm.deleteProfileTitle'),
          message: this.translateService.instant('confirm.deleteProfileMessage', { name: profile.displayName }),
          confirmLabel: this.translateService.instant('confirm.confirm'),
          cancelLabel: this.translateService.instant('confirm.cancel')
        }
      }).afterClosed()
    );
    if (!confirmed) {
      return;
    }
    this.deleteProfile.emit(profileId);
  }

  avatarPreviewSrc(): string {
    return this.avatarOptionSrc(this.form.get('avatarId')?.value ?? '01');
  }

  avatarOptionSrc(avatarId: string): string {
    return `assets/avatar/${avatarId}/avatar.webp`;
  }

  selectedAvatarDescription(): string | null {
    const avatarId = this.form.get('avatarId')?.value ?? '01';
    return this.avatars().find((avatar) => avatar.id === avatarId)?.description ?? null;
  }

  private today(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async loadAvatars(): Promise<void> {
    const fallback = [{ id: '01', name: 'Default' }];
    try {
      const baseHref = this.document.querySelector('base')?.getAttribute('href') ?? '/';
      const normalized = baseHref.endsWith('/') ? baseHref : `${baseHref}/`;
      const response = await fetch(`${normalized}avatars.json`);
      if (!response.ok) {
        this.avatars.set(fallback);
        return;
      }
      const data = (await response.json()) as Array<{
        id: string;
        name?: string | Record<string, string>;
        description?: string | Record<string, string>;
        'system-name'?: string;
      }>;
      if (Array.isArray(data)) {
        const language = this.getLanguageKey();
        this.avatars.set(
          data
            .filter((item) => item && typeof item.id === 'string')
            .map((item) => ({
              id: item.id,
              name: this.resolveAvatarName(item, language),
              description: this.resolveAvatarDescription(item, language)
            }))
        );
      } else {
        this.avatars.set(fallback);
      }
    } catch {
      this.avatars.set(fallback);
    }
  }

  private resolveAvatarName(
    item: { id: string; name?: string | Record<string, string>; 'system-name'?: string },
    language: string
  ): string {
    if (!item.name) {
      return item['system-name'] ?? item.id;
    }
    if (typeof item.name === 'string') {
      return item.name;
    }
    return item.name[language] ?? item.name['en'] ?? item['system-name'] ?? item.id;
  }

  private resolveAvatarDescription(
    item: { description?: string | Record<string, string> },
    language: string
  ): string | undefined {
    if (!item.description) {
      return undefined;
    }
    if (typeof item.description === 'string') {
      return item.description;
    }
    return item.description[language] ?? item.description['en'];
  }

  private getLanguageKey(): string {
    const current = this.translateService.currentLang;
    const fallback = this.translateService.getDefaultLang() ?? 'en';
    const resolved = current ?? fallback;
    if (resolved.startsWith('pt')) {
      return 'pt';
    }
    if (resolved.startsWith('fr')) {
      return 'fr';
    }
    if (resolved.startsWith('es')) {
      return 'es';
    }
    return 'en';
  }

}

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, effect, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AccountSettings } from '../../core/models/account-settings';
import { Profile } from '../../core/models/profile';
import { ResetPasswordDialogComponent } from '../../features/auth/reset-password-dialog/reset-password-dialog.component';
import { SyncStatusDialogComponent } from '../sync-status-dialog/sync-status-dialog.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { ProfileAvatarComponent } from '../profile-avatar/profile-avatar.component';
import { AccountSettingsService } from '../../core/services/account-settings.service';
import { SessionStateService } from '../../core/services/session-state.service';
import { AvatarCacheService } from '../../core/services/avatar-cache.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    TranslateModule,
    ProfileAvatarComponent,
    UserMenuComponent
  ],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent {
  @Input({ required: true }) balance = 0;
  @Input() isOnline = true;
  @Input() isSyncing = false;
  @Input() lastSyncAt: number | null = null;
  @Input() syncError: string | null = null;
  @Input() avatarSrc = '';
  @Input() profiles: Profile[] = [];
  @Input() activeProfileId: string | null = null;
  @Input() maxProfiles = 5;
  @Input() showProfiles = true;
  @Input() showSettings = true;
  @Input() showSyncStatus = true;
  @Input() showLanguageSelect = true;
  @Output() settingsClick = new EventEmitter<void>();
  @Output() profileCreate = new EventEmitter<void>();
  @Output() profileEdit = new EventEmitter<void>();
  @Output() profileSelect = new EventEmitter<string>();
  @Output() openAuthDialog = new EventEmitter<void>();

  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly accountSettingsService = inject(AccountSettingsService);
  private readonly state = inject(SessionStateService);
  private readonly avatarCache = inject(AvatarCacheService);
  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());
  readonly avatarLoadFailed = signal(false);
  private lastAvatarUrl: string | null = null;
  private readonly cachedAvatarUrl = signal<string | null>(null);
  private cachedAvatarObjectUrl: string | null = null;
  readonly language = computed(() => this.state.accountSettings().language ?? 'en');
  readonly languageOptions: Array<{ value: AccountSettings['language']; flag: string }> = [
    { value: 'en', flag: '🇺🇸' },
    { value: 'pt', flag: '🇧🇷' },
    { value: 'fr', flag: '🇫🇷' },
    { value: 'es', flag: '🇪🇸' }
  ];
  readonly userAvatarUrl = computed(() => {
    const user = this.auth.user();
    if (!user) {
      return null;
    }
    const provider = user.app_metadata?.provider;
    const metadata = user.user_metadata as Record<string, unknown> | null;
    const avatarUrl = typeof metadata?.['avatar_url'] === 'string' ? metadata['avatar_url'] : null;
    const pictureUrl = typeof metadata?.['picture'] === 'string' ? metadata['picture'] : null;
    if (provider === 'google') {
      return avatarUrl ?? pictureUrl ?? null;
    }
    return null;
  });
  readonly cachedUserAvatarUrl = computed(() => this.cachedAvatarUrl());
  readonly userDisplayName = computed(() => {
    const user = this.auth.user();
    if (!user) {
      return null;
    }
    const metadata = user.user_metadata as Record<string, unknown> | null;
    const fullName = typeof metadata?.['full_name'] === 'string' ? metadata['full_name'] : null;
    const name = typeof metadata?.['name'] === 'string' ? metadata['name'] : null;
    return fullName ?? name ?? user.email ?? null;
  });
  readonly authProvider = computed(() => this.auth.user()?.app_metadata?.provider ?? null);

  get isAdmin(): boolean {
    return this.state.accountSettings().role === 'ADMIN';
  }

  constructor() {
    effect((onCleanup) => {
      const url = this.userAvatarUrl();

      if (!url) {
        this.lastAvatarUrl = null;
        this.clearCachedAvatarUrl();
        this.avatarLoadFailed.set(false);
        return;
      }

      if (this.lastAvatarUrl !== url) {
        this.lastAvatarUrl = url;
        this.clearCachedAvatarUrl();
        this.avatarLoadFailed.set(false);
      }

      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });

      void this.avatarCache.getCachedUrl(url).then((cached) => {
        if (cancelled) {
          if (cached && cached.startsWith('blob:')) {
            URL.revokeObjectURL(cached);
          }
          return;
        }
        if (!cached) {
          this.avatarLoadFailed.set(true);
          return;
        }
        this.cachedAvatarUrl.set(cached);
        if (cached.startsWith('blob:')) {
          this.cachedAvatarObjectUrl = cached;
        }
      });
    });
  }

  private clearCachedAvatarUrl(): void {
    if (this.cachedAvatarObjectUrl && this.cachedAvatarObjectUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.cachedAvatarObjectUrl);
    }
    this.cachedAvatarObjectUrl = null;
    this.cachedAvatarUrl.set(null);
  }

  emitOpenAuthDialog(): void {
    this.openAuthDialog.emit();
  }

  openResetPassword(): void {
    this.dialog.open(ResetPasswordDialogComponent);
  }

  openSyncStatus(): void {
    this.dialog.open(SyncStatusDialogComponent, {
      data: {
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        lastSyncAt: this.lastSyncAt,
        lastError: this.syncError
      }
    });
  }

  openCreateProfile(): void {
    this.profileCreate.emit();
  }

  openEditProfile(): void {
    this.profileEdit.emit();
  }

  selectProfile(profileId: string): void {
    this.profileSelect.emit(profileId);
  }

  async changeLanguage(language: AccountSettings['language']): Promise<void> {
    const next = await this.accountSettingsService.updateLanguage(language);
    this.state.accountSettings.set(next);
  }

  async logout(): Promise<void> {
    await this.auth.signOut();
  }

  goHome(): void {
    void this.router.navigate(['/']);
  }
}

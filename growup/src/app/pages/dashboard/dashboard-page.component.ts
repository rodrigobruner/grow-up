import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSidenavModule } from '@angular/material/sidenav';
import { TranslateModule } from '@ngx-translate/core';
import { AccountSettings } from '../../core/models/account-settings';
import { Reward } from '../../core/models/reward';
import { RewardRedemption } from '../../core/models/redemption';
import { Settings } from '../../core/models/settings';
import { Task } from '../../core/models/task';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { SessionStateService } from '../../core/services/session-state.service';
import { TaskService } from '../../core/services/task.service';
import { RewardService } from '../../core/services/reward.service';
import { ProfileManagementService } from '../../core/services/profile-management.service';
import { UiDialogsService } from '../../core/services/ui-dialogs.service';
import { LevelupDialogService } from '../../core/services/levelup-dialog.service';
import { AuthDialogsService } from '../../core/services/auth-dialogs.service';
import { SettingsDrawerService } from '../../core/services/settings-drawer.service';
import { AppStatusService } from '../../core/services/app-status.service';
import { SummaryService } from '../../core/services/summary.service';
import { CalendarStateService } from '../../core/services/calendar-state.service';
import { AvatarService } from '../../core/services/avatar.service';
import { DemoModeService } from '../../core/services/demo-mode.service';
import { AccessTrackingService } from '../../core/services/access-tracking.service';
import { environment } from '../../../environments/environment';
import { SettingsDialogComponent } from '../../features/settings/settings-dialog/settings-dialog.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { DashboardHeroSectionComponent } from './sections/dashboard-hero-section/dashboard-hero-section.component';
import { DashboardPanelsSectionComponent } from './sections/dashboard-panels-section/dashboard-panels-section.component';
import { OnboardingCardComponent } from '../../components/onboarding-card/onboarding-card.component';
import { ProfileDialogComponent } from '../../features/profiles/profile-dialog/profile-dialog.component';
import { AppFooterComponent } from '../../components/app-footer/app-footer.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatSidenavModule,
    TopbarComponent,
    OnboardingCardComponent,
    DashboardHeroSectionComponent,
    DashboardPanelsSectionComponent,
    SettingsDialogComponent,
    ProfileDialogComponent,
    AppFooterComponent,
    TranslateModule
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class DashboardPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly state = inject(SessionStateService);
  private readonly taskService = inject(TaskService);
  private readonly rewardService = inject(RewardService);
  private readonly profileManagement = inject(ProfileManagementService);
  private readonly dialogs = inject(UiDialogsService);
  private readonly authDialogs = inject(AuthDialogsService);
  private readonly levelupDialogs = inject(LevelupDialogService);
  private readonly drawer = inject(SettingsDrawerService);
  private readonly demoMode = inject(DemoModeService);
  private readonly router = inject(Router);
  private readonly accessTracking = inject(AccessTrackingService);
  readonly appStatus = inject(AppStatusService);
  private readonly summary = inject(SummaryService);
  private readonly calendar = inject(CalendarStateService);
  private readonly avatar = inject(AvatarService);
  private hasTrackedDailyAccess = false;

  readonly tasks = this.state.tasks;
  readonly rewards = this.state.rewards;
  readonly completions = this.state.completions;
  readonly redemptions = this.state.redemptions;
  readonly rewardUses = this.state.rewardUses;
  readonly settings = this.state.settings;
  readonly accountSettings = this.state.accountSettings;
  readonly profiles = this.profileService.profiles;
  readonly activeProfileId = this.profileService.activeProfileId;

  readonly earned = this.summary.earned;
  readonly spent = this.summary.spent;
  readonly balance = this.summary.balance;
  readonly cycleEarned = this.summary.cycleEarned;
  readonly currentCycleRange = this.summary.cycleRange;
  readonly previousCycleEarned = this.summary.previousCycleEarned;
  readonly previousCycleLabel = this.summary.previousCycleLabel;
  readonly level = this.summary.level;
  readonly xpIntoLevel = this.summary.xpIntoLevel;
  readonly xpToNext = this.summary.xpToNext;
  readonly progressPercent = this.summary.progressPercent;
  readonly avatarSrc = this.avatar.avatarSrc;
  currentYear = new Date().getFullYear();
  buildTime = environment.buildTime;

  readonly selectedDate = this.calendar.selectedDate;
  readonly todayKey = this.calendar.todayKey;
  readonly completedCount = this.calendar.completedCount;
  readonly redeemedCount = this.calendar.redeemedCount;
  readonly todayDoneIds = this.calendar.todayDoneIds;

  readonly settingsOpen = this.drawer.settingsOpen;
  readonly profileOpen = this.drawer.profileOpen;
  readonly profileMode = this.drawer.profileMode;
  readonly isOnline = this.appStatus.isOnline;
  readonly sessionStatus = this.state.status;
  readonly showDashboard = computed(() => {
    if (this.sessionStatus() === 'ready') {
      return true;
    }
    return this.demoMode.isEnabled() && this.profiles().length > 0;
  });
  readonly showRewardsPanel = computed(() => true);
  readonly rewardsAdvancedEnabled = computed(() => {
    const flag = this.accountSettings().flags?.['rewards'];
    return this.resolveBooleanFlag(flag, false);
  });
  readonly showOnboarding = computed(() => {
    if (!this.auth.isLoggedIn()) {
      return false;
    }
    const noProfiles = this.profiles().length === 0;
    if (!noProfiles) {
      return false;
    }
    return this.sessionStatus() === 'empty' || this.sessionStatus() === 'loading';
  });
  readonly showProfileOnboarding = computed(() => {
    if (!this.auth.isLoggedIn() || this.sessionStatus() !== 'ready') {
      return false;
    }
    const profiles = this.profiles();
    if (profiles.length === 0) {
      return true;
    }
    return false;
  });
  readonly maxProfiles = computed(() => this.resolveMaxProfiles());

  constructor() {
    effect(() => {
      const allowDashboard = this.auth.isLoggedIn() || this.demoMode.isEnabled();
      if (!allowDashboard && this.sessionStatus() !== 'loading') {
        void this.router.navigate(['/']);
      }
    });
    effect(() => {
      if (this.hasTrackedDailyAccess) {
        return;
      }
      if (!this.auth.isLoggedIn()) {
        return;
      }
      if (this.sessionStatus() !== 'ready') {
        return;
      }
      const userId = this.auth.user()?.id;
      if (!userId) {
        return;
      }
      const account = this.accountSettings();
      if (!account.termsVersion || !account.termsAcceptedAt) {
        return;
      }
      this.hasTrackedDailyAccess = true;
      void this.accessTracking.trackDailyAccess(userId);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.state.refreshFromDb(this.shouldSeed());
  }

  private shouldSeed(): boolean {
    return !this.auth.isLoggedIn() && this.demoMode.isEnabled();
  }

  async addTask(): Promise<void> {
    await this.openTaskDialog();
  }

  async openTaskDialog(): Promise<void> {
    const result = await this.dialogs.openTaskDialog();
    if (!result) {
      return;
    }
    await this.taskService.addFromDialog(result);
  }

  async toggleTask(task: Task): Promise<void> {
    const date = this.selectedDate();
    const leveledUp = await this.taskService.toggle(task, date);
    if (leveledUp) {
      this.showLevelUp();
    }
  }

  async removeTask(task: Task): Promise<void> {
    const confirmed = await this.dialogs.confirmDeleteTask(task.title);
    if (!confirmed) {
      return;
    }
    await this.taskService.remove(task);
  }

  async addReward(): Promise<void> {
    await this.openRewardDialog();
  }

  async openRewardDialog(): Promise<void> {
    const maxLimitPerCycle = this.rewardsAdvancedEnabled() ? null : 1;
    const result = await this.dialogs.openRewardDialog({ maxLimitPerCycle });
    if (!result) {
      return;
    }
    await this.rewardService.addFromDialog(result);
  }

  async redeemReward(reward: Reward): Promise<void> {
    const confirmed = await this.dialogs.confirmRedeemReward(reward.title);
    if (!confirmed) {
      return;
    }
    const { start, end } = this.currentCycleRange();
    await this.rewardService.redeem(reward, this.balance(), { start, end });
  }

  async consumeReward(redemption: RewardRedemption): Promise<void> {
    const confirmed = await this.dialogs.confirmUseRedemption(redemption.rewardTitle);
    if (!confirmed) {
      return;
    }
    await this.rewardService.consume(redemption);
  }

  async returnRedemption(redemption: RewardRedemption): Promise<void> {
    await this.rewardService.returnRedemption(redemption);
  }

  async removeReward(reward: Reward): Promise<void> {
    const confirmed = await this.dialogs.confirmDeleteReward(reward.title);
    if (!confirmed) {
      return;
    }
    await this.rewardService.remove(reward);
  }

  openSettings(): void {
    this.drawer.openSettings();
  }

  openAuthDialog(): void {
    this.authDialogs.openAuth();
  }

  closeSettings(): void {
    this.drawer.closeSettings();
  }

  async saveSettings(result: {
    language: AccountSettings['language'];
    profile: Pick<Settings, 'avatarId' | 'displayName' | 'cycleType' | 'cycleStartDate' | 'levelUpPoints'>;
  }): Promise<void> {
    await this.profileManagement.saveSettings(result);
    this.settingsOpen.set(false);
  }

  openProfile(): void {
    this.drawer.openProfile();
  }

  async openCreateProfile(): Promise<void> {
    if (this.profiles().length >= this.maxProfiles()) {
      await this.dialogs.informProfileLimit(this.maxProfiles());
      return;
    }
    this.drawer.openCreateProfile();
  }

  closeProfile(): void {
    this.drawer.closeProfile();
  }

  async saveProfile(
    result: Pick<Settings, 'avatarId' | 'displayName' | 'cycleType' | 'cycleStartDate' | 'levelUpPoints'>
  ): Promise<void> {
    const mode = this.profileMode();
    const outcome = await this.profileManagement.saveProfile(mode, result);
    if (outcome === 'duplicate') {
      await this.dialogs.informProfileDuplicate();
      return;
    }
    if (outcome === 'limit') {
      await this.dialogs.informProfileLimit(this.maxProfiles());
      return;
    }
    if (outcome !== 'ok') {
      return;
    }
    await this.state.refreshFromDb(this.shouldSeed());
    this.profileOpen.set(false);
  }

  async selectProfile(profileId: string): Promise<void> {
    await this.profileManagement.selectProfile(profileId);
    this.profileOpen.set(false);
  }

  async deleteProfile(profileId: string): Promise<void> {
    await this.profileManagement.deleteProfile(profileId);
  }

  private showLevelUp(): void {
    this.levelupDialogs.openLevelUp(this.settings().avatarId ?? '01');
  }

  setSelectedDate(dateKey: string): void {
    this.calendar.setSelectedDate(dateKey);
  }

  goToToday(): void {
    this.calendar.goToToday();
  }

  cycleLabel(): string {
    return this.summary.cycleLabel();
  }

  cycleRangeLabel(): string {
    return this.summary.cycleRangeLabel();
  }

  private resolveMaxProfiles(): number {
    const flag = this.accountSettings().flags?.['profiles'];
    const enabled = this.resolveBooleanFlag(flag, true);
    return enabled ? 5 : 1;
  }

  private resolveBooleanFlag(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }
    if (typeof value === 'number') {
      if (value === 1) {
        return true;
      }
      if (value === 0) {
        return false;
      }
    }
    return fallback;
  }
}

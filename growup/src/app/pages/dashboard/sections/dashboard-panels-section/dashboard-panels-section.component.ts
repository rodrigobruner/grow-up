import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TasksPanelComponent } from '../../../../features/tasks/tasks-panel/tasks-panel.component';
import { RewardsPanelComponent } from '../../../../features/rewards/rewards-panel/rewards-panel.component';
import { Task } from '../../../../core/models/task';
import { Reward } from '../../../../core/models/reward';
import { RewardRedemption } from '../../../../core/models/redemption';
import { RewardUse } from '../../../../core/models/reward-use';
import { Completion } from '../../../../core/models/completion';

@Component({
  selector: 'app-dashboard-panels-section',
  standalone: true,
  imports: [CommonModule, TasksPanelComponent, RewardsPanelComponent],
  templateUrl: './dashboard-panels-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPanelsSectionComponent {
  @Input() showDashboard = false;
  @Input() showRewardsPanel = false;
  @Input() tasks: Task[] = [];
  @Input() completions: Completion[] = [];
  @Input() todayDoneIds = new Set<string>();
  @Input() selectedDate = '';
  @Input() todayKey = '';
  @Input() loading = false;
  @Input() rewards: Reward[] = [];
  @Input() balance = 0;
  @Input() redemptions: RewardRedemption[] = [];
  @Input() rewardUses: RewardUse[] = [];
  @Input() cycleStart = '';
  @Input() cycleEnd = '';
  @Input() rewardsAdvancedEnabled = false;

  @Output() selectedDateChange = new EventEmitter<string>();
  @Output() addTask = new EventEmitter<void>();
  @Output() toggleTask = new EventEmitter<Task>();
  @Output() removeTask = new EventEmitter<Task>();
  @Output() addReward = new EventEmitter<void>();
  @Output() redeemReward = new EventEmitter<Reward>();
  @Output() consumeReward = new EventEmitter<RewardRedemption>();
  @Output() returnRedemption = new EventEmitter<RewardRedemption>();
  @Output() removeReward = new EventEmitter<Reward>();
}

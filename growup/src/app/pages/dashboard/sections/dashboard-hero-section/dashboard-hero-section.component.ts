import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PreviousCycleReport } from '../../../../core/services/summary.service';
import { SummaryCardComponent } from '../../../../features/summary/summary-card/summary-card.component';

@Component({
  selector: 'app-dashboard-hero-section',
  standalone: true,
  imports: [CommonModule, TranslateModule, SummaryCardComponent],
  templateUrl: './dashboard-hero-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardHeroSectionComponent {
  @Input() showDashboard = false;
  @Input() loading = false;
  @Input() avatarSrc = '';
  @Input() level = 0;
  @Input() xpToNext = 0;
  @Input() progressPercent = 0;
  @Input() earned = 0;
  @Input() spent = 0;
  @Input() available = 0;
  @Input() cycleLabel = '';
  @Input() cycleEarned = 0;
  @Input() cycleRangeLabel = '';
  @Input() currentCycleStart = '';
  @Input() currentCycleEnd = '';
  @Input() previousCycleStart: string | null = null;
  @Input() previousCycleEnd: string | null = null;
  @Input() previousCyclesReport: PreviousCycleReport[] = [];
}

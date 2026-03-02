import { Component, inject, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';
import { PreviousCycleReport } from '../../../core/services/summary.service';
import { SessionStateService } from '../../../core/services/session-state.service';
import { SummaryReportDialogComponent } from '../summary-report-dialog/summary-report-dialog.component';

@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [MatCardModule, MatDividerModule, MatProgressBarModule, MatButtonModule, MatIconModule, TranslateModule],
  templateUrl: './summary-card.component.html',
  styleUrl: './summary-card.component.scss'
})
export class SummaryCardComponent {
  private readonly dialog = inject(MatDialog);
  private readonly state = inject(SessionStateService);

  @Input() loading = false;
  @Input({ required: true }) avatarSrc = '';
  @Input({ required: true }) level = 1;
  @Input({ required: true }) xpToNext = 0;
  @Input({ required: true }) progressPercent = 0;
  @Input({ required: true }) earned = 0;
  @Input({ required: true }) spent = 0;
  @Input({ required: true }) available = 0;
  @Input({ required: true }) cycleLabel = '';
  @Input({ required: true }) cycleEarned = 0;
  @Input({ required: true }) cycleRangeLabel = '';
  @Input() currentCycleStart = '';
  @Input() currentCycleEnd = '';
  @Input() previousCycleStart: string | null = null;
  @Input() previousCycleEnd: string | null = null;
  @Input() previousCyclesReport: PreviousCycleReport[] = [];

  openReportDialog(): void {
    this.dialog.open(SummaryReportDialogComponent, {
      data: {
        level: this.level,
        xpToNext: this.xpToNext,
        earned: this.earned,
        spent: this.spent,
        available: this.available,
        cycleLabel: this.cycleLabel,
        cycleEarned: this.cycleEarned,
        cycleRangeLabel: this.cycleRangeLabel,
        previousCycles: this.previousCyclesReport,
        completions: this.state.completions(),
        currentCycleStart: this.currentCycleStart,
        currentCycleEnd: this.currentCycleEnd,
        previousCycleStart: this.previousCycleStart,
        previousCycleEnd: this.previousCycleEnd
      }
    });
  }
}

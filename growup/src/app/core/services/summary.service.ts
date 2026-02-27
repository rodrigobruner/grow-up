import { computed, inject, Injectable } from '@angular/core';
import { CycleService } from './cycle.service';
import { CycleLabelService } from './cycle-label.service';
import { SessionStateService } from './session-state.service';

export type PreviousCycleReport = {
  rangeLabel: string;
  earned: number;
  spent: number;
};

@Injectable({ providedIn: 'root' })
export class SummaryService {
  private readonly state = inject(SessionStateService);
  private readonly cycle = inject(CycleService);
  private readonly labels = inject(CycleLabelService);

  readonly earned = computed(() =>
    this.state.completions().reduce((sum, completion) => sum + completion.points, 0)
  );

  readonly spent = computed(() =>
    this.state.redemptions().reduce((sum, redemption) => sum + redemption.cost, 0)
  );

  readonly balance = computed(() => this.earned() - this.spent());

  readonly cycleRange = computed(() => this.cycle.getCycleRange(this.state.settings()));

  readonly cycleEarned = computed(() => {
    const { start, end } = this.cycleRange();
    return this.state.completions()
      .filter((completion) => completion.date >= start && completion.date <= end)
      .reduce((sum, completion) => sum + completion.points, 0);
  });

  readonly previousCycleRange = computed(() => this.cycle.getPreviousCycleRange(this.state.settings()));

  readonly previousCycleEarned = computed(() => {
    const range = this.previousCycleRange();
    if (!range) {
      return null;
    }
    const { start, end } = range;
    return this.state.completions()
      .filter((completion) => completion.date >= start && completion.date <= end)
      .reduce((sum, completion) => sum + completion.points, 0);
  });

  readonly cycleLabel = computed(() => this.labels.cycleLabel(this.state.settings().cycleType));

  readonly cycleRangeLabel = computed(() => {
    const { start, end } = this.cycleRange();
    return `${this.cycle.formatDate(start)} - ${this.cycle.formatDate(end)}`;
  });

  readonly previousCyclesReport = computed<PreviousCycleReport[]>(() => {
    const settings = this.state.settings();
    const current = this.cycleRange();
    const anchor = new Date(settings.cycleStartDate);
    if (Number.isNaN(anchor.getTime())) {
      return [];
    }

    const results: PreviousCycleReport[] = [];
    const maxCycles = 6;
    const previousEnd = new Date(current.start);
    previousEnd.setDate(previousEnd.getDate() - 1);

    let cursorEnd = previousEnd;
    for (let i = 0; i < maxCycles; i += 1) {
      if (cursorEnd.getTime() < anchor.getTime()) {
        break;
      }

      const cursorStart = this.previousCycleStart(cursorEnd, settings.cycleType);
      const startKey = this.cycle.toDateKey(cursorStart);
      const endKey = this.cycle.toDateKey(cursorEnd);

      const earned = this.state.completions()
        .filter((completion) => completion.date >= startKey && completion.date <= endKey)
        .reduce((sum, completion) => sum + completion.points, 0);

      const spent = this.state.redemptions()
        .filter((redemption) => redemption.date >= startKey && redemption.date <= endKey)
        .reduce((sum, redemption) => sum + redemption.cost, 0);

      results.push({
        rangeLabel: `${this.cycle.formatDate(startKey)} - ${this.cycle.formatDate(endKey)}`,
        earned,
        spent
      });

      cursorEnd = new Date(cursorStart);
      cursorEnd.setDate(cursorEnd.getDate() - 1);
    }

    return results;
  });

  readonly previousCycleLabel = computed(() => {
    const range = this.previousCycleRange();
    if (!range) {
      return '';
    }
    return `${this.cycle.formatDate(range.start)} - ${this.cycle.formatDate(range.end)}`;
  });

  readonly level = computed(() => Math.floor(this.earned() / this.state.settings().levelUpPoints) + 1);

  readonly xpIntoLevel = computed(() => this.earned() % this.state.settings().levelUpPoints);

  readonly xpToNext = computed(() => this.state.settings().levelUpPoints - this.xpIntoLevel());

  readonly progressPercent = computed(() => (this.xpIntoLevel() / this.state.settings().levelUpPoints) * 100);

  private previousCycleStart(currentEnd: Date, cycleType: 'weekly' | 'biweekly' | 'monthly' | 'yearly'): Date {
    const start = new Date(currentEnd);
    if (cycleType === 'weekly') {
      start.setDate(start.getDate() - 6);
      return start;
    }
    if (cycleType === 'biweekly') {
      start.setDate(start.getDate() - 13);
      return start;
    }
    if (cycleType === 'monthly') {
      start.setMonth(start.getMonth() - 1);
      start.setDate(start.getDate() + 1);
      return start;
    }
    start.setFullYear(start.getFullYear() - 1);
    start.setDate(start.getDate() + 1);
    return start;
  }
}

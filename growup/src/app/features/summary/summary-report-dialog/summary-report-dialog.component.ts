import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AdminLineChartComponent, AdminLineChartSeries } from '../../../components/admin-line-chart/admin-line-chart.component';
import { Completion } from '../../../core/models/completion';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslateModule } from '@ngx-translate/core';
import { PreviousCycleReport } from '../../../core/services/summary.service';

type SummaryReportData = {
  level: number;
  xpToNext: number;
  earned: number;
  spent: number;
  available: number;
  cycleLabel: string;
  cycleEarned: number;
  cycleRangeLabel: string;
  previousCycles: PreviousCycleReport[];
  completions: Completion[];
  currentCycleStart: string;
  currentCycleEnd: string;
  previousCycleStart: string | null;
  previousCycleEnd: string | null;
};

type ReportFilter =
  | 'current_cycle'
  | 'last_cycle'
  | 'last_7_days'
  | 'last_15_days'
  | 'last_30_days'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_1_year';

@Component({
  selector: 'app-summary-report-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    AdminLineChartComponent,
    TranslateModule
  ],
  templateUrl: './summary-report-dialog.component.html',
  styleUrl: './summary-report-dialog.component.scss'
})
export class SummaryReportDialogComponent {
  readonly data = inject<SummaryReportData>(MAT_DIALOG_DATA);
  readonly selectedFilter = signal<ReportFilter>('current_cycle');
  readonly filterOptions: Array<{ key: ReportFilter; label: string }> = [
    { key: 'current_cycle', label: 'ciclo atual' },
    { key: 'last_cycle', label: 'ultimo ciclo' },
    { key: 'last_7_days', label: 'ultimos 7 dias' },
    { key: 'last_15_days', label: 'ultimos 15 dias' },
    { key: 'last_30_days', label: 'ultimos 30 dias' },
    { key: 'last_3_months', label: 'ultimos 3 meses' },
    { key: 'last_6_months', label: 'ultimos 6 meses' },
    { key: 'last_1_year', label: '1 ano' }
  ];

  readonly dailyPointsData = computed(() => {
    const range = this.resolveRange(this.selectedFilter());
    if (!range) {
      return { labels: [] as string[], values: [] as number[] };
    }

    const keys = this.buildDateKeys(range.start, range.end);
    const labels = keys.map((date) => this.toShortDate(date));
    const values = keys.map((date) =>
      this.data.completions
        .filter((completion) => completion.date === date)
        .reduce((sum, completion) => sum + completion.points, 0)
    );

    return { labels, values };
  });

  readonly chartLabels = computed(() => this.dailyPointsData().labels);
  readonly chartSeries = computed<AdminLineChartSeries[]>(() => [
    {
      id: 'xp',
      label: 'XP',
      color: '#3b4eff',
      values: this.dailyPointsData().values
    }
  ]);

  onFilterChange(filter: ReportFilter): void {
    this.selectedFilter.set(filter);
  }

  private resolveRange(filter: ReportFilter): { start: string; end: string } | null {
    const today = this.dateKey(new Date());

    if (filter === 'current_cycle') {
      return { start: this.data.currentCycleStart, end: this.data.currentCycleEnd };
    }
    if (filter === 'last_cycle') {
      if (!this.data.previousCycleStart || !this.data.previousCycleEnd) {
        return null;
      }
      return { start: this.data.previousCycleStart, end: this.data.previousCycleEnd };
    }
    if (filter === 'last_7_days') {
      return { start: this.subtractDays(today, 6), end: today };
    }
    if (filter === 'last_15_days') {
      return { start: this.subtractDays(today, 14), end: today };
    }
    if (filter === 'last_30_days') {
      return { start: this.subtractDays(today, 29), end: today };
    }
    if (filter === 'last_3_months') {
      return { start: this.subtractMonths(today, 3), end: today };
    }
    if (filter === 'last_6_months') {
      return { start: this.subtractMonths(today, 6), end: today };
    }
    return { start: this.subtractYears(today, 1), end: today };
  }

  private buildDateKeys(start: string, end: string): string[] {
    const keys: string[] = [];
    const cursor = this.parseDateKey(start);
    const endDate = this.parseDateKey(end);
    while (cursor <= endDate) {
      keys.push(this.dateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return keys;
  }

  private toShortDate(dateKey: string): string {
    const [, month, day] = dateKey.split('-');
    return `${day}/${month}`;
  }

  private dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private subtractDays(dateKey: string, amount: number): string {
    const date = this.parseDateKey(dateKey);
    date.setDate(date.getDate() - amount);
    return this.dateKey(date);
  }

  private subtractMonths(dateKey: string, amount: number): string {
    const date = this.parseDateKey(dateKey);
    date.setMonth(date.getMonth() - amount);
    date.setDate(date.getDate() + 1);
    return this.dateKey(date);
  }

  private subtractYears(dateKey: string, amount: number): string {
    const date = this.parseDateKey(dateKey);
    date.setFullYear(date.getFullYear() - amount);
    date.setDate(date.getDate() + 1);
    return this.dateKey(date);
  }

  private parseDateKey(dateKey: string): Date {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
}

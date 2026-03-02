import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import { Task } from '../../../core/models/task';
import { Completion } from '../../../core/models/completion';

@Component({
  selector: 'app-tasks-panel',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    TranslateModule
  ],
  templateUrl: './tasks-panel.component.html',
  styleUrl: './tasks-panel.component.scss'
})
export class TasksPanelComponent {
  @Input({ required: true }) tasks: Task[] = [];
  @Input() completions: Completion[] = [];
  @Input({ required: true }) todayDoneIds = new Set<string>();
  @Input({ required: true }) selectedDate = '';
  @Input({ required: true }) todayKey = '';
  @Input() loading = false;
  @Output() addTask = new EventEmitter<void>();
  @Output() toggleTask = new EventEmitter<Task>();
  @Output() removeTask = new EventEmitter<Task>();
  @Output() selectedDateChange = new EventEmitter<string>();
  private swipeStartX = 0;
  private swipeStartOffset = 0;
  private swipeActiveId: string | null = null;
  private swipeOffsets = signal<Record<string, number>>({});
  private readonly swipeMax = 72;
  private readonly swipeThreshold = 36;

  get selectedDateValue(): Date | null {
    return this.parseDateKey(this.selectedDate);
  }

  get maxDate(): Date | null {
    return this.parseDateKey(this.todayKey);
  }

  readonly dateClass = (date: Date): string => {
    const today = this.maxDate;
    if (!today) {
      return '';
    }
    if (date.getTime() > today.getTime()) {
      return '';
    }
    const key = this.toDateKey(date);
    const hasPoints = this.completions.some((completion) => completion.date === key && completion.points > 0);
    return hasPoints ? 'calendar-day--with-points' : 'calendar-day--without-points';
  };

  swipeOffset(taskId: string): number {
    return this.swipeOffsets()[taskId] ?? 0;
  }

  onTouchStart(taskId: string, event: TouchEvent): void {
    if (event.touches.length !== 1) {
      return;
    }
    this.swipeStartX = event.touches[0].clientX;
    this.swipeStartOffset = this.swipeOffsets()[taskId] ?? 0;
    this.swipeActiveId = taskId;
    const offsets = this.swipeOffsets();
    const openId = Object.keys(offsets).find((id) => offsets[id] < 0 && id !== taskId);
    if (openId) {
      this.setSwipeOffset(openId, 0);
    }
  }

  onTouchMove(taskId: string, event: TouchEvent): void {
    if (this.swipeActiveId !== taskId || event.touches.length !== 1) {
      return;
    }
    const delta = event.touches[0].clientX - this.swipeStartX;
    const next = this.swipeStartOffset + delta;
    const clamped = Math.min(0, Math.max(next, -this.swipeMax));
    this.setSwipeOffset(taskId, clamped);
  }

  onTouchEnd(taskId: string): void {
    if (this.swipeActiveId !== taskId) {
      return;
    }
    const offset = this.swipeOffsets()[taskId] ?? 0;
    const finalOffset = offset <= -this.swipeThreshold ? -this.swipeMax : 0;
    this.setSwipeOffset(taskId, finalOffset);
    this.swipeActiveId = null;
  }

  clearSwipe(taskId: string): void {
    this.setSwipeOffset(taskId, 0);
  }

  goPreviousDay(): void {
    const base = this.selectedDateValue ?? new Date();
    const next = new Date(base);
    next.setDate(base.getDate() - 1);
    this.emitDate(next);
  }

  goToday(): void {
    if (!this.todayKey) {
      return;
    }
    const today = this.parseDateKey(this.todayKey);
    if (today) {
      this.emitDate(today);
    }
  }

  onDateChange(date: Date | null): void {
    if (!date) {
      return;
    }
    this.emitDate(date);
  }

  private emitDate(date: Date): void {
    const key = this.toDateKey(date);
    if (key !== this.selectedDate) {
      this.selectedDateChange.emit(key);
    }
  }

  private setSwipeOffset(taskId: string, offset: number): void {
    this.swipeOffsets.update((current) => ({ ...current, [taskId]: offset }));
  }

  private parseDateKey(value: string): Date | null {
    if (!value) {
      return null;
    }
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(year, month - 1, day);
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

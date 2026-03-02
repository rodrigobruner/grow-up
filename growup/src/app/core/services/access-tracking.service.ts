import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { LoggerService } from './logger.service';

@Injectable({ providedIn: 'root' })
export class AccessTrackingService {
  private readonly auth = inject(AuthService);
  private readonly logger = inject(LoggerService);

  async trackDailyAccess(userId: string): Promise<void> {
    const accessDate = this.formatDateKey(new Date());
    const { error } = await this.auth
      .getClient()
      .from('daily_access_events')
      .upsert(
        {
          owner_id: userId,
          accessed_at: accessDate,
          last_accessed_at: new Date().toISOString()
        },
        { onConflict: 'owner_id,accessed_at' }
      );

    if (error && !this.isRlsForbidden(error)) {
      this.logger.warn('admin.access.track.failed', { message: error.message });
    }
  }

  private isRlsForbidden(error: { code?: string | null; message?: string | null }): boolean {
    if (error.code === '42501') {
      return true;
    }
    const message = (error.message ?? '').toLowerCase();
    return message.includes('row-level security') || message.includes('permission denied');
  }

  private formatDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}

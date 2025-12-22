import { logger } from './logger';

export type AlarmCallback = () => Promise<void>;

export class AlarmService {
  private alarms: Map<string, { timeout: NodeJS.Timeout, callback: AlarmCallback }> = new Map();

  /**
   * Schedules an alarm for a specific room (e.g., "game:uuid" or "tournament:uuid")
   * If an alarm already exists for this room, it is cancelled and replaced.
   */
  setAlarm(roomId: string, delayMs: number, callback: AlarmCallback) {
    this.cancelAlarm(roomId);

    const timeout = setTimeout(async () => {
      this.alarms.delete(roomId);
      try {
        await callback();
      } catch (e) {
        logger.error(`[AlarmService] Error executing alarm for ${roomId}:`, e);
      }
    }, delayMs);

    this.alarms.set(roomId, { timeout, callback });
  }

  cancelAlarm(roomId: string) {
    if (this.alarms.has(roomId)) {
      clearTimeout(this.alarms.get(roomId)!.timeout);
      this.alarms.delete(roomId);
    }
  }

  /**
   * Manually executes an alarm and removes it. Useful for testing.
   */
  async executeAlarm(roomId: string) {
    const alarm = this.alarms.get(roomId);
    if (alarm) {
      clearTimeout(alarm.timeout);
      this.alarms.delete(roomId);
      await alarm.callback();
    }
  }

  hasAlarm(roomId: string): boolean {
    return this.alarms.has(roomId);
  }
}

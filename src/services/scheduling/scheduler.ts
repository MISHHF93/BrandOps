export interface ScheduleWindow {
  startAt: string;
  endAt: string;
}

export const scheduler = {
  nextExecution(windows: ScheduleWindow[], now = new Date()): ScheduleWindow | undefined {
    return windows
      .map((window) => ({ ...window, timestamp: new Date(window.startAt).getTime() }))
      .filter((window) => window.timestamp >= now.getTime())
      .sort((a, b) => a.timestamp - b.timestamp)[0];
  }
};

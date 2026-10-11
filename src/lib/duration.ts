export type WorkLog = { started_at: string; ended_at: string | null };

// Total minutes of work; an open session counts up to `now`.
export function workMinutes(logs: WorkLog[], now: Date): number {
  const ms = logs.reduce((sum, log) => {
    const end = log.ended_at ? new Date(log.ended_at) : now;
    return (
      sum + Math.max(0, end.getTime() - new Date(log.started_at).getTime())
    );
  }, 0);
  return Math.round(ms / 60000);
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

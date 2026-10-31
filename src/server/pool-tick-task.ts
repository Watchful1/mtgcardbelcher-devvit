// Scheduled with no cron, to continue seeding straight after a run that ran
// out of time. Kept apart from pool-tick.ts so tests can import it without Devvit.
export const CONTINUE_TASK = 'pool-tick-continue';

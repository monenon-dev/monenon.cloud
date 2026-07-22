/** Client-side cap — older rows load via pagination. */
export const AGENT_HISTORY_CLIENT_MAX = 100;

export const AGENT_HISTORY_TIMELINE_LIMIT = 10;

/** Polling when no running events (ms). */
export const AGENT_HISTORY_POLL_IDLE_MS = 8_000;

/** Polling when at least one event is running (ms). */
export const AGENT_HISTORY_POLL_ACTIVE_MS = 2_500;

/** New / status-change highlight duration (ms). */
export const AGENT_HISTORY_HIGHLIGHT_MS = 2_500;

export const AGENT_HISTORY_PAGE_SIZE = 20;

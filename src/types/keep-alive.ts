/** Single heartbeat row bumped by the /api/ping cron endpoint. */
export interface KeepAlive {
  key: string;
  lastPingedAt: string;
}

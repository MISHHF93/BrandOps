export type RuntimeMessage =
  | { type: 'GET_DATA' }
  | { type: 'RESET_DATA' }
  | { type: 'OPEN_DASHBOARD' }
  | { type: 'PING' };

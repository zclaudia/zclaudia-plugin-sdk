export interface PermissionRequest {
  requestId: string;
  toolName: string;
  toolInput: unknown;
  detail: string;
  timeoutSeconds: number;
  /** Behavior when the request expires. The host defaults to deny. */
  timeoutBehavior?: 'approve' | 'deny';
}

export interface PermissionDecision {
  behavior: 'allow' | 'deny';
  updatedInput?: unknown;
  message?: string;
}

export type PermissionCallback = (request: PermissionRequest) => Promise<PermissionDecision>;

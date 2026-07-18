// Keygen API Types

export interface KeygenResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, KeygenRelationship>;
  links?: Record<string, string>;
}

export interface KeygenRelationship {
  data?: KeygenResourceIdentifier | KeygenResourceIdentifier[];
  links?: Record<string, string>;
}

export interface KeygenResourceIdentifier {
  id: string;
  type: string;
}

export interface KeygenResponse<T = unknown> {
  data?: T;
  included?: KeygenResource[];
  meta?: Record<string, unknown>;
  links?: Record<string, string>;
  errors?: KeygenError[];
}

export interface KeygenError {
  id?: string;
  status?: string;
  code?: string;
  title: string;
  detail: string;
  source?: {
    pointer?: string;
    parameter?: string;
  };
  links?: Record<string, string>;
}

// API Error type for catch blocks
export interface ApiError {
  status?: number;
  message?: string;
  code?: string;
}

// Authentication
export interface AuthTokenResponse {
  data: {
    id: string;
    type: 'tokens';
    attributes: {
      kind: string;
      token: string;
      expiry: string | null;
      name?: string;
      created: string;
      updated: string;
    };
    relationships: {
      account: KeygenRelationship;
      bearer: KeygenRelationship;
    };
  };
}

// User
export interface User extends KeygenResource {
  type: 'users';
  attributes: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email: string;
    role: 'admin' | 'developer' | 'sales-agent' | 'support-agent' | 'read-only' | 'user';
    // Same bare-`attribute :status` pattern as License below —
    // user_serializer.rb has no downcasing block, and User#status returns
    // uppercase symbols (:ACTIVE/:INACTIVE/:BANNED).
    status: 'ACTIVE' | 'INACTIVE' | 'BANNED';
    banned?: boolean; // Legacy property for backward compatibility
    lastSignedInAt?: string;
    created: string;
    updated: string;
  };
}

// License
export interface License extends KeygenResource {
  type: 'licenses';
  attributes: {
    name?: string;
    key: string;
    // Server serializes License#status directly from a Ruby symbol
    // (:ACTIVE, :BANNED, etc.) — verified against license.rb's `def status`
    // and license_serializer.rb's bare `attribute :status` (no downcasing
    // block), so the wire value is uppercase, not lowercase.
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'EXPIRING' | 'SUSPENDED' | 'BANNED';
    uses: number;
    maxUses?: number;
    protected: boolean;
    floating: boolean;
    strict: boolean;
    scheme: string;
    encrypted: boolean;
    expiry?: string;
    metadata?: Record<string, unknown>;
    created: string;
    updated: string;
  };
}

// Machine
export interface Machine extends KeygenResource {
  type: 'machines';
  attributes: {
    name?: string;
    fingerprint: string;
    platform?: string;
    hostname?: string;
    cores?: number;
    ip?: string;
    requireHeartbeat: boolean;
    heartbeatStatus: 'alive' | 'dead' | 'not-started';
    heartbeatDuration?: number;
    lastHeartbeat?: string;
    created: string;
    updated: string;
  };
}

// Product
export interface Product extends KeygenResource {
  type: 'products';
  attributes: {
    name: string;
    code?: string;
    url?: string;
    distributionStrategy: 'LICENSED' | 'OPEN' | 'CLOSED';
    platforms?: string[];
    permissions?: string[];
    metadata?: Record<string, unknown>;
    created: string;
    updated: string;
  };
}

// Policy
// Canonical enum values per https://keygen.sh/docs/api/policies/ — shared
// between the Policy attribute type and PolicyResource's create/update params
// so the two can't drift apart again (they previously disagreed with each
// other AND with the API on six different fields).
export type PolicyHeartbeatCullStrategy = 'DEACTIVATE_DEAD' | 'KEEP_DEAD';
export type PolicyHeartbeatResurrectionStrategy =
  | 'NO_REVIVE'
  | '1_MINUTE_REVIVE'
  | '2_MINUTE_REVIVE'
  | '5_MINUTE_REVIVE'
  | '10_MINUTE_REVIVE'
  | '15_MINUTE_REVIVE'
  | 'ALWAYS_REVIVE';
export type PolicyHeartbeatBasis = 'FROM_CREATION' | 'FROM_FIRST_PING';
export type PolicyMachineUniquenessStrategy =
  | 'UNIQUE_PER_ACCOUNT'
  | 'UNIQUE_PER_PRODUCT'
  | 'UNIQUE_PER_POLICY'
  | 'UNIQUE_PER_LICENSE';
export type PolicyMachineMatchingStrategy = 'MATCH_ANY' | 'MATCH_TWO' | 'MATCH_MOST' | 'MATCH_ALL';
export type PolicyExpirationStrategy = 'RESTRICT_ACCESS' | 'REVOKE_ACCESS' | 'MAINTAIN_ACCESS' | 'ALLOW_ACCESS';
export type PolicyExpirationBasis =
  | 'FROM_CREATION'
  | 'FROM_FIRST_VALIDATION'
  | 'FROM_FIRST_ACTIVATION'
  | 'FROM_FIRST_DOWNLOAD'
  | 'FROM_FIRST_USE';
export type PolicyRenewalBasis = 'FROM_EXPIRY' | 'FROM_NOW' | 'FROM_NOW_IF_EXPIRED';
export type PolicyTransferStrategy = 'RESET_EXPIRY' | 'KEEP_EXPIRY';
export type PolicyAuthenticationStrategy = 'TOKEN' | 'LICENSE' | 'MIXED' | 'NONE';
export type PolicyMachineLeasingStrategy = 'PER_LICENSE' | 'PER_USER';
export type PolicyProcessLeasingStrategy = 'PER_MACHINE' | 'PER_LICENSE' | 'PER_USER';
export type PolicyOverageStrategy =
  | 'NO_OVERAGE'
  | 'ALWAYS_ALLOW_OVERAGE'
  | 'ALLOW_1_25X_OVERAGE'
  | 'ALLOW_1_5X_OVERAGE'
  | 'ALLOW_2X_OVERAGE';
export type PolicyCheckInInterval = 'day' | 'week' | 'month' | 'year';

export interface Policy extends KeygenResource {
  type: 'policies';
  attributes: {
    name: string;
    duration?: number;
    strict: boolean;
    floating: boolean;
    requireProductScope: boolean;
    requirePolicyScope: boolean;
    requireMachineScope: boolean;
    requireFingerprintScope: boolean;
    requireComponentsScope: boolean;
    requireUserScope: boolean;
    requireChecksumScope: boolean;
    requireVersionScope: boolean;
    requireCheckIn: boolean;
    checkInInterval: PolicyCheckInInterval;
    checkInIntervalCount: number;
    usePool: boolean;
    maxMachines?: number;
    maxProcesses?: number;
    maxCores?: number;
    maxUses?: number;
    protected: boolean;
    requireHeartbeat: boolean;
    heartbeatDuration: number;
    heartbeatCullStrategy: PolicyHeartbeatCullStrategy;
    heartbeatResurrectionStrategy: PolicyHeartbeatResurrectionStrategy;
    heartbeatBasis: PolicyHeartbeatBasis;
    machineUniquenessStrategy: PolicyMachineUniquenessStrategy;
    machineMatchingStrategy: PolicyMachineMatchingStrategy;
    expirationStrategy: PolicyExpirationStrategy;
    expirationBasis: PolicyExpirationBasis;
    renewalBasis: PolicyRenewalBasis;
    transferStrategy: PolicyTransferStrategy;
    authenticationStrategy: PolicyAuthenticationStrategy;
    machineLeasingStrategy: PolicyMachineLeasingStrategy;
    processLeasingStrategy: PolicyProcessLeasingStrategy;
    overageStrategy: PolicyOverageStrategy;
    metadata: Record<string, unknown>;
    created: string;
    updated: string;
  };
}

// Group
export interface Group extends KeygenResource {
  type: 'groups';
  attributes: {
    name: string;
    maxLicenses?: number;
    maxMachines?: number;
    maxUsers?: number;
    created: string;
    updated: string;
  };
}

// Entitlement
export interface Entitlement extends KeygenResource {
  type: 'entitlements';
  attributes: {
    name: string;
    code: string;
    created: string;
    updated: string;
  };
}

// Result of validating a licence: `valid` plus a machine-readable code
// (EXPIRED, SUSPENDED, NO_MACHINE, TOO_MANY_MACHINES, …) and a readable detail.
export interface LicenseValidation extends KeygenResponse<License> {
  meta?: {
    ts?: string;
    valid: boolean;
    detail: string;
    code: string;
    scope?: Record<string, unknown>;
  };
}

// A signed licence file: the client verifies `certificate` offline.
export interface LicenseFile extends KeygenResource {
  type: 'license-files';
  attributes: {
    certificate: string;
    algorithm: string;
    /** Seconds the file stays valid without contacting the server. */
    ttl: number | null;
    issued: string;
    expiry: string | null;
  };
}

// A signed machine file — same idea as LicenseFile, scoped to one machine.
export interface MachineFile extends KeygenResource {
  type: 'machine-files';
  attributes: {
    certificate: string;
    algorithm: string;
    /** Relationships embedded in the certificate, e.g. ['license.entitlements']. */
    includes?: string[];
    /** Seconds the file stays valid without contacting the server. */
    ttl: number | null;
    issued: string;
    expiry: string | null;
  };
}

// A single webhook delivery attempt.
export interface WebhookEventRecord extends KeygenResource {
  type: 'webhook-events';
  attributes: {
    endpoint: string;
    event: string;
    payload?: string;
    status: 'DELIVERING' | 'DELIVERED' | 'FAILING' | 'FAILED';
    lastResponseCode?: number | null;
    lastResponseBody?: string | null;
    created: string;
    updated: string;
  };
}

// Release metadata — Keygen derives these from uploaded artifacts.
export interface ReleasePlatform extends KeygenResource {
  type: 'platforms';
  attributes: { key: string; created: string; updated: string };
}

export interface ReleaseArch extends KeygenResource {
  type: 'arches';
  attributes: { key: string; created: string; updated: string };
}

export interface ReleaseChannelRecord extends KeygenResource {
  type: 'channels';
  attributes: { key: string; name?: string; created: string; updated: string };
}

export interface ReleaseEngine extends KeygenResource {
  type: 'engines';
  attributes: { key: string; name?: string; created: string; updated: string };
}

// A pooled licence key (policies with usePool draw from these).
export interface PooledKey extends KeygenResource {
  type: 'keys';
  attributes: { key: string; created: string; updated: string };
}

// A user's TOTP second factor. secret/uri are only present while the
// factor is unconfirmed (enabled: false) — Keygen stops returning them
// once it's enabled, to avoid leaking a live secret.
export interface SecondFactor extends KeygenResource {
  type: 'second-factors';
  attributes: {
    uri?: string;
    secret?: string;
    enabled: boolean;
    created: string;
    updated: string;
  };
}

// Token
export interface Token extends KeygenResource {
  type: 'tokens';
  attributes: {
    kind: string;
    /** Only returned when the token is first created — it cannot be read back. */
    token?: string;
    name?: string;
    expiry?: string | null;
    permissions?: string[];
    created: string;
    updated: string;
  };
}

// Release
export type ReleaseChannel = 'stable' | 'rc' | 'beta' | 'alpha' | 'dev';
export type ReleaseStatus = 'DRAFT' | 'PUBLISHED' | 'YANKED';

export interface Release extends KeygenResource {
  type: 'releases';
  attributes: {
    name?: string;
    description?: string;
    version: string;
    channel: ReleaseChannel;
    status: ReleaseStatus;
    tag?: string;
    metadata?: Record<string, unknown>;
    created: string;
    updated: string;
    yanked?: string;
  };
}

// Release entitlement constraint — gates a release behind an entitlement.
// No attributes beyond timestamps; the entitlement/release linkage lives in
// `relationships` (inherited from KeygenResource).
export interface Constraint extends KeygenResource {
  type: 'constraints';
  attributes: {
    created: string;
    updated: string;
  };
}

// Release Artifact
export type ArtifactStatus = 'WAITING' | 'PROCESSING' | 'UPLOADED' | 'FAILED' | 'YANKED';

export interface ReleaseArtifact extends KeygenResource {
  type: 'artifacts';
  attributes: {
    filename: string;
    filetype?: string | null;
    filesize?: number | null;
    platform?: string | null;
    arch?: string | null;
    signature?: string | null;
    checksum?: string | null;
    status: ArtifactStatus;
    metadata?: Record<string, unknown>;
    created: string;
    updated: string;
  };
}

// Process — verified against MachineProcessSerializer in keygen-api. There is
// no `name`/`platform` attribute server-side (processes are identified by
// PID only); the heartbeat status mirrors Machine's ALIVE/DEAD pattern.
export interface Process extends KeygenResource {
  type: 'processes';
  attributes: {
    pid: number;
    status: 'ALIVE' | 'DEAD' | 'RESURRECTED';
    interval: number;
    lastHeartbeat?: string;
    nextHeartbeat?: string;
    metadata?: Record<string, unknown>;
    created: string;
    updated: string;
  };
}

// Component
export interface Component extends KeygenResource {
  type: 'components';
  attributes: {
    name: string;
    fingerprint: string;
    created: string;
    updated: string;
  };
}

// Event Log
export interface EventLog extends KeygenResource {
  type: 'event-logs';
  attributes: {
    event: string;
    metadata?: Record<string, unknown>;
    created: string;
    updated: string;
  };
}

// Request Log
export interface RequestLog extends KeygenResource {
  type: 'request-logs';
  attributes: {
    method: string;
    url: string;
    ip?: string;
    status: number;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    requestBody?: unknown;
    responseBody?: unknown;
    created: string;
  };
}

// Webhook
export interface Webhook extends KeygenResource {
  type: 'webhook-endpoints';
  attributes: {
    url: string;
    subscriptions: string[];
    signingKey?: string;
    enabled: boolean;
    created: string;
    updated: string;
  };
}

// API Request options
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, unknown>;
}

// Pagination
export interface PaginationOptions {
  page?: {
    size?: number;
    number?: number;
  };
  limit?: number;
}

// List response interface
export interface KeygenListResponse<T = unknown> extends KeygenResponse<T[]> {
  meta?: {
    count?: number;
    pages?: {
      first?: string;
      last?: string;
      next?: string;
      prev?: string;
    };
  };
}

// Filter options for different resources
export interface LicenseFilters extends PaginationOptions {
  user?: string;
  policy?: string;
  group?: string;
  product?: string;
  status?: License['attributes']['status'];
  key?: string;
  encrypted?: boolean;
  suspended?: boolean;
  metadata?: Record<string, string>;
}

export interface MachineFilters extends PaginationOptions {
  license?: string;
  user?: string;
  group?: string;
  product?: string;
  policy?: string;
  fingerprint?: string;
  ip?: string;
  /**
   * Server-side heartbeat scope — only 'ALIVE' | 'DEAD' are real (verified
   * against Machine#with_status in keygen-api). There is no server-side
   * "not started" scope; that's a client-computed nuance of the serialized
   * heartbeatStatus attribute, not something the list endpoint can filter on.
   */
  status?: 'ALIVE' | 'DEAD';
}

export interface UserFilters extends PaginationOptions {
  email?: string;
  /**
   * Which roles to include. Keygen's `roles` scope (note: plural — a
   * differently-named `role` param is silently ignored) defaults to
   * `[user]` when omitted, so UserResource.list() always sends every role
   * unless the caller narrows it — otherwise admins/developers/etc. never
   * appear in a "list all users" call.
   */
  roles?: User['attributes']['role'][];
  /** Server-side scope only recognizes these three, case-insensitively. */
  status?: 'ACTIVE' | 'INACTIVE' | 'BANNED';
}

export const ALL_USER_ROLES: User['attributes']['role'][] = [
  'admin', 'developer', 'sales-agent', 'support-agent', 'read-only', 'user',
];

export interface EventLogFilters extends PaginationOptions {
  event?: string;
  date?: {
    start?: string;
    end?: string;
  };
}

export interface RequestLogFilters extends PaginationOptions {
  date?: {
    start?: string;
    end?: string;
  };
  requestor?: {
    type?: 'user' | 'environment' | 'product' | 'license';
    id?: string;
  };
  url?: string;
  ip?: string;
  method?: string;
  status?: string;
}

export interface WebhookFilters extends PaginationOptions {
  enabled?: boolean;
  url?: string;
  subscriptions?: string[];
}

export interface ReleaseFilters extends PaginationOptions {
  product?: string;
  channel?: ReleaseChannel;
  status?: ReleaseStatus;
}

export interface ArtifactFilters extends PaginationOptions {
  release?: string;
  product?: string;
  platform?: string;
  arch?: string;
  filetype?: string;
  status?: ArtifactStatus;
}
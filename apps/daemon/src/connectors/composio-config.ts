import fs from 'node:fs';
import path from 'node:path';

export interface ComposioConfig {
  apiKey: string;
  authConfigIds: Record<string, string>;
}

export interface PublicComposioConfig {
  configured: boolean;
  apiKeyTail: string;
}

// Credential store lives under the resolved daemon data root; unset until
// `configureComposioConfigStore(dataDir)` runs (see AGENTS.md data-dir contract).
let configFilePath: string | undefined;

export function configureComposioConfigStore(dataDir: string): void {
  configFilePath = path.join(dataDir, 'connectors', 'composio-config.json');
}

function requireConfigFilePath(): string {
  if (!configFilePath) {
    throw new Error(
      'composio config store not configured: call configureComposioConfigStore(dataDir) with the resolved daemon data root',
    );
  }
  return configFilePath;
}

export function readComposioConfig(): ComposioConfig {
  const raw = readRawConfig();
  return normalizeComposioConfig(raw);
}

export function readPublicComposioConfig(): PublicComposioConfig {
  const config = readComposioConfig();
  return {
    configured: Boolean(config.apiKey),
    apiKeyTail: config.apiKey ? config.apiKey.slice(-4) : '',
  };
}

export function writeComposioConfig(input: unknown): PublicComposioConfig {
  const prior = readComposioConfig();
  const record = input && typeof input === 'object' && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const hasApiKey = Object.prototype.hasOwnProperty.call(record, 'apiKey');
  const hasAuthConfigIds = Object.prototype.hasOwnProperty.call(record, 'authConfigIds');
  const apiKeyInput = normalizeOptionalString(record.apiKey) ?? '';
  const nextApiKey = hasApiKey ? apiKeyInput : prior.apiKey;
  const apiKeyChanged = prior.apiKey !== nextApiKey;
  const next = normalizeComposioConfig({
    apiKey: nextApiKey,
    authConfigIds: apiKeyChanged ? {} : hasAuthConfigIds ? record.authConfigIds : prior.authConfigIds,
  });
  writeRawConfig(next);
  return readPublicComposioConfig();
}

export function setComposioAuthConfigId(connectorId: string, authConfigId: string): void {
  const normalizedConnectorId = normalizeOptionalString(connectorId);
  const normalizedAuthConfigId = normalizeOptionalString(authConfigId);
  if (!normalizedConnectorId || !normalizedAuthConfigId) return;
  const prior = readComposioConfig();
  writeRawConfig(normalizeComposioConfig({
    apiKey: prior.apiKey,
    authConfigIds: {
      ...prior.authConfigIds,
      [normalizedConnectorId]: normalizedAuthConfigId,
    },
  }));
}

export function deleteComposioAuthConfigId(connectorId: string): void {
  const normalizedConnectorId = normalizeOptionalString(connectorId);
  if (!normalizedConnectorId) return;
  const prior = readComposioConfig();
  if (prior.authConfigIds[normalizedConnectorId] === undefined) return;
  const authConfigIds = { ...prior.authConfigIds };
  delete authConfigIds[normalizedConnectorId];
  writeRawConfig(normalizeComposioConfig({ apiKey: prior.apiKey, authConfigIds }));
}

function readRawConfig(): unknown {
  try {
    return JSON.parse(fs.readFileSync(requireConfigFilePath(), 'utf8')) as unknown;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return {};
    throw error;
  }
}

function writeRawConfig(config: ComposioConfig): void {
  const filePath = requireConfigFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(config, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tempPath, filePath);
  fs.chmodSync(filePath, 0o600);
}

function normalizeComposioConfig(value: unknown): ComposioConfig {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    apiKey: normalizeOptionalString(raw.apiKey) ?? '',
    authConfigIds: normalizeAuthConfigIds(raw.authConfigIds),
  };
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeAuthConfigIds(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const next: Record<string, string> = {};
  for (const [connectorId, authConfigId] of Object.entries(value as Record<string, unknown>)) {
    const normalizedConnectorId = normalizeOptionalString(connectorId);
    const normalizedAuthConfigId = normalizeOptionalString(authConfigId);
    if (normalizedConnectorId && normalizedAuthConfigId) next[normalizedConnectorId] = normalizedAuthConfigId;
  }
  return next;
}

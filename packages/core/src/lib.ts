export { detectHardware } from './hardware/detect.js';
export type { HardwareInfo, Platform } from './hardware/detect.js';

export { MlxHttpBackend } from './llm/mlx-http-backend.js';
export type { MlxHttpBackendOptions } from './llm/mlx-http-backend.js';
export type { LlmBackend, ChatOptions, ChatResult } from './llm/backend.js';

export { buildBridgeServer, runBridgeServerStdio } from './mcp/server.js';
export type { BridgeServerOptions } from './mcp/server.js';

export {
  DEFAULT_CONFIG,
  withOverrides,
  tierForTool,
  modelForTool,
} from './config/tiers.js';
export type { Tier, TierConfig, BridgeConfig, ResolveOptions } from './config/tiers.js';

#!/usr/bin/env node
import { Command } from 'commander';
import { detectHardware } from '../src/hardware/detect.js';
import { runBridgeServerStdio } from '../src/mcp/server.js';
import { DEFAULT_CONFIG, withOverrides } from '../src/config/tiers.js';

const program = new Command();

program
  .name('local-mcp')
  .description(
    'local-mcp-toolbelt — MCP server delegating to a local oMLX inference daemon. ' +
      'Inspect hardware, manage tiers, and serve over stdio.',
  )
  .version('0.6.0');

program
  .command('hardware')
  .description('Print detected hardware info as JSON.')
  .action(() => {
    const info = detectHardware();
    process.stdout.write(`${JSON.stringify(info, null, 2)}\n`);
  });

program
  .command('serve')
  .description('Run the MCP bridge server over stdio (for MCP clients).')
  .option(
    '--mlx-url <url>',
    'oMLX endpoint shared by all tiers (default: http://127.0.0.1:8000)',
    process.env.OMCP_MLX_URL,
  )
  .option(
    '--tier-b-model <name>',
    'oMLX model name for Tier B (default: Qwen3-4B-Instruct-2507-4bit)',
    process.env.OMCP_TIER_B_MODEL,
  )
  .option(
    '--tier-c-model <name>',
    'oMLX model name for Tier C (default: Qwen3-8B-4bit at 32 K ctx)',
    process.env.OMCP_TIER_C_MODEL,
  )
  .option(
    '--tier-d-model <name>',
    'oMLX model name for Tier D (default: Qwen3-14B-4bit)',
    process.env.OMCP_TIER_D_MODEL,
  )
  .action(
    async (opts: {
      mlxUrl?: string;
      tierBModel?: string;
      tierCModel?: string;
      tierDModel?: string;
    }) => {
      const overrides: NonNullable<Parameters<typeof withOverrides>[1]>['tierOverrides'] = {};
      const apply = (
        tier: 'B' | 'C' | 'D',
        modelName: string | undefined,
      ): void => {
        const o: Record<string, unknown> = {};
        if (opts.mlxUrl) o['mlxUrl'] = opts.mlxUrl;
        if (modelName) o['mlxModelName'] = modelName;
        if (Object.keys(o).length > 0) {
          overrides[tier] = o as Partial<typeof DEFAULT_CONFIG.tiers.B>;
        }
      };
      apply('B', opts.tierBModel);
      apply('C', opts.tierCModel);
      apply('D', opts.tierDModel);

      const config = withOverrides(DEFAULT_CONFIG, { tierOverrides: overrides });
      try {
        await runBridgeServerStdio({ config });
      } catch (err) {
        process.stderr.write(`serve: ${(err as Error).message}\n`);
        process.exit(1);
      }
    },
  );

program
  .command('config')
  .description('Print the effective bridge config (tiers + tool routing).')
  .action(() => {
    process.stdout.write(`${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`);
  });

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`${(err as Error).message}\n`);
  process.exit(1);
});

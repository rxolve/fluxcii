#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadPalettes } from './palette.js';
import { registerSceneTools } from './tools/scene-tools.js';
import { registerShapeTools } from './tools/shape-tools.js';
import { registerInspectTools } from './tools/inspect-tools.js';
import { registerAnimationTools } from './tools/animation-tools.js';
import { registerExportTools } from './tools/export-tools.js';
import { registerManageTools } from './tools/manage-tools.js';
import { registerLayerTools } from './tools/layer-tools.js';
import { registerAssetTools } from './tools/asset-tools.js';
import { registerComposeTools } from './tools/compose-tools.js';
import { registerProvider } from './ai/provider.js';
import { GeminiProvider } from './ai/gemini.js';

const server = new McpServer({
  name: 'fluxcii',
  version: '0.1.0',
});

registerSceneTools(server);
registerShapeTools(server);
registerInspectTools(server);
registerAnimationTools(server);
registerExportTools(server);
registerManageTools(server);
registerLayerTools(server);
registerAssetTools(server);
registerComposeTools(server);

async function main() {
  await loadPalettes();

  // Register AI providers
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    registerProvider(new GeminiProvider(geminiKey));
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();

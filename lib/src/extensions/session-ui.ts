import { humanReadable, taskSummary } from '@pi-ko/core/runtime/utils';
import type { Runtime } from '@pi-ko/core/runtime/runtime';
import { modes } from '@pi-ko/core/runtime/config';
import { capabilityReport } from '@pi-ko/core/runtime/capabilities';
import { discoverResources } from './resources.ts';
import { rewindFile } from '@pi-ko/core/extensions/checkpoints';
export function registerSessionUI(runtime: Runtime): void {
  runtime.pi.registerCommand('compat', { description: 'Compatibility diagnostics: prompts, permissions, memory, tasks, resources, capabilities, rewind', handler: async (args, ctx) => {
    const [command = 'diagnostics', value] = args.trim().split(/\s+/);
    await runtime.scheduler.run(true, async () => {
      if (command === 'prompts') runtime.message(humanReadable(runtime.prompts.inspect()));
      else if (command === 'capabilities') runtime.message(humanReadable({ ...capabilityReport(), strictTools: !runtime.modular, enabledExtensions: [...runtime.modularFeatures], bundledSkills: runtime.modularFeatures.has('resources'), nativeToolsPreserved: runtime.modular }));
      else if (command === 'memory') runtime.message(runtime.memory.format() || 'No CLAUDE.md instructions loaded.');
      else if (command === 'tasks') runtime.message(taskSummary(Object.values(runtime.state.tasks)));
      else if (command === 'resources') runtime.message(humanReadable(await discoverResources(ctx.cwd)));
      else if (command === 'permissions') {
        if (value) {
          if (!modes.includes(value as any)) throw new Error(`Supported modes: ${modes.join(', ')}`);
          if (value === 'plan') throw new Error('Use /compat plan to establish a designated plan artifact');
          if (runtime.state.mode === 'plan') throw new Error('Use ExitPlanMode to obtain plan approval');
          runtime.state.mode = value as any; runtime.persist(); runtime.status(ctx);
        }
        runtime.message(humanReadable({ mode: runtime.state.mode, rules: runtime.config.permissions, provenance: runtime.config.provenance }));
      } else if (command === 'plan') {
        // A user command requests the same governed tool path on the next turn.
        runtime.pi.sendUserMessage('Enter plan mode by calling EnterPlanMode.');
      } else if (command === 'rewind') {
        if (runtime.state.mode === 'plan') throw new Error('File rewind is blocked during planning');
        const point = runtime.state.checkpoints.at(-1);
        if (!point) { runtime.message('No tracked file edits to rewind.'); return; }
        if (await runtime.approvals.request(ctx,'Rewind last tracked file edit?',point.path,ctx.signal)) runtime.message(await rewindFile(runtime));
      } else if (command === 'context') runtime.message(humanReadable({ usage: ctx.getContextUsage(), state: runtime.state }));
      else if (command === 'reload') { await runtime.reload(ctx); await runtime.memory.load(ctx.cwd); runtime.message('Reloaded configuration and memory.'); }
      else runtime.message(humanReadable({ ...capabilityReport(), strictTools: !runtime.modular, enabledExtensions: [...runtime.modularFeatures], nativeToolsPreserved: runtime.modular, ready: runtime.ready, diagnostics: [...(runtime.config?.diagnostics ?? []), ...runtime.memory.diagnostics], tools: runtime.pi.getActiveTools() }));
    },ctx.signal);
  }});
  // Native /compact, /cost, /rewind, /context are not overridden. /compat avoids host collisions.
  runtime.pi.on('agent_settled', (_event, ctx) => runtime.status(ctx));
}

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { acquire } from '@kabaevroman/pi-code-core';
import { registerSessionUI } from '../extensions/session-ui.ts';
export default function(pi: ExtensionAPI): void { const state = acquire(pi,'session-ui'); if (state) { const r = state.runtime; registerSessionUI(r); } }

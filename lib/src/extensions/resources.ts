import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
// Discovery only. Executable preprocessing/frontmatter are not silently converted into prompts.
export async function discoverResources(cwd: string): Promise<{ kind: string; path: string; status: string }[]> {
  const found: { kind: string; path: string; status: string }[] = [];
  for (const kind of ['commands','skills','agents']) {
    let entries; try { entries = await readdir(join(cwd, '.claude',kind), { withFileTypes: true }); } catch (e: any) { if (e.code === 'ENOENT') continue; throw e; }
    for (const entry of entries) found.push({ kind, path: join(cwd,'.claude',kind,entry.name), status: 'discovered; execution unsupported in this profile' });
  }
  return found;
}

export async function countDir(handle) {
  let counted = 0;
  async function walk(h) {
    try {
      // iterate over values in the directory handle
      for await (const entry of h.values()) {
        if (entry.kind === 'file') {
          counted++;
        } else if (entry.kind === 'directory') {
          await walk(entry);
        }
      }
    } catch (err) {
      console.warn(`[FileCounter] Could not scan subdirectory in ${h.name}:`, err);
    }
  }
  await walk(handle);
  return counted;
}

export async function countAllDirs(handles) {
  let totalCount = 0;
  for (const handle of handles) {
    totalCount += await countDir(handle);
  }
  return totalCount;
}

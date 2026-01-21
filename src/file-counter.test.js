import { describe, it, expect, vi } from 'vitest';
import { countDir, countAllDirs } from './file-counter.js';

// Mock FileSystemHandle API structures
function createMockFile(name) {
  return {
    kind: 'file',
    name,
  };
}

function createMockDirectory(name, entries = []) {
  return {
    kind: 'directory',
    name,
    values: async function* () {
      for (const entry of entries) {
        yield entry;
      }
    },
  };
}

describe('File Counter Logic', () => {
  it('should count files in a single directory', async () => {
    const dir = createMockDirectory('root', [
      createMockFile('file1.txt'),
      createMockFile('file2.txt'),
    ]);

    const count = await countDir(dir);
    expect(count).toBe(2);
  });

  it('should count files recursively', async () => {
    const subdir = createMockDirectory('subdir', [
      createMockFile('subfile1.txt'),
    ]);
    const dir = createMockDirectory('root', [
      createMockFile('file1.txt'),
      subdir,
    ]);

    const count = await countDir(dir);
    expect(count).toBe(2);
  });

  it('should handle empty directories', async () => {
    const dir = createMockDirectory('empty');
    const count = await countDir(dir);
    expect(count).toBe(0);
  });

  it('should count files from multiple directory handles', async () => {
    const dir1 = createMockDirectory('dir1', [createMockFile('a.txt')]);
    const dir2 = createMockDirectory('dir2', [createMockFile('b.txt'), createMockFile('c.txt')]);

    const count = await countAllDirs([dir1, dir2]);
    expect(count).toBe(3);
  });

  it('should handle errors gracefully during scan', async () => {
    const errorDir = {
      kind: 'directory',
      name: 'error-dir',
      values: async function* () {
        throw new Error('Access denied');
      }
    };

    // Spy on console.warn to verify error logging
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

    const count = await countDir(errorDir);

    expect(count).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

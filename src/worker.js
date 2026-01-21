// Simple dedicated Web Worker for background processing
// Receives a message {cmd: 'start', iterations: number} to begin work
// Posts progress messages {type: 'progress', done, total} and final {type: 'done', result}

self.onmessage = async function (e) {
  const data = e.data || {};
  if (!data.cmd) return;

  // Simulate generic work
  if (data.cmd === 'start') {
    const total = Number(data.iterations) || 100;
    let done = 0;
    for (let i = 0; i < total; i++) {
      let x = i;
      for (let j = 0; j < 50; j++) x = (x * 31 + j) % 1000003;
      done++;
      if (done % 5 === 0 || done === total) {
        self.postMessage({ type: 'progress', done, total });
      }
    }
    self.postMessage({ type: 'done', result: { iterations: total, checksum: 42 } });
    return;
  }

  // Count files in directories.
  if (data.cmd === 'count') {
    try {
      let fileCount = 0;
      const handles = data.dirHandles || (data.dirHandle ? [data.dirHandle] : []);

      if (handles.length > 0) {
        async function count(handle) {
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              fileCount++;
              // Post progress occasionally
              if (fileCount % 10 === 0) {
                self.postMessage({ type: 'progress', done: fileCount, total: 'unknown' });
              }
            } else if (entry.kind === 'directory') {
              await count(entry);
            }
          }
        }
        for (const h of handles) {
          await count(h);
        }
      } else if (data.filePaths) {
        fileCount = data.filePaths.length;
      }
      self.postMessage({ type: 'done', result: { fileCount } });
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
    }
  }
};

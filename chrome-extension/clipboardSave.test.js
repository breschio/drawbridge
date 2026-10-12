const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(require.resolve('./content_script.js'), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
function setup(failure) {
  const writes = [];
  const writable = { write: jest.fn(async blob => writes.push(blob)), close: jest.fn(async () => {}) };
  const directory = { getFileHandle: jest.fn(async () => {
    if (failure === 'file') throw new Error('File write denied');
    return { createWritable: async () => writable };
  }) };
  const save = jest.fn(async () => true);
  const context = vm.createContext({ window: { directoryHandle: failure === 'disconnected' ? null : {
    getDirectoryHandle: async () => {
      if (failure === 'directory') throw new Error('Directory permission denied');
      return directory;
    }
  } }, atob, Blob, Uint8Array, console: { log() {}, error() {} },
  canUseNewTaskSystem: () => true, saveAnnotationWithNewSystem: save, showNotification: jest.fn() });
  vm.runInContext(section('  async function savePastedImagesToFiles(', '  // Wire clipboard-image paste'), context);
  vm.runInContext(section('  async function addToQueue(', '  // Get user-friendly element label'), context);
  const button = { disabled: false };
  const box = { pastedImages: ['data:image/png;base64,eA=='], querySelector: () => button };
  const annotation = { id: 'test', content: 'Keep this comment', pastedImages: box.pastedImages };
  return { context, button, box, annotation, writes, save };
}

test.each(['directory', 'file', 'disconnected'])('retains editable draft on %s failure', async failure => {
  const { context, box, button, annotation, save } = setup(failure);
  expect(await context.submitCommentAnnotation(box, annotation)).toBe(false);
  expect(save).not.toHaveBeenCalled();
  expect(annotation.content).toBe('Keep this comment');
  expect(box.pastedImages).toEqual(['data:image/png;base64,eA==']);
  expect(button.disabled).toBe(false);
  expect(box.isSubmitting).toBe(false);
  expect(context.showNotification).toHaveBeenCalledWith(expect.stringContaining('retry'), 'error');
});

test('saves the image before saving its task reference', async () => {
  const { context, box, annotation, writes, save } = setup();
  expect(await context.submitCommentAnnotation(box, annotation)).toBe(true);
  expect(writes).toHaveLength(1);
  expect(annotation.attachments).toEqual(['./screenshots/test-paste-1.png']);
  expect(save).toHaveBeenCalledWith(annotation);
});

test('prevents duplicate submissions during an outstanding save', async () => {
  const { context, box, annotation, save } = setup();
  let finish;
  save.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const first = context.submitCommentAnnotation(box, annotation);
  expect(await context.submitCommentAnnotation(box, annotation)).toBe(false);
  while (!finish) await Promise.resolve();
  finish(true);
  expect(await first).toBe(true);
  expect(save).toHaveBeenCalledTimes(1);
});

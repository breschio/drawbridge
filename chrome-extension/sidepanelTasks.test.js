const fs = require('fs');
const vm = require('vm');
const { TaskStore } = require('./utils/taskStore');
const markdownGenerator = require('./utils/markdownGenerator');
const source = fs.readFileSync(require.resolve('./content_script.js'), 'utf8');
function setup() {
  const files = new Map();
  const removeEntry = jest.fn(async () => {});
  const directoryHandle = {
    getDirectoryHandle: async () => ({ removeEntry }),
    getFileHandle: async name => ({
      getFile: async () => ({ size: (files.get(name) || '').length, text: async () => files.get(name) || '' }),
      createWritable: async () => ({ write: async data => files.set(name, data), close: async () => {} })
    })
  };
  global.window = { directoryHandle };
  const taskStore = new TaskStore();
  taskStore.initialize(directoryHandle);
  taskStore.tasks = [{ id: 'one', title: 'First', comment: 'First comment', status: 'to do', selector: 'button', timestamp: 1, screenshotPath: './screenshots/one.png' },
    { id: 'two', title: 'Second', comment: 'Second comment', status: 'to do', selector: 'div', timestamp: 2 }];
  const context = vm.createContext({ taskStore, markdownGenerator, window: { directoryHandle, dispatchEvent: jest.fn() }, CustomEvent: class {} });
  vm.runInContext(source.slice(source.indexOf('  async function updateTaskStatusFromSidePanel('), source.indexOf('  // Get count of screenshots')), context);
  return { context, taskStore, files, removeEntry };
}
afterEach(() => { delete global.window; });
test('deleting a task updates JSON, markdown, and its screenshot', async () => {
  const { context, taskStore, files, removeEntry } = setup();
  await context.deleteTaskFromSidePanel('one');
  expect(taskStore.tasks.map(t => t.id)).toEqual(['two']);
  expect(JSON.parse(files.get('moat-tasks-detail.json')).map(t => t.id)).toEqual(['two']);
  expect(files.get('moat-tasks.md')).toContain('Second comment');
  expect(files.get('moat-tasks.md')).not.toContain('First comment');
  expect(removeEntry).toHaveBeenCalledWith('one.png');
});
test('changing status keeps markdown consistent with JSON', async () => {
  const { context, files } = setup();
  await context.updateTaskStatusFromSidePanel('one', 'done');
  expect(JSON.parse(files.get('moat-tasks-detail.json'))[0].status).toBe('done');
  expect(files.get('moat-tasks.md')).toContain('[x]');
});


test('native panel connections enable shortcuts only while connected', () => {
  let connect;
  let disconnect;
  const context = vm.createContext({ sidePanelConnections: 0, chrome: { runtime: { onConnect: { addListener(fn) { connect = fn; } } } } });
  vm.runInContext(source.slice(source.indexOf('  chrome.runtime.onConnect.addListener('), source.indexOf('  window.__drawbridgeDebug =')), context);
  connect({ name: 'unrelated' });
  expect(context.sidePanelConnections).toBe(0);
  connect({ name: 'drawbridge-sidepanel', onDisconnect: { addListener(fn) { disconnect = fn; } } });
  expect(context.sidePanelConnections).toBe(1);
  disconnect();
  expect(context.sidePanelConnections).toBe(0);
});

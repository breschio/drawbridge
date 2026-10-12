const fs = require('fs');
const vm = require('vm');
function setup() {
  const node = { querySelector() { return this; }, querySelectorAll: () => [], addEventListener() {},
    classList: { add() {}, remove() {}, toggle() {} }, style: {}, dataset: {} };
  const chrome = { tabs: { query: jest.fn(async () => [{ id: 1, windowId: 10, url: 'https://example.com' }]), sendMessage: jest.fn() }, runtime: {} };
  const context = vm.createContext({ chrome, console, setTimeout, Map, Date,
    document: { getElementById: () => node, querySelectorAll: () => [], addEventListener() {} } });
  vm.runInContext(fs.readFileSync(require.resolve('./sidepanel.js'), 'utf8'), context);
  vm.runInContext('activeTabId = 1; panelWindowId = 10;', context);
  return { context, chrome, read: expression => vm.runInContext(expression, context) };
}

test('only accepts relayed task data for this panel tab and window', () => {
  const { context, read } = setup();
  context.handleMessage({ type: 'TASKS_LOADED', sourceTabId: 2, sourceWindowId: 10, tasks: [{ id: 'wrong' }] });
  context.handleMessage({ type: 'TASKS_LOADED', sourceTabId: 1, sourceWindowId: 11, tasks: [{ id: 'wrong' }] });
  expect(read('tasks.length')).toBe(0);
  context.handleMessage({ type: 'TASKS_LOADED', sourceTabId: 1, sourceWindowId: 10, tasks: [{ id: 'right' }] });
  expect(read('tasks[0].id')).toBe('right');
});

test('drops a delayed response after a tab switch', async () => {
  const { context, chrome, read } = setup();
  let reply;
  chrome.tabs.sendMessage.mockImplementation((id, msg, callback) => { reply = callback; });
  const pending = context.sendToContentScript({ type: 'GET_CONNECTION_STATUS' });
  while (!reply) await Promise.resolve();
  read('tabEpoch++; activeTabId = 2; contentScriptReady = false;');
  reply({ connected: true, path: 'wrong project' });
  expect(await pending).toBeNull();
  expect(read('contentScriptReady')).toBe(false);
});

test('an old connection check cannot clear a newer tab connection', async () => {
  const { context, chrome, read } = setup();
  let reply;
  chrome.tabs.sendMessage.mockImplementation((id, msg, callback) => { reply = callback; });
  const pending = context.checkConnectionStatus();
  while (!reply) await Promise.resolve();
  read('tabEpoch++; activeTabId = 2; isConnected = true; projectPath = "new project";');
  reply({ connected: false });
  await pending;
  expect(read('isConnected')).toBe(true);
  expect(read('projectPath')).toBe('new project');
});

test('does not route an action if the active tab changed during lookup', async () => {
  const { context, chrome, read } = setup();
  const pending = context.sendToContentScript({ type: 'DELETE_TASK', taskId: 'old-task' });
  read('tabEpoch++; activeTabId = 2;');
  expect(await pending).toBeNull();
  expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
});

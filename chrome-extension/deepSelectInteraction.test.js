const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(require.resolve('./content_script.js'), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
function setup() {
  let click;
  const context = vm.createContext({ document: { addEventListener(type, fn) { click = fn; } },
    commentMode: true, isEventInMoatUI: () => false, isDeepSelectModifier: e => !!e.ctrlKey,
    highlightedElement: null, drilledOnPointerdown: false, lastPointer: { x: 0, y: 0 },
    refreshPickAtPointer: jest.fn(), createCommentBox: jest.fn(), handleDeepSelectDrill: jest.fn() });
  vm.runInContext(section('  // Click handler — plain click', '  // macOS: Ctrl+Click is remapped'), context);
  const event = { target: { id: 'button' }, clientX: 80, clientY: 60, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} };
  return { context, click, event };
}

test('plain click without prior hover opens an annotation', () => {
  const { context, click, event } = setup();
  context.refreshPickAtPointer.mockReturnValue(event.target);
  click(event);
  expect(context.refreshPickAtPointer).toHaveBeenCalledWith(80, 60);
  expect(context.createCommentBox).toHaveBeenCalledWith(event.target, 80, 60);
});

test('uses the current-depth pick instead of the event target', () => {
  const { context, click, event } = setup();
  const deeper = { id: 'parent-layer' };
  context.refreshPickAtPointer.mockReturnValue(deeper);
  click(event);
  expect(context.createCommentBox).toHaveBeenCalledWith(deeper, 80, 60);
});

test('falls back to the event target when picker is unavailable', () => {
  const { context, click, event } = setup();
  click(event);
  expect(context.createCommentBox).toHaveBeenCalledWith(event.target, 80, 60);
});

test('Control click without pointerdown uses the click coordinates', () => {
  const { context, click, event } = setup();
  click({ ...event, ctrlKey: true });
  expect(context.lastPointer).toEqual({ x: 80, y: 60 });
  expect(context.handleDeepSelectDrill).toHaveBeenCalledTimes(1);
  expect(context.createCommentBox).not.toHaveBeenCalled();
});

test('drilling refreshes an empty hover stack before choosing the next layer', () => {
  const top = { id: 'top' }, deep = { id: 'deep' };
  const picker = require('./utils/elementPicker');
  const api = { ...picker, pickElementAtPoint: jest.fn(() => ({ element: deep, depth: 2, total: 2 })) };
  const context = vm.createContext({ getElementPicker: () => api, pickStack: [], deepSelectIndex: 0,
    lastPointer: { x: 80, y: 60 }, showNotification: jest.fn(), console: { info() {}, warn() {} } });
  context.refreshPickAtPointer = jest.fn(() => { context.pickStack = [top, deep]; return deep; });
  vm.runInContext(section('  function drillDeeperAtPointer()', '  // Trackpads often skip'), context);
  context.drillDeeperAtPointer();
  expect(context.deepSelectIndex).toBe(1);
  expect(context.refreshPickAtPointer).toHaveBeenCalledWith(80, 60);
});

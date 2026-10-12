const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(require.resolve('./content_script.js'), 'utf8');
const guard = source.slice(source.indexOf('  const __moatNodeSelector'), source.indexOf('  let commentMode'));

function setup() {
  const handlers = {};
  class Element {
    constructor(owned) { this.owned = owned; }
    closest() { return this.owned ? this : null; }
  }
  vm.runInNewContext(guard, { Element, document: {
    addEventListener(type, handler) { handlers[type] = handler; }
  }});
  return { handlers, host: new Element(false), editor: new Element(true) };
}

test('blocks the host focusout trap when focus enters the editor', () => {
  const { handlers, host, editor } = setup();
  let trapped = false;
  const event = { target: host, relatedTarget: editor, stopImmediatePropagation: jest.fn() };
  handlers.focusout(event);
  if (!event.stopImmediatePropagation.mock.calls.length) trapped = true;
  expect(trapped).toBe(false);
});

test('blocks editor focusin and focusout but preserves host-only transitions', () => {
  const { handlers, host, editor } = setup();
  for (const type of ['focusin', 'focusout']) {
    const own = { target: editor, relatedTarget: host, stopImmediatePropagation: jest.fn() };
    handlers[type](own);
    expect(own.stopImmediatePropagation).toHaveBeenCalledTimes(1);
    for (const relatedTarget of [host, null]) {
      const event = { target: host, relatedTarget, stopImmediatePropagation: jest.fn() };
      handlers[type](event);
      expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
    }
  }
});

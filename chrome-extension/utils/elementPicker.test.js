const {
  isMoatUIElement,
  isPickableElement,
  filterPickableStack,
  normalizeDepthIndex,
  cycleDepthIndex,
  pickElementAtPoint
} = require('./elementPicker.js');

function mockElement(tag, options = {}) {
  const classes = new Set(options.classes || []);
  return {
    tagName: tag.toUpperCase(),
    nodeType: 1,
    id: options.id || '',
    classList: {
      contains: (name) => classes.has(name)
    }
  };
}

describe('elementPicker', () => {
  test('isMoatUIElement detects drawbridge UI nodes', () => {
    expect(isMoatUIElement(mockElement('div', { id: 'moat-shadow-host' }))).toBe(true);
    expect(isMoatUIElement(mockElement('div', { classes: ['float-comment-box'] }))).toBe(true);
    expect(isMoatUIElement(mockElement('div', { classes: ['hero'] }))).toBe(false);
  });

  test('isPickableElement skips html, body, and moat UI', () => {
    expect(isPickableElement(mockElement('html'))).toBe(false);
    expect(isPickableElement(mockElement('body'))).toBe(false);
    expect(isPickableElement(mockElement('div', { classes: ['float-moat'] }))).toBe(false);
    expect(isPickableElement(mockElement('button'))).toBe(true);
  });

  test('filterPickableStack removes moat layers and dedupes', () => {
    const button = mockElement('button');
    const overlay = mockElement('div', { classes: ['float-hover-overlay'] });
    const stack = filterPickableStack([overlay, button, button]);
    expect(stack).toEqual([button]);
  });

  test('normalizeDepthIndex wraps around stack length', () => {
    expect(normalizeDepthIndex(0, 3)).toBe(0);
    expect(normalizeDepthIndex(3, 3)).toBe(0);
    expect(normalizeDepthIndex(-1, 3)).toBe(2);
  });

  test('cycleDepthIndex moves deeper through the stack', () => {
    expect(cycleDepthIndex(0, 4, 1)).toBe(1);
    expect(cycleDepthIndex(3, 4, 1)).toBe(0);
    expect(cycleDepthIndex(0, 1, 1)).toBe(0);
  });

  test('pickElementAtPoint selects by depth index', () => {
    const top = mockElement('span');
    const middle = mockElement('div');
    const bottom = mockElement('section');
    const doc = {
      elementsFromPoint: () => [
        mockElement('div', { classes: ['float-hover-overlay'] }),
        top,
        middle,
        bottom,
        mockElement('body')
      ]
    };

    expect(pickElementAtPoint(10, 10, 0, doc).element).toBe(top);
    expect(pickElementAtPoint(10, 10, 1, doc).element).toBe(middle);
    expect(pickElementAtPoint(10, 10, 2, doc).element).toBe(bottom);
    expect(pickElementAtPoint(10, 10, 0, doc).total).toBe(3);
  });
});

// Element picking helpers — stack-based deep select (Figma-style)

const SKIP_TAGS = new Set(['HTML', 'BODY']);

/**
 * @param {Element|null|undefined} element
 * @returns {boolean}
 */
function isMoatUIElement(element) {
  if (!element || element.nodeType !== 1) {
    return false;
  }
  if (element.id === 'moat-shadow-host') {
    return true;
  }
  if (!element.classList) {
    return false;
  }
  return (
    element.classList.contains('float-moat') ||
    element.classList.contains('float-comment-box') ||
    element.classList.contains('float-hover-overlay') ||
    element.classList.contains('float-deep-select-badge') ||
    element.classList.contains('float-drawing-canvas')
  );
}

/**
 * @param {Element|null|undefined} element
 * @returns {boolean}
 */
function isPickableElement(element) {
  if (!element || element.nodeType !== 1) {
    return false;
  }
  if (SKIP_TAGS.has(element.tagName)) {
    return false;
  }
  return !isMoatUIElement(element);
}

/**
 * @param {number} x
 * @param {number} y
 * @param {Document} doc
 * @returns {Element[]}
 */
function getElementsStackAtPoint(x, y, doc = document) {
  if (doc.elementsFromPoint) {
    return doc.elementsFromPoint(x, y);
  }
  const el = doc.elementFromPoint(x, y);
  return el ? [el] : [];
}

/**
 * @param {Element[]} elements
 * @returns {Element[]}
 */
function filterPickableStack(elements) {
  const seen = new Set();
  const result = [];
  for (const el of elements) {
    if (!isPickableElement(el)) {
      continue;
    }
    if (seen.has(el)) {
      continue;
    }
    seen.add(el);
    result.push(el);
  }
  return result;
}

/**
 * @param {number} index
 * @param {number} stackLength
 * @returns {number}
 */
function normalizeDepthIndex(index, stackLength) {
  if (stackLength <= 0) {
    return 0;
  }
  const mod = index % stackLength;
  return mod < 0 ? mod + stackLength : mod;
}

/**
 * @param {number} currentIndex
 * @param {number} stackLength
 * @param {number} [direction=1]
 * @returns {number}
 */
function cycleDepthIndex(currentIndex, stackLength, direction = 1) {
  if (stackLength <= 1) {
    return 0;
  }
  return normalizeDepthIndex(currentIndex + direction, stackLength);
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} depthIndex
 * @param {Document} [doc=document]
 * @returns {{ element: Element|null, stack: Element[], index: number, depth: number, total: number }}
 */
function pickElementAtPoint(x, y, depthIndex, doc = document) {
  const stack = filterPickableStack(getElementsStackAtPoint(x, y, doc));
  if (stack.length === 0) {
    return { element: null, stack: [], index: 0, depth: 0, total: 0 };
  }
  const index = normalizeDepthIndex(depthIndex, stack.length);
  return {
    element: stack[index],
    stack,
    index,
    depth: index + 1,
    total: stack.length
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SKIP_TAGS,
    isMoatUIElement,
    isPickableElement,
    getElementsStackAtPoint,
    filterPickableStack,
    normalizeDepthIndex,
    cycleDepthIndex,
    pickElementAtPoint
  };
} else {
  window.MoatElementPicker = {
    isMoatUIElement,
    isPickableElement,
    getElementsStackAtPoint,
    filterPickableStack,
    normalizeDepthIndex,
    cycleDepthIndex,
    pickElementAtPoint
  };
}

// Convenience function for creating
// an element with styles
function createElement(tag, style) {
  let el = document.createElement(tag);
  if (style) {
    Object.keys(style).forEach((k) => {
      el.style[k] = style[k];
    });
  }
  return el;
}


// Calculate line height for an element
function calculateLineHeight(element) {
  let style = window.getComputedStyle(element);
  let lineHeight = parseInt(style.getPropertyValue('line-height'));
  let clone, singleLineHeight, doubleLineHeight;
  if (isNaN(lineHeight)) {
    clone = element.cloneNode();
    clone.innerHTML = '<br>';
    element.appendChild(clone);
    singleLineHeight = clone.offsetHeight;
    clone.innerHTML = '<br><br>';
    doubleLineHeight = clone.offsetHeight;
    element.removeChild(clone);
    lineHeight = doubleLineHeight - singleLineHeight;
  }
  return lineHeight;
}

// Calculate total left offset for element
function calculateLeftOffset(element) {
  let n = element;
  let leftOffset = 0;
  while (n !== element.offsetParent) {
    n = n.parentNode;
    let styles = window.getComputedStyle(n);
    leftOffset += parseInt(styles.getPropertyValue('margin-left'), 10);
    leftOffset += parseInt(styles.getPropertyValue('padding-left'), 10);
    leftOffset += parseInt(styles.getPropertyValue('border-left-width'), 10);
  }
  return leftOffset;
}


// Get hashes attached to a node
function hashesForNode(node) {
  return (node.dataset.hashes || '').split(' ').filter(Boolean);
}

// Get all hashes for this span and its parents
function hashesForSpan(span) {
  let hashes = [];
  let node = span;
  while (node.parentNode) {
    let hs = hashesForNode(node);
    hashes = hashes.concat(hs);
    node = node.parentNode;
  }
  return [...new Set(hashes)];
}

// Pick hash representing shortest
// text content, which should be the
// most "specific" hash
function hashForNode(node) {
  let hs = hashesForNode(node);
  let sorted = hs.map((hash) => {
    let nodes = [...document.querySelectorAll(`[data-hashes*="${hash}"]`)];
    let length = nodes.reduce((acc, n) => {
      return acc + n.textContent.length;
    }, 0);
    return {hash, length};
  }).sort((a, b) => a.length - b.length).map((a) => a.hash);
  let hash = sorted[0];
  return hash;
}

function nodesForHash(hash) {
  return [...document.querySelectorAll(`[data-hashes*="${hash}"]`)];
}

function appendHash(node, hash) {
  let hashes = hashesForNode(node);
  hashes.push(hash);
  node.dataset.hashes = hashes.join(' ');
  return hashes;
}

function removeHash(node, hash) {
  let hashes = hashesForNode(node);
  let idx = hashes.indexOf(hash);
  if (idx !== -1) hashes.splice(idx, 1);
  node.dataset.hashes = hashes.join(' ');
  return hashes;
}


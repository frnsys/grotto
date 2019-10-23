const COLORS = [
  '#185af4',
  '#0949bf',
  '#345799'
];
const HIGHLIGHTS = [];

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


function getBetweenNodes(startNode, endNode, commonAncestor) {
  // Find all of endContainer's ancestors up to
  // the common ancestor
  let ancestors = [];
  // TODO what if endContainer IS commonancestor
  let currNode = endNode;
  while (currNode.parentNode !== commonAncestor) {
    ancestors.push(currNode.parentNode);
    currNode = currNode.parentNode;
  }
  ancestors.push(commonAncestor);

  let between = [];
  let node = startNode;
  while (node !== endNode) {
    if (ancestors.includes(node)) {
      node = node.firstChild;
      if (!ancestors.includes(node)) {
        between.push(node);
      }
    } else if (node.nextSibling) {
      node = node.nextSibling;
      if (!ancestors.includes(node)) {
        between.push(node);
      }
    } else {
      while (!node.nextSibling) {
        node = node.parentNode;
      }
    }
  }
  return between;
}

// Highlight a range, even if it spans
// multiple elements
function highlightRange(range) {
  let span = document.createElement('span');
  span.classList.add('selected');
  let spans = [span];

  // If the selection starts and ends in different containers
  if (range.startContainer !== range.endContainer) {
    let startRange = new Range();
    let startSpan = span.cloneNode();
    startRange.setStart(range.startContainer, range.startOffset);
    startRange.setEnd(range.startContainer, range.startContainer.length);
    startRange.surroundContents(startSpan);
    spans.push(startSpan);

    let endRange = new Range();
    let endSpan = span.cloneNode();
    endRange.setStart(range.endContainer, 0);
    endRange.setEnd(range.endContainer, range.endOffset);
    endRange.surroundContents(endSpan);
    spans.push(endSpan);

    // Get nodes between the start and end containers
    let betweenNodes = getBetweenNodes(startSpan, endSpan, range.commonAncestorContainer);
    betweenNodes.forEach((n) => {
      let range = new Range();
      if (n instanceof Text) {
        let s = span.cloneNode();
        range.setStart(n, 0);
        range.setEnd(n, n.length);
        range.surroundContents(s);
        spans.push(s);
      } else {
        // Just re-use existing span
        n.classList.add('selected');
        [...n.querySelectorAll('span')].forEach((s) => {
          s.classList.add('selected');
        });
      }
    });
  } else {
    range.surroundContents(span);
  }
  return spans;
}

function unhighlightSpans(spans) {
  spans.forEach((el) => {
    let parent = el.parentNode;
    if (parent) {
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    }
  });
  [...document.querySelectorAll('.selected')].forEach((s) => s.classList.remove('selected'));
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

// Highlight a tagged span
function highlightSpan(span) {
  let hashes = hashesForSpan(span);
  if (hashes.length > 0) {
    let labels = createElement('div', {
      position: 'absolute',
      left: 0,
      top: 0,
      zIndex: 10
    });

    let allNodes = [];
    hashes.forEach((h, i) => {
      let color = COLORS[i % COLORS.length];
      let nodes = [...document.querySelectorAll(`[data-hashes*="${h}"]`)];

      // For figuring out where to attach the labels
      allNodes = allNodes.concat(nodes);

      // Draw underlines for each node
      nodes.forEach((n) => {
        // Calculate line height and number of lines
        let lineHeight = calculateLineHeight(n);
        let lines = Math.ceil(n.offsetHeight/lineHeight);

        // Create the underline element
        n.style.position = 'relative';
        let underline = createElement('div', {
          borderTop: `2px solid ${color}`,
          height: `${lineHeight}px`,
          position: 'absolute',
          left: '0',
          right: '0',
          fontSize: `${lineHeight-6}px`,
          bottom: `-${lineHeight+i}px`,
          pointerEvents: 'none'
        });
        n.appendChild(underline);

        // So we can clean this up later
        HIGHLIGHTS.push(underline);

        // Handle additional lines, if any
        [...Array(lines-1).keys()].forEach((l) => {
          // If last line,
          // figure out where the highlight ends on this line
          // by inserting a marker element.
          // Otherwise we can assume it extends the full line.
          let right = 0;
          if (l == lines - 2) {
            let marker = createElement('span');
            n.appendChild(marker);
            right = `${n.offsetWidth-marker.offsetLeft}px`;
            marker.remove();
          }

          let underline = createElement('div', {
            borderTop: `2px solid ${color}`,
            height: `${lineHeight}px`,
            position: 'absolute',
            left: `-${n.offsetLeft}px`,
            right: right,
            fontSize: `${lineHeight-6}px`,
            bottom: `-${lineHeight+i+((l+1)*lineHeight)}px`,
            pointerEvents: 'none'
          });
          n.appendChild(underline);

          // So we can clean this up later
          HIGHLIGHTS.push(underline);
        });
      });

      // Create the tag label for this hash
      let label = createElement('div', {
        background: color,
        color: '#fff',
        padding: '2px'
      });
      label.innerText = TAGS[h].join(', ');
      labels.appendChild(label);
    });

    // Attach to left-most node
    allNodes.sort((a, b) => a.offsetLeft - b.offsetLeft);
    allNodes[0].appendChild(labels);
    labels.style.left = `-${allNodes[0].offsetLeft + labels.offsetWidth}px`;

    // So we can clean this up later
    HIGHLIGHTS.push(labels);
  }
}

function highlightImage(img) {
  let hashes = hashesForNode(img);
  if (hashes.length > 0) {
    let hash = hashes[0];
    let color = COLORS[0];
    let label = createElement('div', {
      background: color,
      color: '#fff',
      padding: '2px',
      position: 'absolute',
      top: 0,
      left: 0
    });
    label.innerText = TAGS[hash].join(', ');
    img.parentNode.appendChild(label);
    img.parentNode.style.position = 'relative';
    label.style.left = `${img.offsetLeft}px`;
    HIGHLIGHTS.push(label);
  }
}

// Decompose a set of ranges into
// non-overlapping ranges
function decomposeRanges(ranges) {
  let results = [];
  let endpoints = [];

  // Extract range starts/ends
  // and sort in ascending order
  ranges.forEach((r) => {
    endpoints.push(r[0]);
    endpoints.push(r[1]);
  });
  endpoints = [...new Set(endpoints)];
  endpoints.sort((a, b) => a - b);

  // Keep track of hashes for each endpoint
  let start = {}, end = {};
  endpoints.forEach((e) => {
    start[e] = new Set();
    end[e] = new Set();
  });
  ranges.forEach((r) => {
    start[r[0]].add(r[2]);
    end[r[1]].add(r[2]);
  });

  // Split ranges into non-overlapping parts
  let current = new Set();
  pairwise(endpoints, (e1, e2) => {
    // Keep track of current hashes
    end[e1].forEach((t) => {
      current.delete(t);
    });
    start[e1].forEach((t) => {
      current.add(t);
    });
    if (current.size > 0) {
      results.push([e1, e2, [...current]]);
    }
  });
  return results;
}


// Iterate pairwise over an array
function pairwise(arr, fn) {
  for(var i=0; i < arr.length - 1; i++){
    fn(arr[i], arr[i + 1])
  }
}

function hashesForNode(node) {
  return (node.dataset.hashes || '').split(' ').filter(Boolean);
}

// Clean up existing highlight elements
function resetHighlights() {
  HIGHLIGHTS.forEach((h) => h.remove());
  HIGHLIGHTS.length = 0; // Clear
}


// Get text nodes for an element
function textNodesUnder(el) {
  var n, a=[], walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null,false);
  while(n=walk.nextNode()) a.push(n);
  return a;
}

function loadExistingTags(tags) {
  Object.keys(tags).forEach((fnid) => {
    let article = document.getElementById(fnid);

    // Setup tagged images
    [...article.querySelectorAll('img')].forEach((img) => {
      Object.keys(tags[fnid]).forEach((data) => {
        let m = tags[fnid][data];
        if (m.type != 'image') return;
        if (data == img.src) {
          let hash = hashTags(fnid, m.tags, data);
          TAGS[hash] = m.tags;
          img.dataset.hashes = hash;
          img.classList.add('tagged');
        }
      });
    });

    // Setup tagged text
    let rangesByNode = {};
    let nodes = textNodesUnder(article);
    nodes.forEach((node, i) => {
      if (node.isElementContentWhitespace) {
        return;
      }
      Object.keys(tags[fnid]).forEach((data) => {
        let m = tags[fnid][data];
        if (m.type != 'text') return;
        let hash = hashTags(fnid, m.tags, data);
        TAGS[hash] = m.tags;
        data.split('\n').map((t) => t.trim()).filter(Boolean).forEach((t) => {
          let idx = node.textContent.indexOf(t);
          if (idx < 0) return;
          if (!(i in rangesByNode)) {
            rangesByNode[i] = [];
          }
          // ranges.push([node, [idx, idx+t.length], hash]);
          rangesByNode[i].push([idx, idx+t.length, hash]);
        });
      });
    });

    Object.keys(rangesByNode).forEach((i) => {
      let ranges = decomposeRanges(rangesByNode[i]);
      let node = nodes[i];
      let shift = 0;
      ranges.forEach((d) => {
        let [rStart, rEnd, hashes] = d;
        let range = document.createRange();
        range.setStart(node, rStart-shift);
        range.setEnd(node, rEnd-shift);

        let span = document.createElement('span');
        span.classList.add('tagged');
        span.dataset.hashes = hashes.join(' ');
        range.surroundContents(span);
        shift += (rEnd-shift);
        node = span.nextSibling;
      });
    });
  });
}

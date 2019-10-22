let selected = {};
let undoHistory = [];

function calculateLineHeight (element) {
  let style = window.getComputedStyle(element);
  let lineHeight = parseInt(style.getPropertyValue('line-height'));
  var clone;
  var singleLineHeight;
  var doubleLineHeight;

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

let fns = [...document.querySelectorAll('.fn-ref')].map((fn) => [fn.offsetTop, fn.id]);
fns.reverse();

console.log(init);

function textNodesUnder(el){
  var n, a=[], walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null,false);
  while(n=walk.nextNode()) a.push(n);
  return a;
}

let TAGS = {};
let ranges = [];
Object.keys(init).forEach((fnid) => {
  let article = document.getElementById(fnid);
  [...article.querySelectorAll('img')].forEach((img) => {
    Object.keys(init[fnid]).forEach((data) => {
      let m = init[fnid][data];
      if (m.type != 'image') return;
      if (data == img.src) {
          img.dataset.tags = m.tags.join(',');
          img.style.boxShadow = 'rgb(195, 75, 39) 0px 0px 25px';
      }
    });
  });
  textNodesUnder(article).forEach((node) => {
    if (node.isElementContentWhitespace) {
      return;
    }
    Object.keys(init[fnid]).forEach((data) => {
      let m = init[fnid][data];
      if (m.type != 'text') return;
      let hash = md5(`${data}--${m.tags.join(',')}--${fnid}`);
      TAGS[hash] = m.tags;
      data.split('\n').map((t) => t.trim()).filter(Boolean).forEach((t) => {
        let idx = node.textContent.indexOf(t);
        if (idx < 0) return;
        let range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx+t.length);
        ranges.push([range, m.tags, hash]);
      });
    });
  });
});
ranges.forEach((d) => {
  let [r, tags, hash] = d;
  let span = document.createElement('span');
  span.classList.add('tagged');
  span.dataset.tags = tags.join(', ');
  span.dataset.hashes = hash;
  r.surroundContents(span);
});

function sendTags(data) {
  fetch('/tag', {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify(data)
  }).then((res) => {
    if (!res.ok) {
      alert(`Bad response from server: ${res.status}`);
    } else {
      // Send a confirmation notification
      // successEl.style.display = 'block';
      // setTimeout(() => {
      //   successEl.style.display = 'none';
      // }, 200);
    }
  }, (err) => {
    alert(err.message);
  });
}

const tooltip = document.createElement('div');
document.body.appendChild(tooltip);
tooltip.style.display = 'none';
tooltip.style.position = 'absolute';
tooltip.style.background = '#222';
tooltip.style.color = '#fff';
tooltip.style.padding = '0.25em 0.5em';
tooltip.style.fontSize = '0.8em';

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

function closestFootnoteId(node) {
  let top = node.parentElement.offsetTop;
  let fn = fns.find((fn) => {
      let [fnTop, fnId] = fn;
      return fnTop < top;
  });
  if (fn) {
    let [_, fnId] = fn;
    return fnId;
  }
  return null;
}

const input = document.createElement('input');
document.body.appendChild(input);
input.type = 'text';
input.style.position = 'fixed';
input.style.top = '1em';
input.style.left = '2em';
input.style.width = 'calc(100% - 4em)';
input.style.display = 'none';
input.style.textAlign = 'center';
input.style.border = 'none';
input.style.padding = '0.75em';
input.style.background = 'rgba(12,12,20,0.95)';
input.style.color = '#fff';
input.style.fontSize = '1em';
input.addEventListener('keydown', (ev) => {
  if (ev.key == 'Enter') {
    input.style.display = 'none';
    let tags = input.value.split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length > 0) {
      let data = {
        data: selected.data.trim(),
        fnid: selected.fnid,
        type: selected.type,
        tags: tags
      };
      let hash = md5(`${selected.data.trim()}--${tags.join(',')}--${selected.fnid}`);
      TAGS[hash] = tags;
      if (selected.mute) selected.mute(tags, hash);
      sendTags(data);
      console.log(data);
    } else {
      if (selected.reset) selected.reset();
    }
  }
});

document.addEventListener('keydown', (ev) => {
  if (ev.target == input && ev.key !== 'Escape') return;

  let selection = window.getSelection();
  switch (ev.key) {
    // Delete
    case 'x':
      let node = selection.anchorNode;
      let text = node.data;
      text = text.replace(selection.toString(), '');
      let newNode = document.createTextNode(text);
      node.replaceWith(newNode);
      undoHistory.push({
        node: newNode,
        prev: node
      });
      break;

    // Undo
    case 'u':
      let state = undoHistory.pop();
      if (state) {
        state.node.replaceWith(state.prev);
      }
      break;

    // Tag
    case 't':
      if (selection.anchorNode && !selection.isCollapsed) {
        let fnId = closestFootnoteId(selection.anchorNode);
        if (fnId) {
          if (selected.reset) selected.reset();
          let data = selection.toString();
          console.log(data);

          // Highlight selection
          let range = selection.getRangeAt(0).cloneRange();
          let span = document.createElement('span');
          span.classList.add('selected');
          let spans = [span];
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
                  spans.push(s);
                });
                spans.push(n);
              }
            });
          } else {
            range.surroundContents(span);
          }
          let reset = () => {
            spans.forEach((s) => {
              s.classList.remove('selected');
            });
          };

          selected = {
            data: data,
            fnid: fnId,
            type: 'text',
            node: selection.anchorNode,
            reset: reset,
            mute: (tags, hash) => {
              spans.forEach((s) => {
                s.classList.remove('selected');
                s.classList.add('tagged');
                let existing = (s.dataset.tags || '').split(',').filter(Boolean);
                let ts = [...new Set(existing.concat(tags))];
                s.dataset.tags = ts.join(',');
                let hashes = (s.dataset.hashes || '').split(' ').filter(Boolean);
                hashes.push(hash);
                s.dataset.hashes = hashes.join(' ');
              });
            }
          };

          // Show tag input and focus
          input.style.display = 'block';
          input.focus();
          ev.preventDefault();
        } else {
          alert('Couldn\'t find footnote id');
        }
      }
      break;

    case 'Escape':
      input.style.display = 'none';
      if (selected.reset) selected.reset();
      break;
  }
});

// Ctrl+click images to select
[...document.querySelectorAll('img')].map((el) => {
  el.addEventListener('click', (ev) => {
    if (ev.ctrlKey) {
      // Clear existing selection
      window.getSelection().removeAllRanges();
      if (selected.reset) selected.reset();

      let fnId = closestFootnoteId(ev.target);
      selected = {
        data: el.src,
        fnid: fnId,
        type: 'image',
        node: ev.target,
        reset: () => {
          ev.target.style.boxShadow = 'none';
        },
        mute: (tags) => {
          let existing = (ev.target.dataset.tags || '').split(',').filter(Boolean);
          let ts = [...new Set(existing.concat(tags))];
          ev.target.dataset.tags = ts.join(',');
          ev.target.style.boxShadow = 'rgb(195, 75, 39) 0px 0px 25px';
        }
      };
      ev.target.style.boxShadow = '0px 0px 25px rgb(65, 1, 242)';
      input.style.display = 'block';
      input.focus();
    }
  });
});


const colors = [
  '#ff0000',
  '#0000ff',
  '#00ff00',
  '#000000'
];

let highlights = [];
document.addEventListener('mousemove', (ev) => {
  highlights.forEach((h) => {
    h.remove();
  });
  if (ev.target.tagName == 'SPAN') {
    let tags = [];
    let hashes = [];
    let node = ev.target;
    while (node.parentNode) {
      let ts = (node.dataset.tags || '').split(',').filter(Boolean);
      let hs = (node.dataset.hashes || '').split(' ').filter(Boolean);
      if (ts.length > 0) {
        tags = tags.concat(ts);
        hashes = hashes.concat(hs);
      }
      node = node.parentNode;
    }
    tags = [...new Set(tags)];
    hashes = [...new Set(hashes)];
    let labels = document.createElement('div');
    labels.style.position = 'absolute';
    labels.style.left = '100%';
    labels.style.top = 0;
    labels.style.padding = '0 1em';
    let labelParentCandidates = [];
    hashes.forEach((h, i) => {
      let nodes = [...document.querySelectorAll(`[data-hashes*="${h}"]`)];
      let color = colors[i % colors.length];
      let localhighlights = [];

      // Get top-most node
      nodes.sort((a, b) => b.offsetTop - a.offsetTop);
      labelParentCandidates.push(nodes[0]);

      nodes.forEach((n) => {
        n.style.position = 'relative';
        let lineHeight = calculateLineHeight(n);
        let elHeight = n.offsetHeight;
        let lines = Math.ceil(elHeight/lineHeight);
        let h = lineHeight;
        let underline = document.createElement('div');
        underline.style.borderTop = `2px solid ${color}`;
        underline.style.height = `${h}px`;
        underline.style.position = 'absolute';
        underline.style.left = '0';
        underline.style.right = '0';
        underline.style.fontSize = `${h-6}px`;
        underline.style.bottom = `-${h+i}px`;
        underline.style.pointerEvents = 'none';
        n.appendChild(underline);
        highlights.push(underline);
        localhighlights.push(underline);
        [...Array(lines-1).keys()].forEach((l) => {
          let underline = document.createElement('div');
          underline.style.borderTop = `2px solid ${color}`;
          underline.style.height = `${h}px`;
          underline.style.position = 'absolute';
          underline.style.left = `-${n.offsetWidth-n.offsetLeft}px`; // TODO
          if (l == lines-2) {
            let marker = document.createElement('span');
            n.appendChild(marker);
            underline.style.right = `${n.offsetWidth-marker.offsetLeft}px`;
          } else {
            underline.style.right = '0';
          }
          underline.style.fontSize = `${h-6}px`;
          underline.style.bottom = `-${h+i+((l+1)*lineHeight)}px`;
          underline.style.pointerEvents = 'none';
          n.appendChild(underline);
          highlights.push(underline);
        });
      });

      // This should be leftmost and topmost first (min n.offsetLeft, min n.offsetTop)
      let label = document.createElement('span');
      // label.style.background = color;
      label.style.color = color;
      // label.style.color = '#fff';
      label.style.padding = '2px';
      label.style.display = 'inline-block';
      label.innerText = TAGS[h].join(', '); // TODO
      labels.appendChild(label);
    });

    labelParentCandidates.sort((a, b) => b.offsetTop - a.offsetTop);
    labelParentCandidates[0].appendChild(labels);
    highlights.push(labels);
  }
});

let selected = {};
let undoHistory = [];

let fns = [...document.querySelectorAll('.fn-ref')].map((fn) => [fn.offsetTop, fn.id]);
fns.reverse();

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
        data: selected.data,
        fnid: selected.fnid,
        type: selected.type,
        tags: tags
      };
      // if (selected.reset) selected.reset();
      if (selected.mute) selected.mute(tags);
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

            // Find all of endContainer's ancestors up to
            // the common ancestor
            let ancestors = [];
            // TODO what if endContainer IS commonancestor
            let currNode = range.endContainer;
            while (currNode.parentNode !== range.commonAncestorContainer) {
              ancestors.push(currNode.parentNode);
              currNode = currNode.parentNode;
            }
            let tbetweenNodes = [];
            let nextNode = range.startContainer.nextSibling || range.startContainer.parentNode;
            let up = true;
            while (nextNode) {
              tbetweenNodes.push(nextNode);
              if (ancestors.includes(nextNode)) {
                up = false;
                nextNode = nextNode.firstChild;
              } else if (up) {
                nextNode = nextNode.nextSibling || nextNode.parentNode;
              } else {
                nextNode = nextNode.nextSibling;
              }
            }

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
            data: selection.toString(),
            fnid: fnId,
            type: 'text',
            node: selection.anchorNode,
            reset: reset,
            mute: (tags) => {
              spans.forEach((s) => {
                s.classList.remove('selected');
                s.classList.add('tagged');
                let existing = (s.dataset.tags || '').split(',').filter(Boolean);
                let ts = [...new Set(existing.concat(tags))];
                s.dataset.tags = ts.join(',');
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
        }
      };
      ev.target.style.boxShadow = '0px 0px 25px rgb(65, 1, 242)';
      input.style.display = 'block';
      input.focus();
    }
  });
});

document.addEventListener('mousemove', (ev) => {
  if (ev.target.tagName == 'SPAN') {
    let tags = [];
    let node = ev.target;
    while (node.parentNode) {
      let ts = (node.dataset.tags || '').split(',').filter(Boolean);
      node = node.parentNode;
      tags = tags.concat(ts);
    }
    tags = [...new Set(tags)];
    tooltip.innerText = tags.join(', ');
    tooltip.style.display = 'block';
    tooltip.style.top = `${ev.target.offsetTop-20}px`;
    tooltip.style.left = `${ev.target.offsetLeft}px`;
  } else {
    tooltip.style.display = 'none';
  }
});

let selected = {};
let undoHistory = [];

let fns = [...document.querySelectorAll('.fn-ref')].map((fn) => [fn.offsetTop, fn.id]);
fns.reverse();

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
    let tags = input.value.split(',').map((t) => t.trim());
    let data = {
      data: selected.data,
      fnid: selected.fnid,
      type: selected.type,
      tags: tags
    };
    if (selected.reset) selected.reset();
    console.log(data);
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
          let range = selection.getRangeAt(0);
          let span = document.createElement('span');
          span.style.background = '#F0DC4E';
          range.surroundContents(span);
          let reset = () => {
            span.replaceWith(span.innerText);
          };

          selected = {
            data: selection.toString(),
            fnid: fnId,
            type: 'text',
            node: selection.anchorNode,
            reset: reset
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

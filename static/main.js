const TAGS = {};
let SELECTED = {};

function hashTags(fnid, tags, data) {
  return md5(`${data}--${tags.join(',')}--${fnid}`);
}

// Send tag(s) to backend for saving
function sendTags(data, cb) {
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
      cb();
    }
  }, (err) => {
    alert(err.message);
  });
}


loadExistingTags(init);

// Prepare tag input
const input = document.getElementById('tag-input');
input.addEventListener('keydown', (ev) => {
  if (ev.key == 'Enter') {
    input.style.display = 'none';
    let tags = input.value.split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length > 0) {
      let data = {
        data: SELECTED.data.trim(),
        fnid: SELECTED.fnid,
        type: SELECTED.type,
        tags: tags
      };
      let hash = hashTags(SELECTED.fnid, tags, SELECTED.data.trim());
      TAGS[hash] = tags;
      sendTags(data, () => {
        if (SELECTED.highlight) SELECTED.highlight(hash);
      });
    } else {
      if (SELECTED.reset) SELECTED.reset();
    }
  }
});


// Main inputs, for creating a tag
document.addEventListener('keydown', (ev) => {
  if (ev.target == input && ev.key !== 'Escape') return;

  let selection = window.getSelection();
  switch (ev.key) {
    // Tag
    case 't':
      if (selection.anchorNode && !selection.isCollapsed) {
        let fnId = selection.anchorNode.parentNode.closest('article').id;
        if (fnId) {
          // Reset existing selection
          if (SELECTED.reset) SELECTED.reset();

          // Extract data now
          let data = selection.toString();

          // Highlight selection
          // (have to do it manually b/c once the tag input
          // takes focus, it's no longer highlighted by the browser)
          let range = selection.getRangeAt(0).cloneRange();
          let spans = highlightRange(range);

          SELECTED = {
            data: data,
            fnid: fnId,
            type: 'text',
            node: selection.anchorNode,
            reset: () => {
              unhighlightSpans(spans);
            },
            highlight: (hash) => {
              spans.forEach((s) => {
                s.classList.remove('selected');
                s.classList.add('tagged');

                let hashes = hashesForNode(s);
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
      if (SELECTED.reset) SELECTED.reset();
      break;
  }
});

// Ctrl+click images to select
[...document.querySelectorAll('img')].map((el) => {
  el.addEventListener('click', (ev) => {
    if (ev.ctrlKey) {
      // Clear existing selection
      window.getSelection().removeAllRanges();
      if (SELECTED.reset) SELECTED.reset();

      let fnId = el.closest('article').id;
      SELECTED = {
        data: el.src,
        fnid: fnId,
        type: 'image',
        node: el,
        reset: () => {
          el.classList.remove('selected');
        },
        highlight: (hash) => {
          el.classList.remove('selected');
          el.classList.add('tagged');

          let hashes = hashesForNode(el);
          hashes.push(hash);
          el.dataset.hashes = hashes.join(' ');
        }
      };
      el.classList.add('selected');
      input.style.display = 'block';
      input.focus();
    }
  });
});


// Show existing tags on hover
document.addEventListener('mousemove', (ev) => {
  resetHighlights();
  if (ev.target.tagName == 'SPAN') {
    highlightSpan(ev.target);
  } else if (ev.target.tagName == 'IMG') {
    highlightImage(ev.target);
  }
});

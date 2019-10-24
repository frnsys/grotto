const TAGS = {};
const DB = {};
let SELECTED = {};

function hashTags(fnid, data) {
  return md5(`${data}--${fnid}`);
}

function existingTags() {
  let tags = new Set();
  Object.values(TAGS).forEach((ts) => {
    ts.forEach((t) => {
      tags.add(t);
    });
  });
  return [...tags];
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

function showInput() {
  inputForm.style.display = 'block';
  input.focus();
  let tags = existingTags();
  displayTagSuggestions(tags);
}

function displayTagSuggestions(tags) {
  let tagList = document.getElementById('tags-in-use');
  tagList.innerHTML = '';
  tags.forEach((t) => {
    let tagEl = createElement('div', {
      padding: '0.25em',
      background: '#000',
      color: '#fff',
      display: 'inline-block',
      margin: '1px 1px 0 0'
    });
    tagEl.innerText = t;
    tagList.appendChild(tagEl);
  });
}

// Prepare tag input
const input = document.getElementById('tag-input');
const inputForm = document.getElementById('tag-form');
input.addEventListener('keyup', (ev) => {
  if (ev.key == 'Enter') {
    inputForm.style.display = 'none';
    let tags = input.value.split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length > 0) {
      let data = {
        data: SELECTED.data.trim(),
        fnid: SELECTED.fnid,
        type: SELECTED.type,
        tags: tags
      };
      let hash = hashTags(SELECTED.fnid, SELECTED.data.trim());
      TAGS[hash] = tags;
      if (hash in DB) {
        DB[hash].tags = tags;
      } else {
        DB[hash] = {
          data: data.data,
          fnid: data.fnid,
          type: data.type,
          tags: tags
        };
      }
      sendTags(data, () => {
        if (SELECTED.highlight) SELECTED.highlight(hash);
        SELECTED = {};
      });
    } else {
      if (SELECTED.reset) SELECTED.reset();

      let hash = hashTags(SELECTED.fnid, SELECTED.data.trim());

      // Delete if tags are empty
      if (hash in DB) {
        let data = {
          data: SELECTED.data.trim(),
          fnid: SELECTED.fnid,
          type: SELECTED.type,
          tags: tags
        };
        sendTags(data, () => {
          if (SELECTED.untag) SELECTED.untag(hash); // TODO
        });
      }
    }
  } else {
    let vals = input.value.split(',').map((t) => t.trim()).filter(Boolean);
    let tags = existingTags();
    if (vals.length > 0) {
      tags = existingTags().filter((t) => vals.some((v) => t.includes(v)));
    }
    displayTagSuggestions(tags);
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
          showInput();
          ev.preventDefault();
        } else {
          alert('Couldn\'t find footnote id');
        }
      }
      break;

    case 'Escape':
      inputForm.style.display = 'none';
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
        data: el.attributes['src'].value,
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
      showInput();
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

document.addEventListener('click', (ev) => {
  let selection = window.getSelection();
  if (['SPAN', 'IMG'].includes(ev.target.tagName) && selection.toString().trim().length == 0) {
    let hs = hashesForNode(ev.target);
    if (hs.length > 0) {
      if (SELECTED.reset) SELECTED.reset();

      // Pick hash representing shortest
      // text content, which should be the
      // most "specific" hash
      let sorted = hs.map((h) => {
        let nodes = [...document.querySelectorAll(`[data-hashes*="${h}"]`)];
        let length = nodes.reduce((acc, n) => {
          return acc + n.textContent.length;
        }, 0);
        return [h, length];
      }).sort((a, b) => a[1] - b[1]).map((a) => a[0]);
      let hash = sorted[0];

      let dataForHash = DB[hash];
      let nodes = [...document.querySelectorAll(`[data-hashes*="${hash}"]`)];
      nodes.forEach((n) => {
        n.classList.add('selected');
      });

      SELECTED = {
        data: dataForHash.data,
        fnid: dataForHash.fnid,
        type: dataForHash.type,

        reset: () => {
          nodes.forEach((n) => {
            n.classList.remove('selected');
          });
        },

        // Already highlighted, don't need to do anything
        // except reset
        highlight: () => {
          nodes.forEach((n) => {
            n.classList.remove('selected');
          });
        },

        untag: (hash) => {
          nodes.forEach((n) => {

            let hashes = hashesForNode(n);
            let idx = hashes.indexOf(hash);
            if (idx !== -1) hashes.splice(idx, 1);
            n.dataset.hashes = hashes.join(' ');

            if (hashes.length == 0) {
              n.classList.remove('tagged');
            }
          });
        }
      };

      input.value = dataForHash.tags.join(', ');
      showInput();
    }
  }
});

class Selector {
  constructor(state, painter) {
    this.state = state;
    this.painter = painter;
  }

  reset() {
    if (this.state.selected.reset) this.state.selected.reset();
  }

  getTextSelection() {
    let selection = window.getSelection();
    if (selection.anchorNode && !selection.isCollapsed) {
      let article = selection.anchorNode.parentNode.closest('article');
      let fnId = article.id;
      let cite = article.querySelector('h1').innerText;

      if (!fnId) return;

      // Extract data now
      let data = selection.toString();
      let range = selection.getRangeAt(0).cloneRange();

      return {
        data: data,
        cite: cite,
        fnid: fnId,
        type: 'text',
        range: range
      };
    }
  }

  selectText() {
    let selection = this.getTextSelection();
    if (selection) {
      // Reset existing selection
      this.reset();

      // Highlight selection
      // (have to do it manually b/c once the tag input
      // takes focus, it's no longer highlighted by the browser)
      let spans = this.painter.highlightRange(selection.range);

      selection.reset = () => {
        this.painter.unhighlightSpans(spans);
      };
      selection.highlight = (hash) => {
        this.painter.resetSelected();
        spans.forEach((s) => {
          this.painter.tag([s]);
          appendHash(s, hash);
        });
      };

      // Update state
      this.state.selected = selection;
    } else {
      alert('Couldn\'t find footnote id');
    }
  }

  getImageSelection(el) {
    let article = el.closest('article');
    let fnId = article.id;
    let cite = article.querySelector('h1').innerText;
    return {
      data: el.attributes['src'].value,
      cite: cite,
      fnid: fnId,
      type: 'image',
      node: el,
    };
  }

  selectImage(el) {
    let selection = this.getImageSelection(el);

    // Clear existing selection
    window.getSelection().removeAllRanges();
    this.reset();

    selection.reset = () => {
      this.painter.resetSelected();
    };
    selection.highlight = (hash) => {
      this.painter.resetSelected();
      this.painter.tag([el]);
      appendHash(el, hash);
    };
    this.painter.select([el]);

    // Update state
    this.state.selected = selection;
  }

  getNodeSelection(node) {
    let hash = hashForNode(node);
    if (hash) {
      let data = this.state.db.get(hash);
      let nodes = nodesForHash(hash);
      this.painter.select(nodes);

      return {
        tags: data.tags,
        data: data.data,
        cite: data.cite,
        fnid: data.fnid,
        type: data.type,

        reset: () => {
          this.painter.resetSelected();
        },

        // Already highlighted, don't need to do anything
        // except reset
        highlight: () => {
          this.painter.resetSelected();
        },

        // If the tags are deleted
        untag: (hash) => {
          nodes.forEach((n) => {
            let hashes = removeHash(n, hash);
            if (hashes.length == 0) {
              this.painter.untag([n]);
            }
          });
        }
      };
    }
  }
}

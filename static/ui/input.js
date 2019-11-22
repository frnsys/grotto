class TagInput {
  constructor(state, form) {
    this.form = form;
    this.state = state;

    this.input = form.querySelector('#tag-input');
    this.tagList = form.querySelector('#tag-list');

    // Copy on click
    this.citation = form.querySelector('#tag-citation');
    this.citation.addEventListener('click', () => {
      window.getSelection().selectAllChildren(this.citation);
      document.execCommand('copy');
      window.getSelection().empty();
      this.citation.style.background = '#15B064';
      setTimeout(() => {
        this.citation.style.background = '';
      }, 200);
    });

    this.input.addEventListener('keyup', (ev) => {
      if (ev.key == 'Enter') {
        this.submitTags();
      } else {
        this.updateTagSuggestions();
      }
    });
  }

  show(value) {
    this.form.style.display = 'block';
    this.input.focus();
    if (value) {
      this.input.value = value;
    }

    // For directly copying citation
    let selected = this.state.selected;
    this.citation.innerText = `${selected.data}[^${selected.fnid.slice(0, fnidLen)}]`

    this.updateTagSuggestions();
  }

  hide() {
    this.form.style.display = 'none';
  }

  inputTags() {
    return this.input.value.split(',').map((t) => t.trim()).filter(Boolean);
  }

  submitTags() {
    this.hide();
    let tags = this.inputTags();
    let selected = this.state.selected;
    this.state.db.save(selected, tags, (hash) => {
      if (tags.length > 0) {
        if (selected.highlight) selected.highlight(hash);
      } else {
        if (selected.reset) selected.reset();
        if (selected.untag) selected.untag(hash);
      }
      this.state.selected = {};
    });
  }

  getAllTags(cb) {
    fetch('/tags', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'GET',
    }).then((res) => {
      if (!res.ok) {
        alert(`Bad response from server: ${res.status}`);
      } else {
        return res.json();
      }
    }, (err) => {
      alert(err.message);
    }).then((json) => {
      cb(json.tags);
    });
  }

  updateTagSuggestions() {
    this.getAllTags((tags) => {
      tags = Object.entries(tags).sort((tA, tB) => tB[1] - tA[1]);
      let vals = this.inputTags();
      if (vals.length > 0) {
        tags = tags.filter(([t, count]) => vals.some((v) => t.includes(v)));
      }

      this.tagList.innerHTML = '';
      tags.forEach(([t, count]) => {
        let tagEl = createElement('div', {});
        tagEl.classList.add('tag');
        tagEl.innerText = `${t} (${count})`;
        if (vals.includes(t)) tagEl.classList.add('tag-active');
        this.tagList.appendChild(tagEl);
      });
    });
  }
}

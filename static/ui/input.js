class TagInput {
  constructor(state, form) {
    this.form = form;
    this.input = form.querySelector('#tag-input');
    this.tagList = form.querySelector('#tag-list');
    this.state = state;

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

  updateTagSuggestions() {
    let vals = this.inputTags();
    let tags = this.state.db.tags();
    if (vals.length > 0) {
      tags = tags.filter((t) => vals.some((v) => t.includes(v)));
    }

    this.tagList.innerHTML = '';
    tags.forEach((t) => {
      let tagEl = createElement('div', {
        padding: '0.25em',
        background: '#000',
        color: '#fff',
        display: 'inline-block',
        margin: '1px 1px 0 0'
      });
      tagEl.innerText = t;
      this.tagList.appendChild(tagEl);
    });
  }
}

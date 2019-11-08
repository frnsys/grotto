const STATE = {
  db: new Database(init),
  selected: {}
};

const COLORS = [
  '#185af4',
  '#f92036',
  '#19e559'
];

const input = new TagInput(STATE,
  document.getElementById('tag-form'));
const painter = new Painter(STATE, COLORS);
const selector = new Selector(STATE, painter);
painter.setTagged(STATE.db);
const manager = new UIManager(STATE);
STATE.db.on('save', () => {
  manager.listTags();
  manager.flagHighlighted();
});

// Main inputs, for creating a tag
document.addEventListener('keydown', (ev) => {
  if (ev.target == input.input && ev.key !== 'Escape') return;

  switch (ev.key) {
    // Tag
    case 't':
      selector.selectText();
      // Show tag input and focus
      input.show();
      ev.preventDefault();
      break;

    case 'Escape':
      input.hide();
      selector.reset();
      break;

    // Stash/hide article
    case 'h':
      let article = manager.activeArticle();
      if (article) {
        manager.set(article, 'hidden');
        window.scrollTo({top: article.offsetTop});
      }
      break;
  }
});


// Ctrl+click images to select
[...document.querySelectorAll('img')].map((el) => {
  el.addEventListener('click', (ev) => {
    if (ev.ctrlKey) {
      selector.selectImage(el)
      input.show();
    }
  });
});

// Show existing tags on hover
document.addEventListener('mousemove', (ev) => {
  painter.resetHighlighted();
  if (ev.target.tagName == 'SPAN') {
    painter.highlightSpan(ev.target);
  } else if (ev.target.tagName == 'IMG') {
    painter.highlightImage(ev.target);
  }
});

// Edit existing tags
document.addEventListener('click', (ev) => {
  let selection = window.getSelection();
  if (['SPAN', 'IMG'].includes(ev.target.tagName) && selection.toString().trim().length == 0) {
    let selection = selector.getNodeSelection(ev.target);
    if (selection) {
      STATE.selected = selection;
      input.show(selection.tags.join(', '));
    }
  }
});

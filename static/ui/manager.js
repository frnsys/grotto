class UIManager {
  constructor() {
    [...document.querySelectorAll('article')].forEach((article) => {
      let toggle = document.createElement('div');
      toggle.classList.add('stash-toggle');
      toggle.innerText = '👁️';
      article.prepend(toggle);

      let id = article.id;
      toggle.addEventListener('click', (ev) => {
        manager.toggle(id);
      });

      let state = localStorage.getItem(article.id);
      this.set(article, state);
    });

    this.listTags();
  }

  toggle(id) {
    let article = document.getElementById(id);
    let state = localStorage.getItem(id);
    state = state !== 'hidden' ? 'hidden' : 'visible';
    this.set(article, state);
    localStorage.setItem(id, state);
  }

  set(article, state) {
    let display;
    let title = article.querySelector('h1');
    if (state == 'hidden') {
      display = 'none';
      title.classList.add('stashed-title');
    } else {
      display = 'block';
      title.classList.remove('stashed-title');
    }

    // Skip first two children,
    // these are the stash toggle and the id indicator
    [...article.children].slice(3).forEach((el) => {
      el.style.display = display;
    });
  }

  listTags() {
    const allTagsList = document.getElementById('all-tags');
    while (allTagsList.firstChild) {
      allTagsList.removeChild(allTagsList.firstChild);
    }
    let tagCounts = STATE.db.tagCounts();
    Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).forEach((t) => {
      let div = document.createElement('div');

      let count = document.createElement('span');
      count.classList.add('tag-count');
      count.innerText = tagCounts[t];
      div.appendChild(count);

      let tag = document.createElement('span');
      tag.innerText = t;
      div.appendChild(tag);

      allTagsList.appendChild(div);
    });
  }
}

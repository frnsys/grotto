class UIManager {
  constructor(state) {
    this.state = state;

    // Manage article state (e.g. collapsed or not)
    this.fnids = [];
    [...document.querySelectorAll('article')].forEach((article) => {
      this.fnids.push(article.id);

      let bar = document.createElement('div');
      bar.classList.add('article-bar');

      let highlighted = document.createElement('span');
      highlighted.classList.add('highlighted');
      highlighted.innerText = '🖍️';
      highlighted.style.display = 'none';
      bar.appendChild(highlighted);

      let toggle = document.createElement('span');
      toggle.classList.add('stash-toggle');
      toggle.innerText = '👁️';
      bar.appendChild(toggle);

      article.prepend(bar);

      let id = article.id;
      toggle.addEventListener('click', (ev) => {
        manager.toggle(id);
      });

      // Copy footnote markdown on click
      let label = article.querySelector('.fn-ref');
      label.addEventListener('click', () => {
        let div = document.createElement('div');
        div.innerText = `[^${label.id.slice(0, fnidLen)}]`;
        document.body.appendChild(div);
        window.getSelection().selectAllChildren(div);
        document.execCommand('copy');
        window.getSelection().empty();
        document.body.removeChild(div);

        label.style.background = '#15B064';
        setTimeout(() => {
          label.style.background = '';
        }, 200);
      });

      let state = localStorage.getItem(article.id);
      this.set(article, state);
    });

    this.listTags();
    this.flagHighlighted();

    window.addEventListener('scroll', () => {
      this.updateCurrent();
    });
    this.updateCurrent();
    this.updateProgress();
  }

  updateCurrent() {
    let progress = document.getElementById('progress-hint--current');
    let article = this.activeArticle();
    if (article) {
      let idx = this.fnids.indexOf(article.id);
      progress.innerText = `${idx}/${this.fnids.length}`;
    } else {
      progress.innerText = `?/${this.fnids.length}`;
    }
  }

  updateProgress() {
    let progress = document.getElementById('progress-hint--finished');
    let finished = document.querySelectorAll('.stashed-title').length;
    progress.innerText = `${((finished/this.fnids.length)*100).toFixed(1)}%`;
  }

  toggle(id) {
    let article = document.getElementById(id);
    let state = localStorage.getItem(id);
    state = state !== 'hidden' ? 'hidden' : 'visible';
    this.set(article, state);
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
    localStorage.setItem(article.id, state);

    this.updateProgress();
  }

  listTags() {
    // List all tags used in this note
    const allTagsList = document.getElementById('all-tags');
    while (allTagsList.firstChild) {
      allTagsList.removeChild(allTagsList.firstChild);
    }
    let tagCounts = this.state.db.tagCounts();
    Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).forEach((t) => {
      let div = document.createElement('div');

      let count = document.createElement('span');
      count.classList.add('tag-count');
      count.innerText = tagCounts[t];
      div.appendChild(count);

      let tag = document.createElement('a');
      tag.href = `/tag/${t}`;
      tag.innerText = t;
      div.appendChild(tag);

      allTagsList.appendChild(div);
    });
  }

  flagHighlighted() {
    let ids = this.state.db.articles();
    [...document.querySelectorAll('article')].forEach((article) => {
      let id = article.id;
      article.querySelector('.highlighted').style.display = ids.includes(id) ? 'inline' : 'none';
    });
  }

  openArticles() {
    return [...document.querySelectorAll('article')].filter((a) => {
      let state = localStorage.getItem(a.id);
      return state != 'hidden';
    });
  }

  // Get the active article
  activeArticle() {
    let top = Math.round(window.pageYOffset);

    // Only consider open articles
    let articles = this.openArticles();
    articles.reverse();
    return articles.find((a) => a.offsetTop <= top);
  }

  prevArticle() {
    let active = this.activeArticle();
    if (active) {
      let articles = this.openArticles();
      let idx = articles.indexOf(active);
      if (idx > 0) return articles[idx-1];
    }
  }

  nextArticle() {
    let active = this.activeArticle();
    if (active) {
      let articles = this.openArticles();
      let idx = articles.indexOf(active);
      if (idx < articles.length - 1) return articles[idx+1];
    }
  }
}

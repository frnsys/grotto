class Database {
  constructor(tags) {
    this.db = {};
    this.cbs = {
      'save': []
    };

    Object.keys(tags).forEach((fnid) => {
      Object.keys(tags[fnid]).forEach((data) => {
        let m = tags[fnid][data];
        let hash = makeHash(fnid, data);
        this.db[hash] = {
          data: data,
          fnid: fnid,
          type: m.type,
          tags: m.tags
        };
      });
    });
  }

  on(ev, fn) {
    this.cbs[ev].push(fn);
  }

  save(selected, tags, onSave) {
    let data = {
      data: selected.data.trim(),
      fnid: selected.fnid,
      type: selected.type,
      tags: tags
    };
    let hash = makeHash(data.fnid, data.data);
    if (hash in this.db) {
      if (tags.length > 0) {
        this.db[hash].tags = tags;
      } else {
        delete this.db[hash];
      }
    } else if (tags.length > 0) {
      this.db[hash] = data;
    }
    sendTags(data, () => {
      onSave(hash)
      this.cbs['save'].forEach((fn) => fn());
    });
  }

  tags() {
    let tags = new Set();
    Object.values(this.db).forEach((d) => {
      d.tags.forEach((t) => {
        tags.add(t);
      });
    });
    return [...tags];
  }

  tagCounts() {
    let counts = {};
    Object.values(this.db).forEach((d) => {
      d.tags.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return counts;
  }

  articles() {
    let ids = new Set();
    Object.values(this.db).forEach((d) => {
      ids.add(d.fnid);
    });
    return [...ids];
  }

  keys() {
    return Object.keys(this.db);
  }

  get(key) {
    return this.db[key];
  }
}

function makeHash(fnid, data) {
  return md5(`${data}--${fnid}`);
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

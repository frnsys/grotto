class Database {
  constructor(tags) {
    this.db = {};

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
    });
  }

  allTags() {
    let tags = new Set();
    Object.values(this.db).forEach((d) => {
      d.tags.forEach((t) => {
        tags.add(t);
      });
    });
    return [...tags];
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

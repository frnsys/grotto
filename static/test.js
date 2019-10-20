const colors = [
  '#ff0000',
  '#0000ff',
  '#00ff00',
  '#000000'
];

let highlights = [];
document.addEventListener('mousemove', (ev) => {
  highlights.forEach((h) => {
    h.remove();
  });
  if (ev.target.tagName == 'SPAN') {
    let tags = [];
    let hashes = [];
    let node = ev.target;
    while (node.parentNode) {
      let ts = (node.dataset.tags || '').split(',').filter(Boolean);
      let hs = (node.dataset.hashes || '').split(' ').filter(Boolean);
      if (ts.length > 0) {
        tags = tags.concat(ts);
        hashes = hashes.concat(hs);
      }
      node = node.parentNode;
    }
    tags = [...new Set(tags)];
    hashes = [...new Set(hashes)];
    console.log(hashes);
    hashes.forEach((h, i) => {
      let nodes = document.querySelectorAll(`[data-hashes*="${h}"]`);
      let color = colors[i % colors.length];
      let localhighlights = [];
      [...nodes].forEach((n) => {
        n.style.position = 'relative';

        let underline = document.createElement('div');
        let h = 12;
        underline.style.background = color;
        underline.style.height = `${h}px`;
        underline.style.position = 'absolute';
        underline.style.left = '0';
        underline.style.right = '0';
        underline.style.fontSize = `${h-2}px`;
        underline.style.bottom = `-${(i+1)*h}px`;
        n.appendChild(underline);
        highlights.push(underline);
        localhighlights.push(underline);
      });

      // This should be leftmost and topmost first (min n.offsetLeft, min n.offsetTop)
      localhighlights[0].innerText = 'tag';
    });
  }
});


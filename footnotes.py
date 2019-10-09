"""
- Assume papers are separated by "---"
- Assume first line is citation (APA)
"""

import os
import sys
from glob import glob
from hashlib import md5

def make_id(citation, length=4):
    return md5(citation.encode('utf8')).hexdigest()[:length]

# This script makes it so that
# when you copy a selection, it will find
# the associated footnote id and automatically append
# it to the clipboard selection.
copy_script = '''
<script>
    let fns = [...document.querySelectorAll('.fn-ref')].map((fn) => [fn.offsetTop, fn.id]);
    fns.reverse();
    document.addEventListener('copy', event => {
        let selection = window.getSelection()

        // Get the closest footnote id
        let top = selection.anchorNode.parentElement.offsetTop;
        let fn = fns.find((fn) => {
            let [fnTop, fnId] = fn;
            return fnTop < top;
        });
        if (fn) {
            let [_, fnId] = fn;
            event.preventDefault();
            let text = selection.toString().trim();
            event.clipboardData.setData('text/plain', `${text}[^${fnId}]`);
        }
    });
</script>
'''

if __name__ == '__main__':
    # To call, specify either a note (ending in .md)
    # or a path of notes.
    # Optionally specify `annotate` as the second argument
    # to generate a version of the markdown annotated with the
    # generated footnote ids for the copy_script functionality above.
    if len(sys.argv) < 2:
        print('Specify note or path of notes')
        sys.exit(1)

    path = sys.argv[1]
    annotate = False
    try:
        annotate = sys.argv[2] == 'annotate'
    except IndexError:
        pass

    citations = []
    if path.endswith('.md'):
        files = [path]
    else:
        files = glob(os.path.join(path, '*.md'))
    for f in files:
        docs = open(f, 'r').read().split('---\n')
        titles = [d.strip('\n').split('\n')[0] for d in docs]
        citations += [t.strip('# ') for t in titles if t.startswith('#')]
    # print(len(citations))

    seen = {}
    footnotes = []
    for c in sorted(citations, key=lambda s: s.lower()):
        id = make_id(c, length=5)
        if id in seen:
            raise Exception('Collision: {} & {}'.format(c, seen[id]))
        seen[id] = c
        footnotes.append('[^{}]: {}'.format(id, c))

    # Regenerate the entire note or set of notes
    # but include the footnote ids so that the copy_script
    # above will work.
    if annotate:
        ids = {c: id for id, c in seen.items()}
        lines = []
        for f in files:
            for l in open(f, 'r').read().splitlines():
                lines.append(l)
                if l.startswith('#'):
                    c = l.strip('# ')
                    lines.append('<a class="fn-ref" id="{id}">{id}</a>'.format(id=ids[c]))
        lines.append(copy_script)
        print('\n'.join(lines))

    else:
        for f in footnotes:
            print(f)

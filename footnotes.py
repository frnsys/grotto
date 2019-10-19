"""
Usage:

footnotes.py id "citation"
footnotes.py footnote ["notes.md"|"path/to/notes"]
footnotes.py annotate ["notes.md"|"path/to/notes"]

- Assume papers are separated by "---"
- Assume first line is citation (APA)
"""

import os
import sys
from glob import glob
from hashlib import md5
from base64 import urlsafe_b64encode

def make_id(citation):
    digest = md5(citation.encode('utf8')).digest()
    return urlsafe_b64encode(digest).rstrip(b'=').decode('utf8')


def make_footnotes(files, id_len=None):
    citations = []
    for f in files:
        docs = open(f, 'r').read().split('---\n')
        titles = [d.strip('\n').split('\n')[0] for d in docs]
        citations += [t.strip('# ') for t in titles if t.startswith('#')]

    seen = {}
    footnotes = []
    for c in sorted(citations, key=lambda s: s.lower()):
        id = make_id(c)[:id_len]
        if id in seen:
            raise Exception('Collision: {} & {}'.format(c, seen[id]))
        seen[id] = c
        footnotes.append('[^{}]: {}'.format(id, c))
    return footnotes, seen

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
    if len(sys.argv) < 3:
        print('Specify note or path of notes')
        sys.exit(1)

    cmd = sys.argv[1]
    arg = sys.argv[2]

    if cmd == 'id':
        print(make_id(arg))

    else:
        if arg.endswith('.md'):
            files = [arg]
        else:
            files = glob(os.path.join(arg, '*.md'))
        footnotes, idx = make_footnotes(files)

        if cmd == 'annotate':
            # Regenerate the entire note or set of notes
            # but include the footnote ids so that the copy_script
            # above will work.
            ids = {c: id for id, c in idx.items()}
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

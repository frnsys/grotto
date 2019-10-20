from hashlib import md5
from base64 import urlsafe_b64encode

def make_id(citation):
    digest = md5(citation.encode('utf8')).digest()
    return urlsafe_b64encode(digest).rstrip(b'=').decode('utf8')


def make_footnotes(files, id_len=None, only=None):
    citations = []
    for f in files:
        docs = open(f, 'r').read().split('---\n')
        titles = [d.strip('\n').split('\n')[0] for d in docs]
        citations += [t.strip('# ') for t in titles if t.startswith('#')]

    seen = {}
    footnotes = []
    for c in sorted(citations, key=lambda s: s.lower()):
        id = make_id(c)
        if only and id not in only: continue
        id = id[:id_len]
        if id in seen:
            raise Exception('Collision: {} & {}'.format(c, seen[id]))
        seen[id] = c
        footnotes.append('[^{}]: {}'.format(id, c))
    return footnotes, seen

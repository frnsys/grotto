import os
import csv
from collections import defaultdict

class CSVDB:
    def __init__(self, path):
        self.path = path
        self.data = defaultdict(dict)
        self.load()

    def load(self):
        """Load a CSV 'database'"""
        self.data = defaultdict(dict)
        for fnid, data, tags, type in self.__load_csv('tags'):
            tags = tags.split(',')
            self.data[fnid][data] = {
                'type': type,
                'tags': tags
            }

        self.sources = {}
        for fnid, citation in self.__load_csv('sources'):
            self.sources[fnid] = citation

    def __load_csv(self, name):
        with open(os.path.join(self.path, '{}.csv'.format(name)), newline='') as f:
            reader = csv.reader(f, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
            rows = [row for row in reader]
            return rows

    def save(self):
        """Save a CSV 'database'"""
        rows = []
        for fnid, annos in self.data.items():
            for data, m in annos.items():
                rows.append([fnid, data, ','.join(m['tags']), m['type']])
        self.__save_csv('tags', rows)
        self.__save_csv('sources', self.sources.items())

    def __save_csv(self, name, rows):
        # Write to tmp file first
        tmpfile = '/tmp/.grotto.{}.csv'.format(name)
        with open(tmpfile, 'w', newline='') as f:
            writer = csv.writer(f, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
            for row in rows:
                writer.writerow(row)
            f.flush()
            os.fsync(f.fileno())

        # Safe to overwrite existing file
        os.rename(tmpfile, os.path.join(self.path, '{}.csv'.format(name)))

    def __contains__(self, key):
        return key in self.data

    def __getitem__(self, key):
        return self.data[key]

    def __setitem__(self, key, val):
        self.data[key] = val

    def keys(self):
        return self.data.keys()

    def tags(self):
        """Get all tags, with counts"""
        tags = defaultdict(int)
        for d in self.data.values():
            for a in d.values():
                for t in a['tags']:
                    tags[t] += 1
        return tags

    def tagged(self, tag):
        tagged = defaultdict(list)
        cotags = {
            'direct': defaultdict(int),
            'indirect': defaultdict(int)
        }
        for fnid, d in self.data.items():
            tags = set()
            for content, a in d.items():
                included = tag in a['tags']
                for t in a['tags']:
                    if t == tag: continue
                    tags.add(t)
                    if included:
                        cotags['direct'][t] += 1

                if included:
                    tagged[fnid].append((content, a['tags']))
            if fnid in tagged:
                for t in tags:
                    cotags['indirect'][t] += 1
        return tagged, cotags

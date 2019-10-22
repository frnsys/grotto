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
        with open(self.path, newline='') as f:
            reader = csv.reader(f, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
            for row in reader:
                fnid, data, tags, type = row
                tags = tags.split(',')
                self.data[fnid][data] = {
                    'type': type,
                    'tags': tags
                }

    def save(self):
        """Save a CSV 'database'"""
        # Write to tmp file first
        tmpfile = '/tmp/.grotto.csv'
        with open(tmpfile, 'w', newline='') as f:
            writer = csv.writer(f, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
            for fnid, annos in self.data.items():
                for data, m in annos.items():
                    writer.writerow([fnid, data, ','.join(m['tags']), m['type']])
            f.flush()
            os.fsync(f.fileno())

        # Safe to overwrite existing file
        os.rename(tmpfile, self.path)

    def __contains__(self, key):
        return key in self.data

    def __getitem__(self, key):
        return self.data[key]

    def __setitem__(self, key, val):
        self.data[key] = val

    def keys(self):
        return self.data.keys()

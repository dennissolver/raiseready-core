# generate_annotated_tree.py
import os
import json

ANNOTATIONS = {
    'api/coaching': '⭐⭐⭐ CORE: Clone exactly',
    'components/coaching': '⭐⭐ CLONE & ADAPT',
    'lib/ai': '⭐⭐⭐ CRITICAL',
    'components/ui': '✅ CLONE ALL',
    # ... add more
}


def annotate_tree(path, prefix='', annotations=ANNOTATIONS):
    items = sorted(os.listdir(path))
    for i, item in enumerate(items):
        if item.startswith('.') or item == 'node_modules':
            continue

        full_path = os.path.join(path, item)
        rel_path = os.path.relpath(full_path, start='.')

        # Check for annotation
        note = annotations.get(rel_path, '')

        is_last = i == len(items) - 1
        print(f"{prefix}{'└──' if is_last else '├──'} {item}  {note}")

        if os.path.isdir(full_path):
            annotate_tree(full_path, prefix + ('    ' if is_last else '│   '), annotations)


annotate_tree('.')
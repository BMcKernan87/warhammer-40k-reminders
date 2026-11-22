"""Compare an official, locally supplied 10th-edition Detachments.csv to the selectable index."""
import argparse
import csv
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("csv_file", type=Path)
args = parser.parse_args()
index = json.loads((Path(__file__).resolve().parents[1] / "src/data/catalog.json").read_text())
families = {f["sourceId"] for f in index["families"]}
expected = {d["sourceId"]: (f["sourceId"], d["name"]) for f in index["families"] for d in f["detachments"]}
with args.csv_file.open(encoding="utf-8-sig", newline="") as source:
    rows = csv.DictReader(source, delimiter="|")
    actual = {}
    for row in rows:
        if not row["type"] and row["faction_id"] in families:
            if row["id"] in actual:
                raise ValueError("Duplicate upstream detachment ID " + row["id"])
            actual[row["id"]] = (row["faction_id"], row["name"])
changes = [{"id": key, "indexed": expected.get(key), "upstream": actual.get(key)}
           for key in sorted(actual.keys() | expected.keys()) if actual.get(key) != expected.get(key)]
print(json.dumps(changes, indent=2, ensure_ascii=False))
raise SystemExit(bool(changes))

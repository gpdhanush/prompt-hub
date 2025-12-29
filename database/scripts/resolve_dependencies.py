#!/usr/bin/env python3
"""
Analyze extracted table files to build FK dependency graph.

Outputs:
 - dependency_order.json
 - dependency_report.txt
"""

import json
from pathlib import Path
import re
from typing import Dict, List, Set

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
EXTRA_DIR = PROJECT_ROOT / "_schema_extracted"
ORDER_FILE = PROJECT_ROOT / "_reports" / "dependency_order.json"
REPORT_FILE = PROJECT_ROOT / "_reports" / "dependency_report.txt"

FK_PATTERN = re.compile(r"FOREIGN KEY `.*?` \(`(?P<column>\w+)`\)\s+REFERENCES `(?P<ref_table>\w+)`", re.IGNORECASE)

def parse_fks(content: str) -> Set[str]:
    return {match.group("ref_table") for match in FK_PATTERN.finditer(content)}

def main():
    graph: Dict[str, Set[str]] = {}
    for path in EXTRA_DIR.glob("*.sql"):
        table = path.stem
        text = path.read_text()
        if "CREATE TABLE" not in text:
            continue
        deps = parse_fks(text)
        graph[table] = deps

    resolved = []
    temp = set()
    visited = set()
    cycle_report = []

    def visit(node: str, stack: List[str]):
        if node in visited:
            return
        if node in temp:
            cycle = stack[stack.index(node):] + [node]
            cycle_report.append(cycle)
            return
        temp.add(node)
        for dep in sorted(graph.get(node, [])):
            visit(dep, stack + [dep])
        temp.remove(node)
        visited.add(node)
        resolved.append(node)

    for table in sorted(graph):
        visit(table, [table])

    ORDER_FILE.write_text(json.dumps(resolved, indent=2))
    with REPORT_FILE.open("w") as report:
        report.write("Dependency order (parent -> child):\n")
        for idx, table in enumerate(resolved, 1):
            parents = ", ".join(sorted(graph.get(table, [])))
            report.write(f"{idx:02d}. {table} -> depends on {parents or 'none'}\n")
        report.write("\n")
        if cycle_report:
            report.write("Cycles detected:\n")
            for cycle in cycle_report:
                report.write(" -> ".join(cycle) + "\n")
        else:
            report.write("No cycles detected.\n")

if __name__ == "__main__":
    main()


#!/usr/bin/env python3
"""Guardrail for Supabase explicit grant policy in SQL migration files.

Fails CI when a SQL file creates `public.*` tables but does not include
same-file explicit revoke/grant + RLS + policy statements for each table.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


CREATE_TABLE_RE = re.compile(
    r"create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-zA-Z_][a-zA-Z0-9_]*)",
    re.IGNORECASE,
)


def remove_sql_comments(sql: str) -> str:
    sql = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
    sql = re.sub(r"--.*?$", "", sql, flags=re.MULTILINE)
    return sql


def has_pattern(sql: str, pattern: str) -> bool:
    return re.search(pattern, sql, flags=re.IGNORECASE | re.DOTALL) is not None


def check_file(path: Path) -> list[str]:
    raw = path.read_text(encoding="utf-8")
    sql = remove_sql_comments(raw)
    tables = sorted(set(CREATE_TABLE_RE.findall(sql)))
    if not tables:
        return []

    errors: list[str] = []
    for table in tables:
        fq = rf"public\.{re.escape(table)}"
        checks = [
            (
                "missing revoke from anon/authenticated/service_role",
                rf"revoke\s+all\s+on\s+table\s+{fq}\s+from\s+anon\s*,\s*authenticated\s*,\s*service_role|"
                rf"revoke\s+all\s+on\s+table\s+{fq}\s+from\s+anon\s*,\s*authenticated|"
                rf"revoke\s+all\s+on\s+table\s+{fq}\s+from\s+authenticated\s*,\s*anon",
            ),
            (
                "missing explicit grant to authenticated",
                rf"grant\s+[a-z,\s]+\s+on\s+table\s+{fq}\s+to\s+authenticated",
            ),
            (
                "missing explicit grant to service_role",
                rf"grant\s+[a-z,\s]+\s+on\s+table\s+{fq}\s+to\s+service_role",
            ),
            (
                "missing RLS enable",
                rf"alter\s+table\s+{fq}\s+enable\s+row\s+level\s+security",
            ),
            (
                "missing policy creation",
                rf"create\s+policy\s+.+?\s+on\s+{fq}",
            ),
        ]
        for reason, pattern in checks:
            if not has_pattern(sql, pattern):
                errors.append(f"{path}: table `{table}` {reason}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--paths",
        nargs="*",
        default=["docs", "supabase", "migrations"],
        help="Directories to scan for SQL files.",
    )
    args = parser.parse_args()

    files: list[Path] = []
    for base in args.paths:
        p = Path(base)
        if not p.exists():
            continue
        files.extend(sorted(p.rglob("*.sql")))

    all_errors: list[str] = []
    for file_path in files:
        all_errors.extend(check_file(file_path))

    if all_errors:
        print("Supabase grant policy check failed:")
        for item in all_errors:
            print(f"- {item}")
        print(
            "\nEach SQL file that creates public tables must include same-file "
            "REVOKE -> GRANT(authenticated/service_role) -> RLS -> POLICY."
        )
        return 1

    print(f"Supabase grant policy check passed ({len(files)} SQL files scanned).")
    return 0


if __name__ == "__main__":
    sys.exit(main())


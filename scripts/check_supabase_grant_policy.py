#!/usr/bin/env python3
"""Guardrail for Supabase explicit grant policy in SQL migration files.

Fails CI when a SQL file creates `public.*` tables without same-file
revoke/grant/RLS/policy statements, or when existing runtime table grants drift
from the project least-privilege baseline.
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
GRANT_TABLE_RE = re.compile(
    r"\bgrant\s+(.+?)\s+on\s+table\s+public\.([a-zA-Z_][a-zA-Z0-9_]*)\s+to\s+([a-zA-Z_][a-zA-Z0-9_]*)\b",
    re.IGNORECASE | re.DOTALL,
)
REVOKE_ALL_TABLE_RE = re.compile(
    r"\brevoke\s+all\s+on\s+table\s+public\.([a-zA-Z_][a-zA-Z0-9_]*)\s+from\s+([^;]+)",
    re.IGNORECASE | re.DOTALL,
)

AUTHENTICATED_TABLE_BASELINE: dict[str, set[str]] = {
    "articles": {"select"},
    "app_users": {"select", "insert", "update"},
    "login_events": {"select", "insert"},
    "user_roles": {"select", "insert", "delete"},
    "access_allowlist": {"select", "insert", "delete"},
    "access_requests": {"select", "insert", "update"},
    "favorites": {"select", "insert", "delete"},
    "article_deletion_logs": {"select"},
    "digests": {"select"},
}
SERVICE_ROLE_TABLE_BASELINE = {"select", "insert", "update", "delete"}
REQUIRED_REVOKE_ROLES = {"anon", "authenticated", "service_role"}


def remove_sql_comments(sql: str) -> str:
    sql = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
    sql = re.sub(r"--.*?$", "", sql, flags=re.MULTILINE)
    return sql


def has_pattern(sql: str, pattern: str) -> bool:
    return re.search(pattern, sql, flags=re.IGNORECASE | re.DOTALL) is not None


def split_sql_statements(sql: str) -> list[str]:
    return [statement.strip() for statement in sql.split(";") if statement.strip()]


def parse_csv_words(value: str) -> set[str]:
    return {part.strip().lower() for part in value.split(",") if part.strip()}


def parse_privileges(value: str) -> set[str]:
    normalized = re.sub(r"\s+", " ", value.strip().lower())
    if normalized in {"all", "all privileges"}:
        return {"all"}
    return parse_csv_words(normalized)


def revoke_roles_by_table(statements: list[str]) -> dict[str, set[str]]:
    roles_by_table: dict[str, set[str]] = {}
    for statement in statements:
        match = REVOKE_ALL_TABLE_RE.search(statement)
        if not match:
            continue
        table = match.group(1).lower()
        roles = parse_csv_words(match.group(2))
        roles_by_table.setdefault(table, set()).update(roles)
    return roles_by_table


def grant_rows(statements: list[str]) -> list[tuple[str, str, set[str]]]:
    rows: list[tuple[str, str, set[str]]] = []
    for statement in statements:
        match = GRANT_TABLE_RE.search(statement)
        if not match:
            continue
        privileges = parse_privileges(match.group(1))
        table = match.group(2).lower()
        grantee = match.group(3).lower()
        rows.append((table, grantee, privileges))
    return rows


def format_privileges(privileges: set[str]) -> str:
    return ", ".join(sorted(privileges))


def validate_table_grants(path: Path, statements: list[str], created_tables: set[str]) -> list[str]:
    errors: list[str] = []
    for table, grantee, privileges in grant_rows(statements):
        if grantee == "anon":
            errors.append(f"{path}: table `{table}` must not grant privileges to anon")
            continue
        if grantee == "authenticated":
            expected = AUTHENTICATED_TABLE_BASELINE.get(table)
            if expected is None:
                if table not in created_tables:
                    errors.append(
                        f"{path}: table `{table}` grant to authenticated is not in the known baseline; "
                        "add the table to the checker baseline or create it with full controls in this SQL file"
                    )
                continue
            if privileges != expected:
                errors.append(
                    f"{path}: table `{table}` authenticated grant `{format_privileges(privileges)}` "
                    f"does not match baseline `{format_privileges(expected)}`"
                )
        if grantee == "service_role":
            expected = SERVICE_ROLE_TABLE_BASELINE
            if privileges != expected:
                errors.append(
                    f"{path}: table `{table}` service_role grant `{format_privileges(privileges)}` "
                    f"does not match baseline `{format_privileges(expected)}`"
                )
    return errors


def check_file(path: Path) -> list[str]:
    raw = path.read_text(encoding="utf-8")
    sql = remove_sql_comments(raw)
    statements = split_sql_statements(sql)
    tables = {table.lower() for table in CREATE_TABLE_RE.findall(sql)}

    errors: list[str] = []
    errors.extend(validate_table_grants(path, statements, tables))

    revokes = revoke_roles_by_table(statements)
    for table in sorted(tables):
        fq = rf"public\.{re.escape(table)}"
        checks = [
            (
                "missing revoke from anon/authenticated/service_role",
                REQUIRED_REVOKE_ROLES.issubset(revokes.get(table, set())),
            ),
            (
                "missing explicit grant to authenticated",
                has_pattern(sql, rf"grant\s+[a-z,\s]+\s+on\s+table\s+{fq}\s+to\s+authenticated"),
            ),
            (
                "missing explicit grant to service_role",
                has_pattern(sql, rf"grant\s+[a-z,\s]+\s+on\s+table\s+{fq}\s+to\s+service_role"),
            ),
            (
                "missing RLS enable",
                has_pattern(sql, rf"alter\s+table\s+{fq}\s+enable\s+row\s+level\s+security"),
            ),
            (
                "missing policy creation",
                has_pattern(sql, rf"create\s+policy\s+.+?\s+on\s+{fq}"),
            ),
        ]
        for reason, passed in checks:
            if not passed:
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
            "REVOKE -> GRANT(authenticated/service_role) -> RLS -> POLICY. "
            "Existing runtime table grants must match the project least-privilege baseline."
        )
        return 1

    print(f"Supabase grant policy check passed ({len(files)} SQL files scanned).")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Collect every with-docker/<app>/deploy.json into apps.json, validate the manifests and check the
no-docker siblings.

Usage:  python3 scripts/build-index.py            # writes apps.json, prints a summary table
        python3 scripts/build-index.py --check    # validate only, non-zero exit on problems
        python3 scripts/build-index.py --markdown # print the README table
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WITH_DOCKER = ROOT / "with-docker"
NO_DOCKER = ROOT / "no-docker"
REQUIRED_KEYS = [
    "name", "folder", "title", "description", "kind", "stack", "runtime", "port",
    "extra_ports", "install", "build", "start", "docker", "healthcheck", "env",
    "auth", "credentials", "routes", "persistence", "notes",
]
REQUIRED_FILES = ["README.md", "deploy.json", ".gitignore"]
VALID_KINDS = {"static", "ssr", "spa", "api", "fullstack", "cms", "compose"}
DOCKER_FILE_PATTERNS = ("Dockerfile", "docker-compose", ".dockerignore", "deploy.json")
LOCKFILES = {"package-lock.json", "composer.lock", "bun.lock", "bun.lockb", "go.sum", "yarn.lock", "pnpm-lock.yaml"}
# Third-party code vendored into the no-docker tree (WordPress core, Ghost release). Mentions of Docker
# inside these paths are upstream text we do not edit; they are listed as notes, not as problems.
VENDORED_PREFIXES = ("wp-admin/", "wp-includes/", "wp-content/plugins/", "wp-content/themes/twenty", "ghost/core/", "ghost/README.md", "ghost/PRIVACY.md")
NOTES: list[str] = []


def app_dirs(base: Path) -> list[Path]:
    if not base.is_dir():
        return []
    return sorted(p for p in base.iterdir() if p.is_dir() and re.match(r"^\d{2}-", p.name))


def check_with_docker(folder: Path) -> tuple[dict | None, list[str]]:
    problems: list[str] = []
    for f in REQUIRED_FILES:
        if not (folder / f).exists():
            problems.append(f"missing {f}")
    manifest_path = folder / "deploy.json"
    if not manifest_path.exists():
        return None, problems
    try:
        manifest = json.loads(manifest_path.read_text())
    except json.JSONDecodeError as exc:
        return None, problems + [f"deploy.json invalid JSON: {exc}"]

    for key in REQUIRED_KEYS:
        if key not in manifest:
            problems.append(f"deploy.json missing key '{key}'")
    if manifest.get("folder") != folder.name:
        problems.append(f"deploy.json folder '{manifest.get('folder')}' != '{folder.name}'")
    if manifest.get("kind") not in VALID_KINDS:
        problems.append(f"deploy.json kind '{manifest.get('kind')}' not in {sorted(VALID_KINDS)}")

    docker = manifest.get("docker") or {}
    has_docker_file = False
    if isinstance(docker, dict):
        for key in ("dockerfile", "compose"):
            if key in docker:
                has_docker_file = True
                if not (folder / docker[key]).exists():
                    problems.append(f"docker.{key} points to missing file '{docker[key]}'")
    if not has_docker_file:
        problems.append("deploy.json docker must contain 'dockerfile' or 'compose'")

    if manifest.get("env") and not (folder / ".env.example").exists():
        problems.append("env vars declared but .env.example missing")
    return manifest, problems


def check_no_docker(folder: Path) -> list[str]:
    """A no-docker variant must be plain source: no Docker files, no manifest, and no 'docker' text
    outside lockfiles (vendored upstream code is reported but not treated as an error)."""
    problems: list[str] = []
    for path in folder.rglob("*"):
        if path.is_file() and path.name.startswith(DOCKER_FILE_PATTERNS):
            problems.append(f"docker-related file present: {path.relative_to(folder)}")
    readme = folder / "README.md"
    if not readme.exists():
        problems.append("missing minimal README.md")
    elif len(readme.read_text().splitlines()) > 6:
        problems.append("README.md is longer than a minimal description")
    try:
        out = subprocess.run(
            ["grep", "-rIil", "docker", str(folder)], capture_output=True, text=True, check=False
        ).stdout.split()
    except FileNotFoundError:
        out = []
    hits = [Path(h).relative_to(folder) for h in out if Path(h).name not in LOCKFILES and "node_modules" not in h]
    for h in hits:
        if str(h).startswith(VENDORED_PREFIXES):
            NOTES.append(f"{folder.name}: vendored upstream file mentions docker (left untouched): {h}")
        else:
            problems.append(f"mentions docker: {h}")
    return problems


def main() -> int:
    check_only = "--check" in sys.argv
    apps: list[dict] = []
    all_problems: dict[str, list[str]] = {}
    no_docker_by_num = {p.name[:2]: p for p in app_dirs(NO_DOCKER)}

    for folder in app_dirs(WITH_DOCKER):
        manifest, problems = check_with_docker(folder)
        sibling = no_docker_by_num.get(folder.name[:2])
        if sibling is None:
            problems.append("no no-docker/ sibling folder")
        else:
            problems += [f"no-docker: {p}" for p in check_no_docker(sibling)]
        if problems:
            all_problems[folder.name] = problems
        if manifest:
            manifest["paths"] = {
                "with_docker": f"with-docker/{folder.name}",
                "no_docker": f"no-docker/{sibling.name}" if sibling else None,
            }
            apps.append(manifest)

    ports: dict[int, list[str]] = {}
    for app in apps:
        for port in [app.get("port")] + list(app.get("extra_ports") or []):
            if isinstance(port, int):
                ports.setdefault(port, []).append(app["folder"])
    for port, owners in ports.items():
        if len(owners) > 1:
            all_problems.setdefault("(ports)", []).append(f"port {port} used by {owners}")

    if "--markdown" in sys.argv:
        print("| # | Title | Kind | Stack | Port(s) | Auth model | With Docker | Without Docker |")
        print("|---|-------|------|-------|---------|------------|-------------|----------------|")
        for app in apps:
            ports_txt = ", ".join(str(p) for p in [app["port"]] + list(app.get("extra_ports") or []))
            stack = ", ".join(app.get("stack") or [])
            auth = (app.get("auth") or {}).get("model", "none")
            wd = app["paths"]["with_docker"]
            nd = app["paths"]["no_docker"]
            nd_cell = f"[`{nd}`]({nd}/)" if nd else "—"
            print(f"| {app['folder'][:2]} | {app['title']} | {app['kind']} | {stack} | {ports_txt} | `{auth}` | [`{wd}`]({wd}/) | {nd_cell} |")
        return 0

    if not check_only:
        (ROOT / "apps.json").write_text(json.dumps({"count": len(apps), "apps": apps}, indent=2, ensure_ascii=False) + "\n")

    print(f"{'folder':<34}{'kind':<10}{'port':<7}{'auth':<18}{'runtime':<14}no-docker")
    for app in apps:
        print(f"{app['folder']:<34}{app['kind']:<10}{str(app['port']):<7}{(app.get('auth') or {}).get('model', '?'):<18}{app['runtime']:<14}{app['paths']['no_docker'] or '-'}")
    print(f"\n{len(apps)} manifests in with-docker/, {len(no_docker_by_num)} folders in no-docker/")

    if NOTES:
        print("\nNOTES:")
        for note in NOTES:
            print(f"  {note}")
    if all_problems:
        print("\nPROBLEMS:")
        for folder, problems in all_problems.items():
            for problem in problems:
                print(f"  {folder}: {problem}")
        return 1
    print("all manifests valid, all no-docker variants clean")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Collect every <app>/deploy.json into a root-level apps.json and validate the manifests.

Usage:  python3 scripts/build-index.py          # writes apps.json, prints a summary table
        python3 scripts/build-index.py --check  # validate only, non-zero exit on problems
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REQUIRED_KEYS = [
    "name", "folder", "title", "description", "kind", "stack", "runtime", "port",
    "extra_ports", "install", "build", "start", "docker", "healthcheck", "env",
    "auth", "credentials", "routes", "persistence", "notes",
]
REQUIRED_FILES = ["README.md", "deploy.json", ".gitignore"]
VALID_KINDS = {"static", "ssr", "spa", "api", "fullstack", "cms", "compose"}


def check_app(folder: Path) -> tuple[dict | None, list[str]]:
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


def main() -> int:
    check_only = "--check" in sys.argv
    apps: list[dict] = []
    all_problems: dict[str, list[str]] = {}
    # 00-control-panel is the operator tool, not one of the demo apps
    folders = sorted(p for p in ROOT.iterdir() if p.is_dir() and p.name[:2].isdigit() and p.name[2] == "-" and not p.name.startswith("00-"))
    for folder in folders:
        manifest, problems = check_app(folder)
        if problems:
            all_problems[folder.name] = problems
        if manifest:
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
        print("| # | Folder | Title | Kind | Stack | Port(s) | Auth model | Start |")
        print("|---|--------|-------|------|-------|---------|------------|-------|")
        for app in apps:
            ports = ", ".join(str(p) for p in [app["port"]] + list(app.get("extra_ports") or []))
            stack = ", ".join(app.get("stack") or [])
            auth = (app.get("auth") or {}).get("model", "none")
            print(f"| {app['folder'][:2]} | [`{app['folder']}`]({app['folder']}/) | {app['title']} | {app['kind']} | {stack} | {ports} | `{auth}` | `{app['start']}` |")
        return 0

    if not check_only:
        (ROOT / "apps.json").write_text(json.dumps({"count": len(apps), "apps": apps}, indent=2, ensure_ascii=False) + "\n")

    print(f"{'folder':<32}{'kind':<10}{'port':<7}{'auth':<18}runtime")
    for app in apps:
        print(f"{app['folder']:<32}{app['kind']:<10}{str(app['port']):<7}{(app.get('auth') or {}).get('model', '?'):<18}{app['runtime']}")
    print(f"\n{len(apps)} manifests found in {len(folders)} app folders")

    if all_problems:
        print("\nPROBLEMS:")
        for folder, problems in all_problems.items():
            for problem in problems:
                print(f"  {folder}: {problem}")
        return 1
    print("all manifests valid")
    return 0


if __name__ == "__main__":
    sys.exit(main())

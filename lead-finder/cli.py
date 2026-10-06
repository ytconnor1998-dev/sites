"""Command-line entry point.

    python cli.py run --groups tourist-facing --areas "trastevere,monti" --target 100
    python cli.py run --categories "restaurants,b&bs" --areas monti --dry-run
    python cli.py export
    python cli.py list
"""

from __future__ import annotations

import sys

import typer
from rich.console import Console
from rich.progress import BarColumn, MofNCompleteColumn, Progress, TextColumn, TimeElapsedColumn
from rich.table import Table

from leadfinder.config import ConfigError, load_config, split_list
from leadfinder.db import Database
from leadfinder.estimate import estimate, resolve_source
from leadfinder.export import default_export_path, export_leads
from leadfinder.logs import setup_logging
from leadfinder.pipeline import FatalRunError, Pipeline, RunOptions

app = typer.Typer(add_completion=False, help="Find Rome businesses with no website or a poor one.")
console = Console()


@app.command()
def run(
    categories: str = typer.Option("", "--categories", "-c", help='Comma-separated, e.g. "restaurants,b&bs"'),
    groups: str = typer.Option("", "--groups", "-g", help='Comma-separated, e.g. "tourist-facing,trades"'),
    areas: str = typer.Option("", "--areas", "-a", help='Comma-separated, e.g. "trastevere,monti" or "all"'),
    target: int = typer.Option(None, "--target", "-t", help="Stop after this many new qualifying leads (default 100)"),
    source: str = typer.Option("auto", "--source", help="auto | google | osm | both"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Process only 10 businesses (cheap test)"),
    yes: bool = typer.Option(False, "--yes", "-y", help="Skip the confirmation prompt"),
    export: bool = typer.Option(True, "--export/--no-export", help="Write the Excel file after the run"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Show every business in the console"),
) -> None:
    """Search, audit and save new leads."""
    log_path = setup_logging(verbose)
    try:
        cfg = load_config()
        cats = cfg.select_categories(split_list(categories), split_list(groups))
        sel_areas = cfg.select_areas(split_list(areas))
    except ConfigError as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(2) from None
    if not cats or not sel_areas:
        console.print("[red]Choose at least one of --categories/--groups, and at least one --areas.[/red]  "
                      "Run [bold]python cli.py list[/bold] to see the options.")
        raise typer.Exit(2) from None

    target = target or int(cfg.settings.get("default_target", 100))
    db = Database(cfg.db_url)
    src, warning = resolve_source(source, cfg)
    if warning:
        console.print(f"[yellow]{warning}[/yellow]")
    est = estimate(cfg, cats, sel_areas, src, target, dry_run, db.usage_this_month("google_text_search"))

    console.rule("Lead finder")
    console.print(f"Categories ({len(cats)}): " + ", ".join(c.name for c in cats))
    console.print("Areas: " + ", ".join(a.name for a in sel_areas))
    console.print(f"Target: {target} new leads" + ("   [bold yellow]DRY RUN: 10 businesses[/bold yellow]" if dry_run else ""))
    console.print()
    for line in est.lines():
        console.print(("[yellow]" + line + "[/yellow]") if line.startswith("⚠") else "  " + line)
    console.print()
    if not yes and not typer.confirm("Start the run?", default=True):
        raise typer.Exit(0)

    with Progress(
        TextColumn("[bold]{task.fields[leads]}[/bold] leads"),
        BarColumn(),
        MofNCompleteColumn(),
        TextColumn("· {task.fields[scanned]} checked · {task.fields[known]} already known"),
        TimeElapsedColumn(),
        TextColumn("{task.description}"),
        console=console,
        transient=False,
    ) as bar:
        task = bar.add_task("starting…", total=target, leads=0, scanned=0, known=0)

        def on_progress(p):
            bar.update(task, completed=min(p.leads, target), leads=p.leads, scanned=p.scanned,
                       known=p.skipped_known, description=p.message[:60])

        pipeline = Pipeline(cfg, db, on_progress=on_progress)
        try:
            summary = pipeline.run(RunOptions(split_list(categories), split_list(groups), split_list(areas),
                                              target, source, dry_run))
        except (FatalRunError, ConfigError) as e:
            console.print(f"[red]{e}[/red]")
            raise typer.Exit(1) from None
        except KeyboardInterrupt:
            console.print("[yellow]Stopped. Everything found so far is saved.[/yellow]")
            raise typer.Exit(130) from None

    p = summary.progress
    console.print()
    table = Table(title=f"Run {summary.run_id}: {summary.status}", show_header=False)
    table.add_row("New leads", f"{p.leads}  (A {p.tiers['A']} · B {p.tiers['B']} · C {p.tiers['C']})")
    table.add_row("Businesses checked", str(p.scanned))
    table.add_row("Skipped (already in database)", str(p.skipped_known))
    if p.search_errors:
        table.add_row("Failed searches", f"{p.search_errors} of {p.queries_total} (see log)")
    table.add_row("API calls", ", ".join(f"{k}: {v}" for k, v in p.api_calls.items()) or "none")
    table.add_row("Leads in database", str(db.count_leads()))
    console.print(table)
    if summary.error:
        console.print(f"[red]{summary.error}[/red]")
    if p.leads < target and summary.status == "completed" and not dry_run:
        console.print("[yellow]Target not reached: every selected search was used up. "
                      "Add areas/categories or set google.term_mode: all in config/settings.yaml.[/yellow]")
    if export and (summary.status != "failed" or p.leads):
        path = export_leads(db.leads(), default_export_path(cfg.export_dir))
        console.print(f"Excel (all {db.count_leads()} leads): [bold]{path}[/bold]")
    console.print(f"Log: {log_path}")
    raise typer.Exit(0 if summary.status != "failed" else 1)


@app.command("export")
def export_cmd(out: str = typer.Option("", "--out", "-o", help="Output .xlsx path")) -> None:
    """Export every lead in the database to Excel."""
    cfg = load_config()
    db = Database(cfg.db_url)
    rows = db.leads()
    path = export_leads(rows, out or default_export_path(cfg.export_dir))
    console.print(f"Exported {len(rows)} leads to [bold]{path}[/bold]")


@app.command("list")
def list_cmd() -> None:
    """Show the groups, categories and areas you can select."""
    cfg = load_config()
    t = Table("Group key", "Category key", "Name", "Italian search", title="Categories (config/categories.yaml)")
    for g in cfg.groups.values():
        for c in (c for c in cfg.categories.values() if c.group.key == g.key):
            t.add_row(g.key, c.key, c.name, ", ".join(c.terms_it))
    console.print(t)
    a = Table("Area key", "Name", "Size", title="Areas (config/areas.yaml)")
    for area in cfg.areas.values():
        size = f"{len(area.tiles)} tiles" if len(area.tiles) > 1 else (f"{int(area.shape.radius_m)} m radius" if area.shape.radius_m else "polygon")
        a.add_row(area.key, area.name, size)
    console.print(a)


if __name__ == "__main__":
    try:
        app()
    except KeyboardInterrupt:
        sys.exit(130)

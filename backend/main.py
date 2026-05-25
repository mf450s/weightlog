from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
import sqlite3
import os
import csv
import io
from fastapi.responses import StreamingResponse

app = FastAPI(title="WeightLog API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(__file__), "weightlog.db")


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize the database schema."""
    with get_db() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL UNIQUE,
                weight REAL NOT NULL,
                note TEXT DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date DESC);

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            INSERT OR IGNORE INTO settings (key, value) VALUES ('height_cm', '');
            INSERT OR IGNORE INTO settings (key, value) VALUES ('target_weight', '');
            INSERT OR IGNORE INTO settings (key, value) VALUES ('unit', 'kg');
        """)


init_db()


# ── Models ──────────────────────────────────────────────────

class WeightEntry(BaseModel):
    date: str = Field(..., description="ISO date YYYY-MM-DD")
    weight: float = Field(..., gt=0, description="Weight in kg")
    note: str = ""


class WeightEntryOut(WeightEntry):
    id: int
    created_at: str
    updated_at: str


class StatsOut(BaseModel):
    total_entries: int
    first_date: Optional[str] = None
    last_date: Optional[str] = None
    min_weight: Optional[float] = None
    max_weight: Optional[float] = None
    avg_weight: Optional[float] = None
    latest_weight: Optional[float] = None
    weight_change: Optional[float] = None
    bmi: Optional[float] = None
    target_weight: Optional[float] = None
    target_progress_pct: Optional[float] = None


class SettingsOut(BaseModel):
    height_cm: Optional[float] = None
    target_weight: Optional[float] = None
    unit: str = "kg"


# ── Endpoints ───────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/entries", response_model=WeightEntryOut, status_code=201)
def create_entry(entry: WeightEntry):
    with get_db() as db:
        try:
            cur = db.execute(
                "INSERT INTO entries (date, weight, note) VALUES (?, ?, ?)",
                (entry.date, entry.weight, entry.note),
            )
            db.commit()
            row = db.execute("SELECT * FROM entries WHERE id = ?", (cur.lastrowid,)).fetchone()
        except sqlite3.IntegrityError:
            raise HTTPException(409, f"Entry for {entry.date} already exists. Use PUT to update.")
    return dict(row)


@app.get("/api/entries", response_model=list[WeightEntryOut])
def list_entries(
    limit: int = Query(365, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    query = "SELECT * FROM entries WHERE 1=1"
    params: list = []
    if date_from:
        query += " AND date >= ?"
        params.append(date_from)
    if date_to:
        query += " AND date <= ?"
        params.append(date_to)
    query += " ORDER BY date DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    with get_db() as db:
        rows = db.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@app.get("/api/entries/{entry_id}", response_model=WeightEntryOut)
def get_entry(entry_id: int):
    with get_db() as db:
        row = db.execute("SELECT * FROM entries WHERE id = ?", (entry_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Entry not found")
    return dict(row)


@app.put("/api/entries/{entry_id}", response_model=WeightEntryOut)
def update_entry(entry_id: int, entry: WeightEntry):
    with get_db() as db:
        existing = db.execute("SELECT * FROM entries WHERE id = ?", (entry_id,)).fetchone()
        if not existing:
            raise HTTPException(404, "Entry not found")
        db.execute(
            "UPDATE entries SET date=?, weight=?, note=?, updated_at=datetime('now') WHERE id=?",
            (entry.date, entry.weight, entry.note, entry_id),
        )
        db.commit()
        row = db.execute("SELECT * FROM entries WHERE id = ?", (entry_id,)).fetchone()
    return dict(row)


@app.delete("/api/entries/{entry_id}", status_code=204)
def delete_entry(entry_id: int):
    with get_db() as db:
        cur = db.execute("DELETE FROM entries WHERE id = ?", (entry_id,))
        db.commit()
        if cur.rowcount == 0:
            raise HTTPException(404, "Entry not found")


@app.put("/api/entries/by-date/{entry_date}", response_model=WeightEntryOut)
def upsert_entry_by_date(entry_date: str, entry: WeightEntry):
    """Create or update an entry by date. Convenience endpoint for the frontend."""
    with get_db() as db:
        existing = db.execute("SELECT id FROM entries WHERE date = ?", (entry_date,)).fetchone()
        if existing:
            db.execute(
                "UPDATE entries SET weight=?, note=?, updated_at=datetime('now') WHERE id=?",
                (entry.weight, entry.note, existing["id"]),
            )
            db.commit()
            row = db.execute("SELECT * FROM entries WHERE id = ?", (existing["id"],)).fetchone()
        else:
            cur = db.execute(
                "INSERT INTO entries (date, weight, note) VALUES (?, ?, ?)",
                (entry_date, entry.weight, entry.note),
            )
            db.commit()
            row = db.execute("SELECT * FROM entries WHERE id = ?", (cur.lastrowid,)).fetchone()
    return dict(row)


@app.get("/api/stats", response_model=StatsOut)
def get_stats():
    with get_db() as db:
        row = db.execute("""
            SELECT
                COUNT(*) as total_entries,
                MIN(date) as first_date,
                MAX(date) as last_date,
                MIN(weight) as min_weight,
                MAX(weight) as max_weight,
                ROUND(AVG(weight), 1) as avg_weight
            FROM entries
        """).fetchone()

        latest = db.execute(
            "SELECT weight FROM entries ORDER BY date DESC LIMIT 1"
        ).fetchone()
        first = db.execute(
            "SELECT weight FROM entries ORDER BY date ASC LIMIT 1"
        ).fetchone()
        height_raw = db.execute(
            "SELECT value FROM settings WHERE key='height_cm'"
        ).fetchone()
        target_raw = db.execute(
            "SELECT value FROM settings WHERE key='target_weight'"
        ).fetchone()

    height = float(height_raw["value"]) if height_raw and height_raw["value"] else None
    target = float(target_raw["value"]) if target_raw and target_raw["value"] else None
    latest_w = latest["weight"] if latest else None
    first_w = first["weight"] if first else None
    change = round(latest_w - first_w, 1) if (latest_w and first_w and row["total_entries"] >= 2) else None

    bmi = None
    if latest_w and height and height > 0:
        height_m = height / 100
        bmi = round(latest_w / (height_m * height_m), 1)

    progress = None
    if target and first_w and target > 0 and first_w != target:
        progress = round(((first_w - latest_w) / (first_w - target)) * 100, 1) if latest_w else 0

    return StatsOut(
        total_entries=row["total_entries"],
        first_date=row["first_date"],
        last_date=row["last_date"],
        min_weight=row["min_weight"],
        max_weight=row["max_weight"],
        avg_weight=row["avg_weight"],
        latest_weight=latest_w,
        weight_change=change,
        bmi=bmi,
        target_weight=target,
        target_progress_pct=progress,
    )


@app.get("/api/settings", response_model=SettingsOut)
def get_settings():
    with get_db() as db:
        rows = {r["key"]: r["value"] for r in db.execute("SELECT * FROM settings").fetchall()}
    return SettingsOut(
        height_cm=float(rows["height_cm"]) if rows.get("height_cm") else None,
        target_weight=float(rows["target_weight"]) if rows.get("target_weight") else None,
        unit=rows.get("unit", "kg"),
    )


@app.put("/api/settings", response_model=SettingsOut)
def update_settings(settings: SettingsOut):
    with get_db() as db:
        updates = {
            "height_cm": str(settings.height_cm) if settings.height_cm else "",
            "target_weight": str(settings.target_weight) if settings.target_weight else "",
            "unit": settings.unit,
        }
        for key, val in updates.items():
            db.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, val))
        db.commit()
        rows = {r["key"]: r["value"] for r in db.execute("SELECT * FROM settings").fetchall()}
    return SettingsOut(
        height_cm=float(rows["height_cm"]) if rows.get("height_cm") else None,
        target_weight=float(rows["target_weight"]) if rows.get("target_weight") else None,
        unit=rows.get("unit", "kg"),
    )


@app.get("/api/export")
def export_csv():
    with get_db() as db:
        rows = db.execute("SELECT date, weight, note FROM entries ORDER BY date ASC").fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["date", "weight_kg", "note"])
    for r in rows:
        writer.writerow([r["date"], r["weight"], r["note"]])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=weightlog_export.csv"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_clan.py - Sincronizacion AUTOMATICA de La Elite PvP.
Lee el clan DB en vivo (Primaria\\BOT\\datos\\elite.db) y empuja a Supabase.
Disenado para correr en bucle o por el Programador de Tareas de Windows.

No requiere dependencias externas (solo stdlib). El service_role key vive en
web/scripts/.env.local (NO se commitea).
"""
import os, sys, json, time, sqlite3, logging, urllib.request, urllib.error
from datetime import datetime, timezone
from uuid import uuid5, NAMESPACE_DNS

# ---------------------------------------------------------------- config
NS = NAMESPACE_DNS  # namespace estable para IDs deterministicos
BASE = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE, ".env.local")
DEFAULT_DB = r"C:\Users\TOKIO CORPORATION\Desktop\Primaria\BOT\datos\elite.db"
DEFAULT_BOT_CONFIG = r"C:\Users\TOKIO CORPORATION\Documents\FreeFireBot\data\config.json"

def load_env():
    env = {}
    try:
        with open(ENV_PATH, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return env

ENV = load_env()
SUPABASE_URL = ENV.get("SUPABASE_URL", "https://thlbxskhcrxyejpvhpyn.supabase.co")
SERVICE_KEY = ENV.get("SUPABASE_SERVICE_KEY", "")
DB_PATH = os.environ.get("ELITE_DB_PATH", ENV.get("ELITE_DB_PATH", DEFAULT_DB))

# ---------------------------------------------------------------- logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [sync] %(levelname)s %(message)s",
    handlers=[
        # Bajo pythonw.exe (sin consola) sys.stdout es None: en ese caso el
        # StreamHandler falla en cada emit. Solo lo agregamos si hay consola.
        *([logging.StreamHandler(sys.stdout)] if sys.stdout else []),
        logging.FileHandler(os.path.join(BASE, "sync.log"), encoding="utf-8"),
    ],
)
log = logging.getLogger("sync")

if not SERVICE_KEY:
    log.error("Falta SUPABASE_SERVICE_KEY en .env.local")
    sys.exit(1)

# ---------------------------------------------------------------- supabase
def supabase(table, method, payload=None, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{table}{params}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    req.add_header("Content-Type", "application/json")
    if method in ("POST", "PATCH"):
        req.add_header("Prefer", "resolution=merge-duplicates, return=minimal")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read().decode("utf-8")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "ignore")
        log.error("Supabase %s %s -> %s %s", method, table, e.code, detail[:300])
        raise

def upsert(table, rows, conflict):
    if not rows:
        return 0
    # Supabase soporta hasta ~1000 filas por POST; dividimos en lotes.
    batch = 500
    total = 0
    for i in range(0, len(rows), batch):
        chunk = rows[i:i + batch]
        supabase(table, "POST", chunk, params=f"?on_conflict={conflict}")
        total += len(chunk)
    return total

def _existing_ids(table):
    try:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/{table}?select=id",
            headers={"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"},
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            return [row["id"] for row in json.loads(r.read().decode("utf-8"))]
    except Exception as e:
        log.error("No pude listar ids de %s: %s", table, e)
        return []

def reconcile(table, keep_ids):
    """Elimina filas cuya id NO este en keep_ids (hace al sync autoritativo).
    Borra de a una con id=eq. para evitar fallos del filtro in.() de 1 valor."""
    if not keep_ids:
        return
    keep = set(keep_ids)
    orphans = [i for i in _existing_ids(table) if i not in keep]
    for oid in orphans:
        try:
            supabase(table, "DELETE", params=f"?id=eq.{oid}")
        except Exception as e:
            log.error("reconcile %s id=%s fallo: %s", table, oid, e)

# ---------------------------------------------------------------- extract
def mid_for(key):
    return str(uuid5(NS, f"laelitepvp.com:member:{key}"))

def tid_for(comp_id):
    return str(uuid5(NS, f"laelitepvp.com:comp:{comp_id}"))

def pid_for(tid, uid):
    return str(uuid5(NS, f"laelitepvp.com:part:{tid}:{uid}"))

# Indice del tier (1-8) que guarda el bot en la metrica `rango_br`.
RANK_INDEX = {1: 'Bronze', 2: 'Silver', 3: 'Gold', 4: 'Platinum',
              5: 'Diamond', 6: 'Master', 7: 'Grandmaster', 8: 'Heroic'}


def extract(db_path):
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"No existe {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # metricas por uid
    cur.execute("SELECT uid, clave, valor FROM metricas")
    metrics = {}
    for r in cur.fetchall():
        metrics.setdefault(r["uid"], {})[r["clave"]] = r["valor"]

    # miembros (region/nivel) por uid
    cur.execute("SELECT uid, nivel, region FROM miembros")
    mbr = {r["uid"]: dict(r) for r in cur.fetchall()}

    # roster -> members
    cur.execute("SELECT nick, uid, actividad_semana, estado, visto_hace_horas, presente, entro_en FROM roster")
    rows = cur.fetchall()
    members = []
    seen = set()
    for r in rows:
        uid = r["uid"]
        key = uid if uid else f"nick:{r['nick']}"
        if key in seen:
            continue
        seen.add(key)
        m = metrics.get(uid, {}) if uid else {}

        # Usar TODOS los tops relevantes del jugador (todos los modos BR + DE).
        def best(*keys):
            vals = []
            for k in keys:
                v = m.get(k)
                if v is not None:
                    try:
                        vals.append(float(v))
                    except (TypeError, ValueError):
                        pass
            return max(vals) if vals else None

        kd = best("br_temp_solo_kd", "br_temp_duo_kd", "br_temp_escuadra_kd")
        wins = best("br_temp_solo_wins", "br_temp_duo_wins", "br_temp_escuadra_wins")
        headshots = m.get("de_temp_headshots") or m.get("de_total_headshots")
        booyahs = m.get("de_temp_wins") or wins
        kills = m.get("de_total_kills") or best("br_temp_solo_kills", "br_temp_duo_kills", "br_temp_escuadra_kills")
        winrate = best("br_temp_solo_winrate", "br_temp_duo_winrate", "br_temp_escuadra_winrate")
        kpp = best("br_temp_solo_kpp", "br_temp_duo_kpp", "br_temp_escuadra_kpp")
        partidas = best("br_total_solo_partidas", "br_total_duo_partidas", "br_total_escuadra_partidas")
        dano = best("br_temp_solo_dano_partida", "br_temp_duo_dano_partida", "br_temp_escuadra_dano_partida")
        hs_tasa = m.get("de_temp_headshot_tasa") or best("br_temp_solo_headshot_tasa", "br_temp_duo_headshot_tasa", "br_temp_escuadra_headshot_tasa")
        top10 = best("br_temp_solo_top10_tasa", "br_temp_duo_top10_tasa", "br_temp_escuadra_top10_tasa")
        max_kills = best("br_temp_solo_max_kills", "br_temp_duo_max_kills", "br_temp_escuadra_max_kills")
        revividas = best("br_temp_solo_revividas", "br_temp_duo_revividas", "br_temp_escuadra_revividas")
        idx = m.get("rango_br")
        rank = RANK_INDEX.get(int(idx)) if idx is not None else None
        stats_json = dict(m)  # TODAS las metricas del bot, a prueba de futuro
        mi = mbr.get(uid, {}) if uid else {}
        is_active = bool(r["presente"])
        members.append({
            "id": mid_for(key),
            "nickname": r["nick"],
            "free_fire_id": uid,
            "role_in_clan": "member",
            "level": int(mi["nivel"]) if mi.get("nivel") else None,
            "rank": rank,
            "kd_ratio": round(float(kd), 2) if kd is not None else None,
            "headshots": int(headshots) if headshots is not None else None,
            "wins": int(wins) if wins is not None else None,
            "booyahs": int(booyahs) if booyahs is not None else None,
            "kills": int(kills) if kills is not None else None,
            "winrate": round(float(winrate), 2) if winrate is not None else None,
            "kpp": round(float(kpp), 2) if kpp is not None else None,
            "partidas": int(partidas) if partidas is not None else None,
            "dano_partida": round(float(dano), 2) if dano is not None else None,
            "headshot_tasa": round(float(hs_tasa), 2) if hs_tasa is not None else None,
            "top10_tasa": round(float(top10), 2) if top10 is not None else None,
            "max_kills": int(max_kills) if max_kills is not None else None,
            "revividas": int(revividas) if revividas is not None else None,
            "stats_json": stats_json,
            "is_active": is_active,
            "last_sync": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    # competencias -> tournaments (+ participantes)
    cur.execute("SELECT * FROM competencias")
    comps = cur.fetchall()
    tournaments = []
    participants = []
    for c in comps:
        cat = (c["categoria"] or "").lower()
        if "escuadra" in cat:
            mode, gmode = "Escuadra", "Squad"
        elif "duo" in cat:
            mode, gmode = "Duo", "Duo"
        elif "solo" in cat:
            mode, gmode = "Solo", "Solo"
        else:
            mode, gmode = "Escuadra", "Squad"
        metric_label = "Kills" if "kills" in cat else ("K/D" if "kd" in cat else ("Victorias" if "wins" in cat else "Puntos"))
        tid = tid_for(c["id"])
        tournaments.append({
            "id": tid,
            "name": f"Torneo Semanal · {mode} · {metric_label}",
            "game_mode": gmode,
            "prize": c["premio"],
            "placement": None,  # abierto => EN CURSO en la web
            "date_played": c["fecha"],
            "participants_count": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        # standings
        cur.execute("SELECT uid, valor FROM competencia_base WHERE competencia_id=?", (c["id"],))
        base = cur.fetchall()
        for b in base:
            buid = b["uid"]
            if buid in seen:  # solo si es miembro conocido
                participants.append({
                    "id": pid_for(tid, buid),
                    "tournament_id": tid,
                    "member_id": mid_for(buid),
                    "kills": int(b["valor"]) if b["valor"] is not None else 0,
                    "placement": None,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
        if tournaments:
            tournaments[-1]["participants_count"] = len(base)

    conn.close()
    return members, tournaments, participants


# ---------------------------------------------------------------- products (FreeFireBot inventario)
def extract_products(config_path=DEFAULT_BOT_CONFIG):
    """Lee el inventario de diamantes del panel FreeFireBot y arma productos."""
    if not os.path.exists(config_path):
        log.warning("Config FreeFireBot no encontrada: %s (se omite store)", config_path)
        return []
    try:
        with open(config_path, encoding="utf-8") as f:
            cfg = json.load(f)
    except Exception as e:
        log.error("No pude leer config FreeFireBot: %s", e)
        return []
    inv = cfg.get("inventario", {})
    if not isinstance(inv, dict):
        return []
    products = []
    for amount_str, price in inv.items():
        try:
            amount = int(float(amount_str))
        except ValueError:
            continue
        pid = str(uuid5(NS, f"laelitepvp.com:product:diamonds:{amount}"))
        products.append({
            "id": pid,
            "name": f"{amount} Diamantes",
            "category": "diamonds",
            "diamonds_amount": amount,
            "price_usd": round(float(price), 2),
            "discount_percent": 0,
            "stock": -1,
            "description": "Recarga oficial Free Fire · Entrega automatica por el bot",
            "is_featured": amount in (2398, 6160),
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
    return products

# ---------------------------------------------------------------- run
def run_once():
    try:
        members, tournaments, participants = extract(DB_PATH)
    except Exception as e:
        log.error("Extraccion fallo (DB bloqueada?): %s", e)
        members, tournaments, participants = [], [], []
    log.info("Extraido: %d miembros, %d torneos, %d participantes", len(members), len(tournaments), len(participants))
    n_m = upsert("members", members, "id")
    n_t = upsert("tournaments", tournaments, "id")
    n_p = upsert("tournament_participants", participants, "id")
    reconcile("members", {m["id"] for m in members})
    reconcile("tournaments", {t["id"] for t in tournaments})
    reconcile("tournament_participants", {p["id"] for p in participants})

    # Store: inventario de FreeFireBot -> products
    products = extract_products()
    n_prod = 0
    if products:
        n_prod = upsert("products", products, "id")
        reconcile("products", {p["id"] for p in products})
        log.info("Store: %d productos sincronizados", n_prod)
    else:
        log.info("Store: sin cambios (config no disponible)")

    log.info("Supabase OK -> members:%d torneos:%d participantes:%d productos:%d", n_m, n_t, n_p, n_prod)
    return n_m + n_t + n_p + n_prod

def main():
    loop = "--loop" in sys.argv
    interval = int(os.environ.get("SYNC_INTERVAL", ENV.get("SYNC_INTERVAL", "60")))
    if loop:
        log.info("Modo bucle cada %ss (DB=%s)", interval, DB_PATH)
        while True:
            try:
                run_once()
            except Exception as e:
                log.exception("Fallo sync: %s", e)
            time.sleep(interval)
    else:
        run_once()

if __name__ == "__main__":
    main()

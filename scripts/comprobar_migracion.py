#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Comprueba si la migracion `emblemas_y_contacto.sql` ya esta aplicada.

No la aplica: eso es DDL y hace falta ser dueno del proyecto (editor SQL del
panel de Supabase). Esto solo mira si las piezas estan, y dice cual falta.

Usa la misma service_role key que el sync, de scripts/.env.local.
"""
import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))


def env():
    datos = {}
    try:
        with open(os.path.join(BASE, ".env.local"), encoding="utf-8") as f:
            for linea in f:
                linea = linea.strip()
                if not linea or linea.startswith("#") or "=" not in linea:
                    continue
                k, v = linea.split("=", 1)
                datos[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return datos


ENV = env()
URL = ENV.get("SUPABASE_URL", "https://thlbxskhcrxyejpvhpyn.supabase.co")
KEY = ENV.get("SUPABASE_SERVICE_KEY", "")

if not KEY:
    print("Falta SUPABASE_SERVICE_KEY en scripts/.env.local")
    sys.exit(1)


def pedir(ruta):
    """GET al REST de Supabase. Devuelve (ok, detalle)."""
    req = urllib.request.Request(
        f"{URL}/rest/v1/{ruta}",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return True, json.loads(r.read().decode("utf-8") or "[]")
    except urllib.error.HTTPError as e:
        return False, e.read().decode("utf-8", "ignore")[:160]
    except Exception as e:  # noqa: BLE001
        return False, str(e)


def rpc(nombre, cuerpo):
    req = urllib.request.Request(
        f"{URL}/rest/v1/rpc/{nombre}",
        data=json.dumps(cuerpo).encode("utf-8"),
        method="POST",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}",
                 "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return True, r.read().decode("utf-8")[:160]
    except urllib.error.HTTPError as e:
        return e.code not in (404,), e.read().decode("utf-8", "ignore")[:160]
    except Exception as e:  # noqa: BLE001
        return False, str(e)


print(f"Proyecto: {URL}\n")

comprobaciones = []

ok, det = pedir("members?select=emblema_br_url,emblema_cs_url&limit=1")
comprobaciones.append(("members.emblema_br_url / emblema_cs_url", ok, det))

ok, det = pedir("profiles?select=whatsapp&limit=1")
comprobaciones.append(("profiles.whatsapp", ok, det))

# La funcion existe si NO responde 404. Sin sesion dara "No autorizado", que es
# exactamente lo que tiene que hacer: prueba de que esta y de que protege.
ok, det = rpc("guardar_vinculacion", {"p_ffid": None, "p_whatsapp": None})
comprobaciones.append(("funcion guardar_vinculacion()", ok, det))

ok, det = pedir("clan_contactos?select=free_fire_id&limit=1")
comprobaciones.append(("vista clan_contactos", ok, det))

# El bucket se pregunta por la API de Storage, no adivinando por el codigo de
# error de un objeto inexistente: eso daba 400 con el bucket ya creado y el
# comprobador decia que faltaba cuando estaba perfectamente.
req = urllib.request.Request(
    f"{URL}/storage/v1/bucket",
    headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"},
)
try:
    buckets = json.loads(urllib.request.urlopen(req, timeout=20).read())
    emb = next((b for b in buckets if b.get("id") == "emblemas"), None)
    bucket_ok = bool(emb and emb.get("public"))
    bucket_det = ("existe pero NO es publico" if emb and not emb.get("public")
                  else "no esta en la lista" if not emb else "publico")
except Exception as e:  # noqa: BLE001
    bucket_ok, bucket_det = False, str(e)
comprobaciones.append(("bucket 'emblemas'", bucket_ok, bucket_det))

faltan = 0
for nombre, ok, det in comprobaciones:
    if ok:
        print(f"  [OK]    {nombre}")
    else:
        faltan += 1
        print(f"  [FALTA] {nombre}")
        print(f"          {det}")

print()
if faltan:
    print(f"{faltan} pieza(s) sin aplicar. Corre APLICAR-MIGRACION.bat y "
          f"pulsa RUN en el editor de Supabase.")
    sys.exit(2)

print("Migracion aplicada al 100%. Ya puedes:")
print("  - guardar WhatsApp + ID desde /mi")
print("  - ver los emblemas reales en /miembros (tras el proximo sync)")
sys.exit(0)

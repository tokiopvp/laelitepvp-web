"""
Publica (o actualiza) el panel de apuestas en #apostar.

POR QUE ES UN SCRIPT SUELTO Y NO PARTE DEL BOT
----------------------------------------------
Con las apuestas movidas a interacciones por HTTP ya no hay ningun proceso
encendido que pueda publicar el panel al arrancar. Pero tampoco hace falta: el
panel es UN mensaje que se pone una vez y se queda ahi para siempre. Sus
botones siguen funcionando aunque no haya nada corriendo, porque quien los
atiende es Cloudflare.

Se ejecuta a mano cuando se crea el canal, o cuando se quiera cambiar el texto.

USO
---
  python publicar_panel_discord.py

Necesita en el entorno (o en el .env de al lado):
  DISCORD_BOT_TOKEN     el token del bot
  DISCORD_CANAL_APOSTAR el id del canal #apostar
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = "https://discord.com/api/v10"
WEB = "https://www.laelitepvp.com"


def cargar_env() -> None:
    """Lee un .env de al lado, si existe. Evita tener que exportar variables."""
    for carpeta in (Path(__file__).parent, Path(__file__).parent.parent.parent / "recursos" / "Bot Discord"):
        archivo = carpeta / ".env"
        if not archivo.exists():
            continue
        for linea in archivo.read_text(encoding="utf-8").splitlines():
            linea = linea.strip()
            if not linea or linea.startswith("#") or "=" not in linea:
                continue
            k, _, v = linea.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def pedir(metodo: str, ruta: str, token: str, cuerpo: dict | None = None) -> dict | list:
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(
        f"{API}{ruta}",
        data=datos,
        method=metodo,
        headers={
            "Authorization": f"Bot {token}",
            "Content-Type": "application/json",
            "User-Agent": "LaElitePvP (https://www.laelitepvp.com, 1.0)",
        },
    )
    with urllib.request.urlopen(req) as r:
        cuerpo_txt = r.read().decode()
        return json.loads(cuerpo_txt) if cuerpo_txt else {}


PANEL = {
    "embeds": [
        {
            "title": "⚔️ APUESTAS PvP",
            "description": (
                "Reta a quien sea y juégate tus **Elite Coin**.\n\n"
                "**CÓMO VA**\n\n"
                "**1.** Pulsa `APOSTAR` y di cuánto.\n"
                "**2.** Tu reto sale en el canal de apuestas.\n"
                "**3.** Quien lo acepte pone lo mismo.\n"
                "**4.** Jugáis y subís la foto del resultado.\n"
                "**5.** Un moderador da el veredicto y **el ganador se lleva todo**.\n\n"
                f"¿No tienes coins? Gánalas en {WEB}/comunidad"
            ),
            "color": 0xE8B33C,
            "footer": {"text": "La Elite PvP · las coins salen de tu saldo al apostar"},
        }
    ],
    "components": [
        {
            "type": 1,
            "components": [
                {"type": 2, "style": 3, "label": "APOSTAR", "emoji": {"name": "⚔️"}, "custom_id": "elite:apostar"},
                {"type": 2, "style": 2, "label": "SALDO", "emoji": {"name": "💰"}, "custom_id": "elite:saldo"},
                {"type": 2, "style": 2, "label": "MIS RETOS", "emoji": {"name": "📋"}, "custom_id": "elite:mias"},
            ],
        }
    ],
}


def main() -> None:
    cargar_env()
    token = os.getenv("DISCORD_BOT_TOKEN") or os.getenv("DISCORD_TOKEN", "")
    canal = os.getenv("DISCORD_CANAL_APOSTAR", "")
    if not token or not canal:
        raise SystemExit(
            "Faltan DISCORD_BOT_TOKEN y DISCORD_CANAL_APOSTAR.\n"
            "Ponlos en el .env de recursos/Bot Discord/ o en el entorno."
        )

    try:
        # Si ya hay un panel puesto se ACTUALIZA, no se publica otro: si no,
        # cada vez que se cambie el texto quedaria un panel muerto mas arriba y
        # la gente pulsaria el viejo.
        mensajes = pedir("GET", f"/channels/{canal}/messages?limit=50", token)
        mio = next(
            (m for m in mensajes if m.get("components") and m.get("author", {}).get("bot")),
            None,
        )
        if mio:
            pedir("PATCH", f"/channels/{canal}/messages/{mio['id']}", token, PANEL)
            print(f"Panel ACTUALIZADO en el canal {canal}.")
        else:
            pedir("POST", f"/channels/{canal}/messages", token, PANEL)
            print(f"Panel PUBLICADO en el canal {canal}.")
    except urllib.error.HTTPError as e:
        detalle = e.read().decode()
        if e.code == 403:
            print(
                "Discord rechazo el mensaje (403).\n"
                "  El bot no puede escribir en ese canal. Editar canal > Permisos >\n"
                "  Anadir miembro o rol > elige el bot > activa Ver canal, Enviar\n"
                "  mensajes e Insertar enlaces.\n"
                "  Cerrar el canal a @everyone bloquea TAMBIEN al bot.",
                file=sys.stderr,
            )
        else:
            print(f"Error {e.code}: {detalle}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()

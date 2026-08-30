-- ============================================================================
--  LA CUENTA DE LA CASA ("Bruce Wayne") LA OPERA UN DISCORD
-- ============================================================================
--
--  EL MALENTENDIDO QUE HAY QUE DESHACER
--  ------------------------------------
--  "Bruce Wayne" NO es un jugador. Es `house_account`, la cuenta unica que
--  sostiene el mercado: cuando compra o vende, el grafico se mueve. Por eso
--  tiene 935.718 coins y por eso no aparece en ningun ranking.
--
--  El perfil `unlimitedreal` es un jugador normal con 19 coins. Enlazarle el
--  Discord no le dio el saldo de la casa, y no podia darselo: son dos cosas
--  distintas en dos tablas distintas.
--
--  LO QUE HACE ESTE FICHERO
--  ------------------------
--  Marca ese perfil como OPERADOR de la casa. A partir de ahi, cuando ese
--  Discord apuesta, el dinero sale y entra en `house_account` en vez de en su
--  saldo personal. Administra el saldo de la casa "como si fuera el suyo",
--  que es justo lo que se pidio, pero sin fingir que es suyo: el dinero sigue
--  siendo de la casa y el grafico lo sigue notando.
--
--  POR QUE OPERADOR Y NO "COPIARLE EL SALDO"
--  -----------------------------------------
--  Copiar los 935.718 al perfil habria sido mas rapido y habria roto la
--  economia: ese dinero estaria entonces DOS veces en la base -una en el
--  perfil y otra en la casa- y cada apuesta lo movería solo en un sitio. El
--  grafico dejaria de cuadrar con el saldo real y no habria forma de saber
--  cual de los dos numeros es el bueno.
--
--  Es idempotente: se puede correr las veces que haga falta.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------- 1) LA MARCA
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS opera_casa boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.opera_casa IS
  'Si es true, las apuestas de este perfil cobran y pagan contra '
  'house_account en vez de contra profiles.points.';

-- Solo puede haber UN operador. Si hubiera dos, dos personas moverian el mismo
-- bote a la vez y el saldo de la casa dependeria de quien llegue antes.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_un_solo_operador
  ON public.profiles ((opera_casa)) WHERE opera_casa;

-- El Discord unlimitedreal (nombre global "Bruce Wayne", id 1262561071269412938)
-- pasa a operar la casa.
UPDATE public.profiles SET opera_casa = false WHERE opera_casa;
UPDATE public.profiles
   SET opera_casa = true,
       discord_id = '1262561071269412938',
       updated_at = now()
 WHERE id = '669e4a7b-30dc-42b7-92c9-728fd67c3690';

-- ------------------------------------------------- 2) SALDO SEGUN QUIEN SEA
--
--  Una sola funcion que responde "cuanto tiene este perfil". Todo lo que
--  necesite saberlo pasa por aqui, asi que no puede haber dos sitios que
--  contesten cosas distintas.
CREATE OR REPLACE FUNCTION public.saldo_de(p_perfil uuid)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN (SELECT opera_casa FROM profiles WHERE id = p_perfil)
      THEN (SELECT coins FROM house_account WHERE id = 1)
    ELSE COALESCE((SELECT points FROM profiles WHERE id = p_perfil), 0)
  END;
$$;

-- Mueve saldo del perfil o de la casa, segun corresponda. Devuelve el saldo
-- que queda. Un delta negativo cobra; uno positivo paga.
CREATE OR REPLACE FUNCTION public.mover_saldo(p_perfil uuid, p_delta bigint,
                                              p_motivo text DEFAULT 'apuesta')
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_casa boolean;
  v_queda bigint;
BEGIN
  SELECT opera_casa INTO v_casa FROM profiles WHERE id = p_perfil;

  IF COALESCE(v_casa, false) THEN
    -- FOR UPDATE bloquea la fila: sin el, dos apuestas resueltas en el mismo
    -- instante leerian el mismo saldo y una de las dos se perderia.
    PERFORM 1 FROM house_account WHERE id = 1 FOR UPDATE;
    UPDATE house_account SET coins = GREATEST(0, coins + p_delta)
     WHERE id = 1
     RETURNING coins INTO v_queda;
  ELSE
    PERFORM 1 FROM profiles WHERE id = p_perfil FOR UPDATE;
    UPDATE profiles SET points = GREATEST(0, COALESCE(points, 0) + p_delta),
                        updated_at = now()
     WHERE id = p_perfil
     RETURNING points INTO v_queda;
    -- El historial solo tiene sentido para personas. La casa no "gana" ni
    -- "pierde" coins: las emite y las retira.
    INSERT INTO point_events (profile_id, type, amount)
    VALUES (p_perfil, p_motivo, p_delta);
  END IF;

  RETURN v_queda;
END $$;

-- --------------------------------------- 3) EDITAR EL SALDO Y EL NOMBRE
--
--  Las dos cosas que se pidieron poder tocar a mano desde el panel.
--
--  Cambiar el saldo de la casa mueve el mercado a proposito: es una inyeccion
--  o una retirada de liquidez, y el grafico tiene que reflejarla. Por eso se
--  llama a market_push con fuerza 10: una correccion manual de medio millon
--  con el empuje de una compra normal moveria un 1,5 % y no serviria de nada.
CREATE OR REPLACE FUNCTION public.casa_editar(p_coins bigint DEFAULT NULL,
                                              p_nombre text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_antes bigint;
  v_nombre text;
BEGIN
  -- Solo el dueño o un administrador. Sin esto, cualquiera con la clave
  -- publica podria fijarse el saldo de la casa desde el navegador.
  IF NOT EXISTS (
    SELECT 1 FROM profiles
     WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No tienes permiso.');
  END IF;

  SELECT coins, nombre INTO v_antes, v_nombre FROM house_account WHERE id = 1;

  IF p_nombre IS NOT NULL AND btrim(p_nombre) <> '' THEN
    UPDATE house_account SET nombre = btrim(p_nombre) WHERE id = 1;
    v_nombre := btrim(p_nombre);
  END IF;

  IF p_coins IS NOT NULL THEN
    IF p_coins < 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'El saldo no puede ser negativo.');
    END IF;
    UPDATE house_account SET coins = p_coins WHERE id = 1;

    -- Que el grafico lo note. Si suben las coins de la casa es que ha
    -- comprado; si bajan, que ha vendido.
    IF p_coins <> v_antes THEN
      PERFORM market_push(
        CASE WHEN p_coins > v_antes THEN 'compra' ELSE 'venta' END,
        v_nombre, abs(p_coins - v_antes), 10);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'nombre', v_nombre,
    'antes', v_antes,
    'coins', (SELECT coins FROM house_account WHERE id = 1));
END $$;

-- Lectura para el panel: quien opera la casa y cuanto tiene.
CREATE OR REPLACE FUNCTION public.casa_estado()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'nombre',   h.nombre,
    'coins',    h.coins,
    'operador', (SELECT jsonb_build_object(
                          'id', p.id,
                          'username', p.username,
                          'discord_id', p.discord_id)
                   FROM profiles p WHERE p.opera_casa LIMIT 1))
    FROM house_account h WHERE h.id = 1;
$$;

-- ------------------------------- 4) QUE TODO LO DEMAS FUNCIONE SIN TOCARLO
--
--  EL PROBLEMA
--  -----------
--  Hay SIETE sitios que mueven `profiles.points` a mano: crear apuesta
--  (retiene), aceptar (retiene del rival), cancelar y expirar (devuelven),
--  resolver (paga), cobrar una tarea y canjear en la tienda. En cada uno de
--  esos siete, el operador de la casa cobraria de su bolsillo personal de 19
--  coins en vez del bote de la casa.
--
--  LA OPCION QUE SE DESCARTO
--  -------------------------
--  Reescribir las siete funciones. Son largas y tienen dentro los limites de
--  apuesta, el tope de apuestas abiertas y las transiciones de estado. Tocar
--  las siete para cambiar una linea en cada una es mucha superficie donde
--  romper algo que hoy funciona, y ademas la numero ocho que se escriba
--  mañana volveria a olvidarse.
--
--  LO QUE SE HACE
--  --------------
--  Un disparador. Cuando algo cambia `points` del operador, el disparador se
--  lo lleva a `house_account` y deja `points` reflejando el saldo de la casa.
--
--  Asi NINGUNA de las siete funciones se toca, y la octava tampoco hara falta
--  tocarla: escriban lo que escriban sobre points, el dinero acaba donde
--  tiene que acabar. Es una regla en un solo sitio en vez de la misma
--  correccion repetida siete veces.
CREATE OR REPLACE FUNCTION public.casa_redirigir_saldo()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_delta bigint;
  v_coins bigint;
BEGIN
  IF NOT COALESCE(OLD.opera_casa, false) THEN
    RETURN NEW;                      -- jugador normal: todo sigue igual
  END IF;

  -- Si venimos DENTRO de otro disparador, es el espejo de house_account
  -- poniendo `points` al dia. Aplicar el cambio otra vez a la casa duplicaria
  -- el movimiento, asi que aqui no se toca nada.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  v_delta := COALESCE(NEW.points, 0) - COALESCE(OLD.points, 0);
  IF v_delta = 0 THEN
    RETURN NEW;
  END IF;

  -- FOR UPDATE bloquea la fila de la casa. Sin el, dos apuestas resueltas en
  -- el mismo instante leerian el mismo saldo y una de las dos se perderia.
  PERFORM 1 FROM house_account WHERE id = 1 FOR UPDATE;
  UPDATE house_account
     SET coins = GREATEST(0, coins + v_delta)
   WHERE id = 1
   RETURNING coins INTO v_coins;

  -- `points` queda como espejo del saldo de la casa. De este modo todo lo que
  -- LEE points -el panel, los rankings, la comprobacion de "te faltan X
  -- coins"- ve el numero correcto sin enterarse de que hay un desvio.
  NEW.points := v_coins;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS casa_redirige ON public.profiles;
CREATE TRIGGER casa_redirige
  BEFORE UPDATE OF points ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.casa_redirigir_saldo();

-- El camino de vuelta: si el saldo de la casa se cambia desde el panel (o lo
-- mueve el mercado), el espejo del operador tiene que enterarse.
CREATE OR REPLACE FUNCTION public.casa_espejo()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- El otro disparador se corta solo al ver que la profundidad es > 1. Se
  -- hace asi y no con ALTER TABLE ... DISABLE TRIGGER porque eso es DDL: pide
  -- un bloqueo exclusivo sobre `profiles` en mitad de una transaccion, y dos
  -- pagos simultaneos acabarian en interbloqueo.
  UPDATE public.profiles SET points = NEW.coins WHERE opera_casa;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS casa_espeja ON public.house_account;
CREATE TRIGGER casa_espeja
  AFTER UPDATE OF coins ON public.house_account
  FOR EACH ROW EXECUTE FUNCTION public.casa_espejo();

-- Y el arranque: el espejo se pone al dia ahora mismo.
UPDATE public.profiles p
   SET points = (SELECT coins FROM house_account WHERE id = 1)
 WHERE p.opera_casa;

GRANT EXECUTE ON FUNCTION public.saldo_de(uuid)            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.casa_estado()             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.casa_editar(bigint, text) TO authenticated;
-- mover_saldo y los disparadores NO se exponen: solo los llama el servidor.
-- Si se pudieran llamar desde el navegador, cualquiera se regalaria coins.
REVOKE ALL ON FUNCTION public.mover_saldo(uuid, bigint, text)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.casa_redirigir_saldo()           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.casa_espejo()                    FROM PUBLIC, anon, authenticated;

SELECT casa_estado() AS estado_de_la_casa;

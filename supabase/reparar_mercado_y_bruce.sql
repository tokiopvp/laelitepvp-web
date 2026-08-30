-- ============================================================================
--  1) "function market_push(text, text, bigint) is not unique"
--  2) La cuenta Bruce Wayne pasa a manejarse desde el Discord unlimitedreal
-- ============================================================================
--  Se puede correr las veces que haga falta.
-- ----------------------------------------------------------------------------

-- ---------------------------------------------------------------- 1) MERCADO
--
--  QUE PASO
--  --------
--  `mercado_calibracion.sql` creo la version de CUATRO argumentos de
--  market_push, con el cuarto (p_fuerza) por defecto. Y borro la de TRES, justo
--  para que no quedaran las dos.
--
--  Pero despues se volvio a correr `economia.sql` (o `economia_v3.sql`), y
--  ese fichero vuelve a crear la de tres. Con las dos vivas, una llamada de
--  tres argumentos encaja en ambas y PostgreSQL se niega a elegir.
--
--  Por eso comprar y vender daba error: el pago llega hasta el final y muere
--  justo al mover la vela del mercado.
--
--  Se borra la de tres. La de cuatro la cubre con su valor por defecto, asi
--  que todas las llamadas de tres argumentos que hay por ahi siguen valiendo.
DROP FUNCTION IF EXISTS public.market_push(text, text, bigint);

-- Si alguna vez vuelve a aparecer, es que se re-corrio economia.sql: vuelve
-- a pegar este bloque y listo.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
   WHERE ns.nspname = 'public' AND p.proname = 'market_push';
  RAISE NOTICE 'market_push: % version(es) (tiene que ser 1)', n;
END $$;

-- ---------------------------------------------------------------- 2) BRUCE
--
--  El saldo de Bruce Wayne existe, pero su perfil no tenia ningun Discord
--  detras, asi que nadie podia gastarlo: el bot busca el perfil por
--  `discord_id` (bet_perfil) y sin el no hay apuesta posible.
--
--  Se le engancha la cuenta unlimitedreal (nombre global en Discord: "Bruce
--  Wayne", id 1262561071269412938). A partir de aqui ese Discord apuesta,
--  cobra y canjea CONTRA ese saldo, como cualquier otro jugador.
--
--  El id de Discord se libera de cualquier otro perfil antes: `bet_perfil`
--  hace LIMIT 1, asi que dos perfiles con el mismo Discord darian un saldo
--  distinto segun el humor del planificador.
UPDATE public.profiles
   SET discord_id = NULL
 WHERE discord_id = '1262561071269412938'
   AND id <> '669e4a7b-30dc-42b7-92c9-728fd67c3690';

UPDATE public.profiles
   SET discord_id = '1262561071269412938',
       updated_at = now()
 WHERE id = '669e4a7b-30dc-42b7-92c9-728fd67c3690';

SELECT id, username, display_name, discord_id, points AS saldo
  FROM public.profiles
 WHERE id = '669e4a7b-30dc-42b7-92c9-728fd67c3690';

-- ---------------------------------------------------- 3) TAREAS NUEVAS
--
--  Hasta ahora las tareas del clan solo miraban kills, headshots, K/D,
--  booyahs, partidas y max_kills, porque era lo unico que el censo sabia leer.
--
--  Ahora el censo entra al perfil y lee RESUMEN, TRAYECTORIA BR, DUELO DE
--  ESCUADRAS y ARMAS, asi que hay metricas que antes venian a cero y ya no:
--  punteria real, supervivencia, daño por partida, revividas, nivel y los
--  puntos de cada modo.
--
--  `claim_task` resuelve la metrica como `members ->> metrica`, o sea que
--  cualquier columna de `members` vale sin tocar una linea de codigo.
--
--  IDEA DEL REPARTO: las de porcentaje (punteria, supervivencia) premian JUGAR
--  BIEN; las de volumen (partidas, nivel) premian ESTAR. Las dos cosas
--  sostienen un clan, y pagar solo una de ellas expulsa a la mitad.
INSERT INTO tasks (titulo, descripcion, metrica, objetivo, coins, periodo, publico, nivel, icono, orden)
SELECT * FROM (VALUES
  -- Punteria de verdad: el % de headshots, no el total acumulado. Un jugador
  -- nuevo con buena mano puede ganar esta el primer dia.
  ('Ojo fino',          'Manten un 20% de headshots.',              'headshot_tasa',  20,    250,  'unica', 'clan', 4, '🎯', 30),
  ('Ojo de halcon',     'Manten un 35% de headshots.',              'headshot_tasa',  35,    900,  'unica', 'clan', 7, '🦅', 31),
  ('Cirujano',          'Manten un 50% de headshots.',              'headshot_tasa',  50,    3000, 'unica', 'clan', 10,'🔪', 32),

  -- Supervivencia: llegar al top 10 es otra habilidad distinta de matar.
  ('Superviviente',     'Termina en el top 10 el 40% de tus partidas.', 'top10_tasa',  40,    300,  'unica', 'clan', 4, '🛡️', 33),
  ('Ultimo en pie',     'Termina en el top 10 el 60% de tus partidas.', 'top10_tasa',  60,    1100, 'unica', 'clan', 8, '🪖', 34),

  -- Daño: premia al que aguanta el tiroteo aunque no se lleve la kill.
  ('Golpe seco',        'Promedia 800 de daño por partida.',        'dano_partida',   800,   280,  'unica', 'clan', 4, '💢', 35),
  ('Demoledor',         'Promedia 1.500 de daño por partida.',      'dano_partida',   1500,  1000, 'unica', 'clan', 7, '🧨', 36),

  -- Kills por partida: la version honesta del K/D, no la inflada por jugar poco.
  ('Constante',         'Promedia 3 kills por partida.',            'kpp',            3,     260,  'unica', 'clan', 4, '📈', 37),
  ('Devorador',         'Promedia 6 kills por partida.',            'kpp',            6,     1400, 'unica', 'clan', 8, '🦈', 38),

  -- Revividas: lo unico de esta lista que premia jugar PARA EL EQUIPO.
  ('Buen companero',    'Revive a tus companeros 50 veces.',        'revividas',      50,    200,  'unica', 'clan', 3, '🤝', 39),
  ('Medico de guerra',  'Revive a tus companeros 300 veces.',       'revividas',      300,   1200, 'unica', 'clan', 7, '🚑', 40),

  -- Victorias en proporcion, no en total.
  ('Ganador',           'Manten un 12% de victorias.',              'winrate',        12,    320,  'unica', 'clan', 5, '✌️', 41),
  ('Dominante',         'Manten un 25% de victorias.',              'winrate',        25,    1600, 'unica', 'clan', 9, '💪', 42),

  -- Constancia pura: no exige talento, solo estar. Es la rampa para el que
  -- empieza y todavia no puede optar a ninguna de las de arriba.
  ('Veterano',          'Llega al nivel 50.',                       'level',          50,    150,  'unica', 'clan', 2, '🎖️', 43),
  ('Vive aqui',         'Llega al nivel 70.',                       'level',          70,    600,  'unica', 'clan', 5, '🏅', 44),
  ('Kilometraje',       'Juega 3.000 partidas.',                    'partidas',       3000,  1400, 'unica', 'clan', 7, '🛣️', 45),

  -- Los puntos de cada modo: separan al que empuja ranked del que juega casual.
  ('Escalador BR',      'Alcanza 3.000 puntos en Battle Royale.',   'puntos_br',      3000,  500,  'unica', 'clan', 5, '⛰️', 46),
  ('Cima BR',           'Alcanza 5.000 puntos en Battle Royale.',   'puntos_br',      5000,  2200, 'unica', 'clan', 9, '🏔️', 47),
  ('Escuadra de acero', 'Alcanza 3.000 puntos en Duelo de Escuadras.','puntos_cs',    3000,  500,  'unica', 'clan', 5, '⚔️', 48),
  ('Rey del duelo',     'Alcanza 5.000 puntos en Duelo de Escuadras.','puntos_cs',    5000,  2200, 'unica', 'clan', 9, '👑', 49)
) AS v(titulo, descripcion, metrica, objetivo, coins, periodo, publico, nivel, icono, orden)
-- Sin esto, correr el fichero dos veces duplica las veinte tareas y la pagina
-- de Elite Coin se llena de parejas identicas.
WHERE NOT EXISTS (SELECT 1 FROM tasks t WHERE t.titulo = v.titulo);

SELECT count(*) AS tareas_activas FROM tasks WHERE activa;

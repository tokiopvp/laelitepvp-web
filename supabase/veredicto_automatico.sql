-- ============================================================================
--  VEREDICTO AUTOMATICO DE LOS DUELOS
-- ============================================================================
--
--  El bot de Discord ya lee la captura del combate y sabe quien gano. Para
--  poder pagar solo le falta UNA cosa: recordar que capturas ya cobraron.
--
--  Sin esto, el fraude mas facil que existe es reenviar la foto de una
--  victoria vieja en cada duelo nuevo. Guardando la huella (sha256) de la
--  imagen, la misma captura no puede cobrar dos veces jamas.
--
--  Es idempotente: se puede correr las veces que haga falta.
-- ----------------------------------------------------------------------------

alter table public.bets
  add column if not exists prueba_hash text;

comment on column public.bets.prueba_hash is
  'sha256 de la captura que resolvio el duelo. Impide que la misma imagen '
  'cobre dos veces.';

-- Se busca por huella en cada foto que llega, asi que el indice importa.
-- Parcial: solo los duelos que llegaron a pagarse tienen valor aqui.
create index if not exists bets_prueba_hash_idx
  on public.bets (prueba_hash)
  where prueba_hash is not null;

begin;
create table public.platform_checkout_attempts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 product_key text not null check(product_key in ('studio','fieldguide')),
 provider_product_id text not null,
 expected_cents integer not null check(expected_cents in (500,1900)),
 created_at timestamptz not null default now()
);
create index platform_attempts_user_created on public.platform_checkout_attempts(user_id,created_at desc);
create table public.platform_purchases (
 payment_id text primary key,
 attempt_id uuid not null unique references public.platform_checkout_attempts(id),
 user_id uuid not null references auth.users(id) on delete cascade,
 product_key text not null check(product_key in ('studio','fieldguide')),
 access_status text not null check(access_status in ('active','pending','revoked')),
 provider_status text not null,
 updated_at timestamptz not null default now()
);
create index platform_purchases_access on public.platform_purchases(user_id,product_key,access_status);
create table public.platform_workspace (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null default '{}'::jsonb check(jsonb_typeof(state)='object' and octet_length(state::text)<=1000000),
 updated_at timestamptz not null default now()
);
alter table public.platform_checkout_attempts enable row level security;
alter table public.platform_purchases enable row level security;
alter table public.platform_workspace enable row level security;
revoke all on public.platform_checkout_attempts,public.platform_purchases,public.platform_workspace from anon,authenticated;
grant select on public.platform_checkout_attempts,public.platform_purchases to authenticated;
grant select,insert,update on public.platform_workspace to authenticated;
grant all on public.platform_checkout_attempts,public.platform_purchases,public.platform_workspace to service_role;
create policy "Read own checkout attempts" on public.platform_checkout_attempts for select to authenticated using((select auth.uid())=user_id);
create policy "Read own purchases" on public.platform_purchases for select to authenticated using((select auth.uid())=user_id);
create policy "Read own paid workspace" on public.platform_workspace for select to authenticated using((select auth.uid())=user_id and exists(select 1 from public.platform_purchases p where p.user_id=(select auth.uid()) and p.product_key='studio' and p.access_status='active'));
create policy "Insert own paid workspace" on public.platform_workspace for insert to authenticated with check((select auth.uid())=user_id and exists(select 1 from public.platform_purchases p where p.user_id=(select auth.uid()) and p.product_key='studio' and p.access_status='active'));
create policy "Update own paid workspace" on public.platform_workspace for update to authenticated using((select auth.uid())=user_id and exists(select 1 from public.platform_purchases p where p.user_id=(select auth.uid()) and p.product_key='studio' and p.access_status='active')) with check((select auth.uid())=user_id and exists(select 1 from public.platform_purchases p where p.user_id=(select auth.uid()) and p.product_key='studio' and p.access_status='active'));
create function public.platform_record_payment(p_attempt_id uuid,p_payment_id text,p_access_status text,p_provider_status text) returns void language plpgsql security invoker set search_path='' as $$
declare a public.platform_checkout_attempts%rowtype;
begin
 select * into strict a from public.platform_checkout_attempts where id=p_attempt_id for update;
 insert into public.platform_purchases(payment_id,attempt_id,user_id,product_key,access_status,provider_status)
 values(p_payment_id,a.id,a.user_id,a.product_key,p_access_status,p_provider_status)
 on conflict(payment_id) do update set access_status=case when public.platform_purchases.access_status='revoked' then 'revoked' when public.platform_purchases.access_status='active' and excluded.access_status='pending' then 'active' else excluded.access_status end,provider_status=excluded.provider_status,updated_at=now()
 where public.platform_purchases.attempt_id=excluded.attempt_id;
end; $$;
revoke all on function public.platform_record_payment(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.platform_record_payment(uuid,text,text,text) to service_role;
commit;

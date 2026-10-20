begin;
create table public.site_pageviews(
 id bigint generated always as identity primary key,
 viewed_on date not null default (now() at time zone 'utc')::date,
 path text not null check(path in ('/','/products/first-product-fieldguide','/products/launchpad-studio','/fieldguide','/studio')),
 visitor_hash text not null check(visitor_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 unique(viewed_on,path,visitor_hash)
);
create index site_pageviews_date_path on public.site_pageviews(viewed_on,path);
alter table public.site_pageviews enable row level security;
revoke all on public.site_pageviews from anon,authenticated;
grant all on public.site_pageviews to service_role;

create function public.record_site_pageview(p_path text,p_visitor_hash text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_path not in ('/','/products/first-product-fieldguide','/products/launchpad-studio','/fieldguide','/studio') then raise exception 'Invalid path'; end if;
 if p_visitor_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid visitor token'; end if;
 insert into public.site_pageviews(viewed_on,path,visitor_hash)
 values((now() at time zone 'utc')::date,p_path,p_visitor_hash)
 on conflict(viewed_on,path,visitor_hash) do nothing;
end; $$;
revoke all on function public.record_site_pageview(text,text) from public,anon,authenticated;
grant execute on function public.record_site_pageview(text,text) to service_role;

create function public.get_site_analytics() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
  'total_visitors',count(distinct visitor_hash),
  'today_visitors',count(distinct visitor_hash) filter(where viewed_on=(now() at time zone 'utc')::date),
  'by_product',jsonb_build_object(
    'fieldguide',count(distinct visitor_hash) filter(where path in ('/products/first-product-fieldguide','/fieldguide')),
    'studio',count(distinct visitor_hash) filter(where path in ('/products/launchpad-studio','/studio'))
  )
 ) from public.site_pageviews;
$$;
revoke all on function public.get_site_analytics() from public,anon,authenticated;
grant execute on function public.get_site_analytics() to service_role;

create function public.get_product_sales_summary() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
  'studio',jsonb_build_object(
   'paid_sales',(select count(*) from public.platform_purchases where product_key='studio' and access_status='active'),
   'pending_sales',(select count(*) from public.platform_purchases where product_key='studio' and access_status='pending'),
   'revoked_sales',(select count(*) from public.platform_purchases where product_key='studio' and access_status='revoked'),
   'unknown_amount_sales',(select count(*) from public.platform_purchases where product_key='studio' and access_status='active' and amount_cents=0),
   'amounts',coalesce((select jsonb_object_agg(currency,total) from (select currency,sum(amount_cents) as total from public.platform_purchases where product_key='studio' and access_status='active' and amount_cents>0 group by currency) sums),'{}'::jsonb)
  ),
  'fieldguide',jsonb_build_object(
   'accesses',(select count(*) from public.platform_purchases where product_key='fieldguide' and access_status='active')
  )
 );
$$;
revoke all on function public.get_product_sales_summary() from public,anon,authenticated;
grant execute on function public.get_product_sales_summary() to service_role;
commit;

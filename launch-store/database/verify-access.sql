begin;
insert into auth.users(id,email,role,aud) values
 ('11111111-1111-4111-8111-111111111111','platform-test-a@example.invalid','authenticated','authenticated'),
 ('22222222-2222-4222-8222-222222222222','platform-test-b@example.invalid','authenticated','authenticated');
insert into public.platform_checkout_attempts(id,user_id,product_key,provider_product_id,expected_cents) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','studio','pdt_fixture_studio',1900),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','studio','pdt_fixture_studio',1900),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111','fieldguide','pdt_fixture_guide',500);
select public.platform_record_payment('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','pay_fixture_a','active','succeeded');
select public.platform_record_payment('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','pay_fixture_a','active','succeeded');
select public.platform_record_payment('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','pay_fixture_b','active','succeeded');
select public.platform_record_payment('cccccccc-cccc-4ccc-8ccc-cccccccccccc','pay_fixture_c','revoked','succeeded');
select public.platform_record_payment('cccccccc-cccc-4ccc-8ccc-cccccccccccc','pay_fixture_c','active','succeeded');
do $$begin
 if (select count(*) from public.platform_purchases where payment_id='pay_fixture_a')<>1 then raise exception 'Idempotency failed';end if;
 if (select access_status from public.platform_purchases where payment_id='pay_fixture_c')<>'revoked' then raise exception 'Revoked payment was reactivated';end if;
 if has_table_privilege('authenticated','public.platform_purchases','INSERT') then raise exception 'User can grant purchases';end if;
 if has_function_privilege('authenticated','public.platform_record_payment(uuid,text,text,text)','EXECUTE') then raise exception 'User can call payment writer';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
do $$begin
 if (select count(*) from public.platform_purchases)<>2 then raise exception 'Purchase ownership isolation failed';end if;
 if exists(select 1 from public.platform_purchases where user_id='22222222-2222-4222-8222-222222222222') then raise exception 'Other user purchase exposed';end if;
end $$;
insert into public.platform_workspace(user_id,state) values('11111111-1111-4111-8111-111111111111','{"audience":"Private test notes"}');
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
do $$begin
 if exists(select 1 from public.platform_workspace) then raise exception 'Other user notes exposed';end if;
end $$;
reset role;
select 'PASS: duplicate payment idempotency, terminal revocation, purchase write restrictions, own-order reads and private workspace RLS' as verification;
rollback;

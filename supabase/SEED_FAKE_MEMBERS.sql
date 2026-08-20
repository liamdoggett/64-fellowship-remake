-- Seed 100 fake members for CRM testing
-- Supabase → SQL Editor → paste → Run
-- Cleanup at bottom.

create extension if not exists pgcrypto;

do $$
declare
  r record;
  v_user_id uuid;
  v_email text;
  v_first text;
  v_last text;
  v_full text;
  v_church text;
  v_role text;
  v_completed text[];
  v_step int;
  v_started boolean;
  first_names text[] := array[
    'James','John','Robert','Michael','David','William','Richard','Joseph','Thomas','Charles',
    'Mary','Patricia','Jennifer','Linda','Elizabeth','Barbara','Susan','Jessica','Sarah','Karen',
    'Daniel','Matthew','Anthony','Mark','Donald','Steven','Paul','Andrew','Joshua','Kenneth',
    'Emily','Ashley','Melissa','Deborah','Stephanie','Rebecca','Sharon','Laura','Cynthia','Kathleen',
    'Brian','George','Timothy','Ronald','Edward','Jason','Jeffrey','Ryan','Jacob','Gary',
    'Amy','Angela','Anna','Brenda','Emma','Olivia','Chloe','Grace','Hannah','Natalie',
    'Nathan','Samuel','Benjamin','Christian','Patrick','Stephen','Jonathan','Justin','Brandon','Ethan',
    'Victoria','Rachel','Megan','Katherine','Christine','Debra','Maria','Heather','Diane','Julie',
    'Aaron','Adam','Alan','Albert','Alexander','Austin','Blake','Caleb','Cameron','Carlos',
    'Diana','Donna','Doris','Dorothy','Elena','Fiona','Gabriella','Helen','Irene','Isabella'
  ];
  last_names text[] := array[
    'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
    'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
    'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
    'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
    'Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts',
    'Gomez','Phillips','Evans','Turner','Diaz','Parker','Cruz','Edwards','Collins','Reyes',
    'Stewart','Morris','Morales','Murphy','Cook','Rogers','Gutierrez','Ortiz','Morgan','Cooper',
    'Peterson','Bailey','Reed','Kelly','Howard','Ramos','Kim','Cox','Ward','Richardson',
    'Watson','Brooks','Chavez','Wood','James','Bennett','Gray','Mendoza','Ruiz','Hughes',
    'Price','Alvarez','Castillo','Sanders','Patel','Myers','Long','Ross','Foster','Jimenez'
  ];
  churches text[] := array[
    'Grace Community Church','First Baptist Church','New Life Fellowship','Cornerstone Church',
    'Hope Community','Calvary Chapel','Trinity Fellowship','River of Life Church','Redeemer Church',
    'Faith Baptist','Harvest Church','City Light Church','Emmanuel Fellowship','Oak Grove Church',
    'Summit Church','Bridgeway Church','Living Water Church','Covenant Community','Pathway Church',
    'Northside Fellowship','Southgate Church','Hillcrest Baptist','Valley View Church','Crossroads Church'
  ];
  pathway text[] := array[
    'begin','praying-leader','conviction','community','capacity','guideposts','awakening'
  ];
begin
  for r in select generate_series(1, 100) as n loop
    v_email := format('fake.member.%s@example.test', lpad(r.n::text, 3, '0'));
    v_first := first_names[1 + ((r.n * 3 + 7) % array_length(first_names, 1))];
    v_last := last_names[1 + ((r.n * 5 + 11) % array_length(last_names, 1))];
    v_full := v_first || ' ' || v_last;
    v_church := churches[1 + ((r.n * 2) % array_length(churches, 1))];
    v_role := case when r.n % 2 = 0 then 'pastor' else 'disciple' end;
    v_completed := pathway[1:(r.n % 8)];
    v_started := (r.n % 8 > 0) or (r.n % 3 = 0);
    v_step := case
      when not v_started then 1
      when r.n % 8 = 0 then 7
      else least(7, (r.n % 8) + 1)
    end;

    select id into v_user_id from auth.users where email = v_email;

    if v_user_id is null then
      v_user_id := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        v_email,
        crypt('FakeMember123!', gen_salt('bf')),
        now() - make_interval(days => 101 - r.n),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object(
          'first_name', v_first,
          'last_name', v_last,
          'full_name', v_full,
          'church', v_church,
          'role', v_role,
          'email_verified', true
        ),
        now() - make_interval(days => 101 - r.n),
        now() - make_interval(days => 101 - r.n),
        '', '', '', ''
      );

      insert into auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) values (
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
        'email',
        v_user_id::text,
        now(),
        now() - make_interval(days => 101 - r.n),
        now()
      );
    end if;

    insert into public.profiles (
      id, email, first_name, last_name, full_name, church, role, created_at, updated_at
    ) values (
      v_user_id, v_email, v_first, v_last, v_full, v_church, v_role,
      now() - make_interval(days => 101 - r.n), now()
    )
    on conflict (id) do update set
      email = excluded.email,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      full_name = excluded.full_name,
      church = excluded.church,
      role = excluded.role,
      updated_at = now();

    insert into public.coaching_progress (
      user_id, started, completed, current_step, updated_at
    ) values (
      v_user_id, v_started, coalesce(v_completed, '{}'::text[]), v_step, now()
    )
    on conflict (user_id) do update set
      started = excluded.started,
      completed = excluded.completed,
      current_step = excluded.current_step,
      updated_at = now();
  end loop;
end $$;

-- Optional cleanup:
-- delete from auth.users where email like 'fake.member.%@example.test';

create table beta_testers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  product text not null,
  name text,
  subscribed_at timestamptz default now(),
  unsubscribed_at timestamptz,
  unique(email, product)
);

alter table beta_testers enable row level security;

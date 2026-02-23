-- Seed initial beta testers for Celiumn product

insert into beta_testers (email, product, name)
values
  ('beta1@celiumn.local', 'celiumn', 'Beta Tester One'),
  ('beta2@celiumn.local', 'celiumn', 'Beta Tester Two'),
  ('beta3@celiumn.local', 'celiumn', 'Beta Tester Three')
on conflict (email, product) do nothing;

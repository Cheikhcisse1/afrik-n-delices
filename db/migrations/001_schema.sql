-- Schéma initial Afrik'N'Délices by Diallo (PostgreSQL / Neon)

create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  full_name text not null check (char_length(full_name) between 2 and 80),
  phone text check (phone is null or char_length(phone) <= 20),
  role text not null default 'client' check (role in ('client', 'staff', 'admin')),
  token_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index users_email_key on users (lower(email));

create table password_resets (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index password_resets_user_idx on password_resets (user_id);

-- Compteur générique pour limiter les tentatives (connexion, contact, oubli de mot de passe…)
create table rate_events (
  id bigserial primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index rate_events_key_idx on rate_events (key, created_at);

create table categories (
  id serial primary key,
  name text not null unique check (char_length(name) between 2 and 60),
  position integer not null default 0
);

create table menu_items (
  id serial primary key,
  category_id integer not null references categories(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 80),
  description text check (description is null or char_length(description) <= 300),
  price_cents integer not null check (price_cents >= 0 and price_cents <= 100000),
  image_url text,
  available boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index menu_items_category_idx on menu_items (category_id, position);

-- Emplacements du camion : un jour de la semaine (0 = dimanche … 6 = samedi) par ligne
create table locations (
  id serial primary key,
  name text not null check (char_length(name) between 2 and 80),
  address text not null check (char_length(address) between 2 and 160),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time,
  end_time time,
  notes text check (notes is null or char_length(notes) <= 300),
  active boolean not null default true,
  check (start_time is null or end_time is null or start_time < end_time)
);

create table orders (
  id serial primary key,
  user_id uuid references users(id) on delete set null,
  location_id integer not null references locations(id) on delete restrict,
  pickup_date date not null,
  pickup_time time,
  status text not null default 'received'
    check (status in ('received', 'preparing', 'ready', 'collected', 'cancelled')),
  note text check (note is null or char_length(note) <= 300),
  customer_name text not null,
  customer_phone text,
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on orders (user_id, created_at desc);
create index orders_pickup_idx on orders (pickup_date, status);

create table order_items (
  id serial primary key,
  order_id integer not null references orders(id) on delete cascade,
  menu_item_id integer references menu_items(id) on delete set null,
  name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity between 1 and 50)
);
create index order_items_order_idx on order_items (order_id);

create table contact_messages (
  id serial primary key,
  name text not null check (char_length(name) between 2 and 80),
  email text not null check (char_length(email) <= 160),
  phone text check (phone is null or char_length(phone) <= 20),
  message text not null check (char_length(message) between 10 and 2000),
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

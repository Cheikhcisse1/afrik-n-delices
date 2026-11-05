-- Carte et emplacements relevés sur le panneau du camion (novembre 2026).
-- Les horaires ne figurent pas sur le panneau : ils restent vides et se règlent dans l'espace admin.

insert into categories (name, position) values
  ('Plats', 1),
  ('Poulet braisé', 2),
  ('Petites faims', 3),
  ('Boissons', 4);

insert into menu_items (category_id, name, description, price_cents, image_url, position) values
  ((select id from categories where name = 'Plats'), 'Barquette thiep', 'Riz cuit dans une sauce tomate, avec ses légumes.', 700, null, 1),
  ((select id from categories where name = 'Plats'), 'Barquette yassa', 'Oignons confits au citron, servi avec du riz.', 700, null, 2),
  ((select id from categories where name = 'Plats'), 'Formule', null, 1000, null, 3),
  ((select id from categories where name = 'Plats'), 'Banane plantain (petite)', null, 400, null, 4),
  ((select id from categories where name = 'Plats'), 'Banane plantain (grande)', null, 800, null, 5),

  ((select id from categories where name = 'Poulet braisé'), 'Poulet entier', null, 1000, null, 1),
  ((select id from categories where name = 'Poulet braisé'), 'Demi poulet', null, 500, null, 2),
  ((select id from categories where name = 'Poulet braisé'), '4 cuisses de poulet', null, 1000, null, 3),
  ((select id from categories where name = 'Poulet braisé'), 'Une cuisse de poulet', null, 300, null, 4),
  ((select id from categories where name = 'Poulet braisé'), '12 ailes de poulet', null, 1000, null, 5),
  ((select id from categories where name = 'Poulet braisé'), '8 pilons', null, 1000, null, 6),
  ((select id from categories where name = 'Poulet braisé'), 'Brochette', null, 200, null, 7),

  ((select id from categories where name = 'Petites faims'), 'Samoussa', 'À l''unité.', 100, null, 1),
  ((select id from categories where name = 'Petites faims'), 'Nem', 'À l''unité.', 100, null, 2),
  ((select id from categories where name = 'Petites faims'), 'Pastel', 'À l''unité.', 100, null, 3),

  ((select id from categories where name = 'Boissons'), 'Bissap', 'Jus de fleurs d''hibiscus.', 200, null, 1),
  ((select id from categories where name = 'Boissons'), 'Gingembre', 'Jus de gingembre.', 200, null, 2),
  ((select id from categories where name = 'Boissons'), 'Dégué', 'Dessert au mil et au lait caillé.', 200, null, 3);

insert into locations (name, address, day_of_week, notes) values
  ('Gare Les Boullereaux', 'Gare Les Boullereaux-Champigny, 94500 Champigny-sur-Marne', 2, null),
  ('Marché de Champigny', 'Marché de Champigny, 94500 Champigny-sur-Marne', 3, null),
  ('Gare Les Boullereaux', 'Gare Les Boullereaux-Champigny, 94500 Champigny-sur-Marne', 4, null);

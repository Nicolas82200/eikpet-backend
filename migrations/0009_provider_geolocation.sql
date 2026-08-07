-- 3.6 V3 : carte interactive geolocalisee des intervenants.
-- lat/lng nullables, remplis par geocodage de l'adresse (API Google Maps/Places)
-- quand une cle est configuree ; sinon la liste simple (V1/V2) reste inchangee.

ALTER TABLE providers
  ADD COLUMN latitude DECIMAL(10, 7) NULL AFTER address,
  ADD COLUMN longitude DECIMAL(10, 7) NULL AFTER latitude;

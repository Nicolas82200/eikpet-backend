-- Suppression de compte utilisateur : les documents restent la propriete du foyer,
-- pas de l'utilisateur qui les a uploades. Sans ce changement, supprimer un compte
-- ayant deja uploade un document echouerait avec une erreur de contrainte de cle
-- etrangere (fk_documents_uploaded_by etait en RESTRICT par defaut).

ALTER TABLE documents
  MODIFY COLUMN uploaded_by_user_id INT UNSIGNED NULL;

ALTER TABLE documents
  DROP FOREIGN KEY fk_documents_uploaded_by;

ALTER TABLE documents
  ADD CONSTRAINT fk_documents_uploaded_by FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

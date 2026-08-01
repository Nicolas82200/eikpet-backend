import { Module } from '@nestjs/common';
import { DocumentsRepository } from './documents.repository';

/**
 * Module leger ne fournissant que DocumentsRepository, sans le controller/Multer/AnimalsModule
 * du DocumentsModule complet. Permet a AnimalsModule et HouseholdsModule d'y acceder sans
 * creer de dependance circulaire.
 */
@Module({
  providers: [DocumentsRepository],
  exports: [DocumentsRepository],
})
export class DocumentsRepositoryModule {}

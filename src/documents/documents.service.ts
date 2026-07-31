import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { HouseholdsRepository } from '../households/households.repository';
import { AnimalsService } from '../animals/animals.service';
import {
  DocumentsRepository,
  type DocumentCategory,
} from './documents.repository';

export interface UploadedFileInfo {
  originalName: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly householdsRepository: HouseholdsRepository,
    private readonly animalsService: AnimalsService,
    private readonly documentsRepository: DocumentsRepository,
  ) {}

  async upload(
    userId: number,
    householdId: number,
    category: DocumentCategory,
    animalId: number | null,
    file: UploadedFileInfo,
  ) {
    await this.assertMember(userId, householdId);
    if (animalId !== null) {
      const animal = await this.animalsService.findAndAssertAccess(
        userId,
        animalId,
      );
      if (animal.householdId !== householdId) {
        throw new ForbiddenException("Cet animal n'appartient pas a ce foyer");
      }
    }
    return this.documentsRepository.create(householdId, {
      animalId,
      uploadedByUserId: userId,
      fileName: file.originalName,
      filePath: file.path,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      category,
    });
  }

  async listForHousehold(userId: number, householdId: number) {
    await this.assertMember(userId, householdId);
    return this.documentsRepository.findByHousehold(householdId);
  }

  async listForAnimal(userId: number, animalId: number) {
    await this.animalsService.findAndAssertAccess(userId, animalId);
    return this.documentsRepository.findByAnimal(animalId);
  }

  async delete(userId: number, documentId: number): Promise<void> {
    const document = await this.documentsRepository.findById(documentId);
    if (!document) {
      throw new NotFoundException('Document introuvable');
    }
    await this.assertMember(userId, document.householdId);
    await this.documentsRepository.delete(documentId);
    await unlink(document.filePath).catch(() => undefined);
  }

  private async assertMember(
    userId: number,
    householdId: number,
  ): Promise<void> {
    const isMember = await this.householdsRepository.isMember(
      householdId,
      userId,
    );
    if (!isMember) {
      throw new ForbiddenException("Vous n'appartenez pas a ce foyer");
    }
  }
}

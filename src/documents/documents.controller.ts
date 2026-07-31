import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('households/:householdId/documents')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', ParseIntPipe) householdId: number,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.upload(
      user.id,
      householdId,
      dto.category,
      dto.animalId ? parseInt(dto.animalId, 10) : null,
      {
        originalName: file.originalname,
        path: file.path,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    );
  }

  @Get('households/:householdId/documents')
  listForHousehold(
    @CurrentUser() user: AuthenticatedUser,
    @Param('householdId', ParseIntPipe) householdId: number,
  ) {
    return this.documentsService.listForHousehold(user.id, householdId);
  }

  @Get('animals/:animalId/documents')
  listForAnimal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('animalId', ParseIntPipe) animalId: number,
  ) {
    return this.documentsService.listForAnimal(user.id, animalId);
  }

  @Delete('documents/:id')
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.documentsService.delete(user.id, id);
  }
}

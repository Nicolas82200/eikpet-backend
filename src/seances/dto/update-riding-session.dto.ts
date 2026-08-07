import { PartialType } from '@nestjs/mapped-types';
import { CreateRidingSessionDto } from './create-riding-session.dto';

export class UpdateRidingSessionDto extends PartialType(
  CreateRidingSessionDto,
) {}

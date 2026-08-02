import { PartialType } from '@nestjs/mapped-types';
import { CreateBoardingDto } from './create-boarding.dto';

export class UpdateBoardingDto extends PartialType(CreateBoardingDto) {}

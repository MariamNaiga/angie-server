import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, Request, HttpException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import SearchDto from '../shared/dto/search.dto';
import { User } from './user.entity';
import { ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserListDto } from './dto/user-list.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import Email from '../crm/entities/email.entity';
import { Repository } from 'typeorm';
import { ResetPasswordDto } from './dto/reset-password.dto';

@UseGuards(JwtAuthGuard)
@ApiTags('Users')
@Controller('api/users')
export class UsersController {
  constructor(@InjectRepository(Email) 
              private readonly emailRepository: Repository<Email>,
              private readonly service: UsersService) {
  }

  @Get()
  async findAll(@Query() req: SearchDto): Promise<UserListDto[]> {
    return this.service.findAll(req);
  }

  @Post()
  async create(@Body()data: CreateUserDto): Promise<User> {
    const email = await this.emailRepository.findOne({ where: { contactId: data.contactId } });
    const toSave = new User();
    toSave.username = email.value;
    toSave.contactId = data.contactId ;
    toSave.password = data.password;
    toSave.roles = data.roles;
    toSave.hashPassword();
    return await this.service.create(toSave);
  }

  @Post('forgotPassword')
  async forgotPassword(@Body('email') email: string) {
    return this.service.forgotPassword(email);
  }

  @Put('resetPassword')
  async resetPassword(@Body() data: ResetPasswordDto) {
    return this.service.resetPassword(data.token, data.password);
  }
  
  @Put()
  async update(@Body()data: UpdateUserDto): Promise<UserListDto> {
    return await this.service.update(data);
  }
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<void> {
    await this.service.remove(id);
  }
}


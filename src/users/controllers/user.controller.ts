import { Body, Controller, Post, Put, Req, UseGuards } from '@nestjs/common';
import { UsersService } from '../users.service';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import Email from '../../crm/entities/email.entity';
import { ForgotPasswordResponseDto } from '../dto/forgot-password-response.dto';
import { ResetPasswordResponseDto } from '../dto/reset-password-response.dto';

@ApiTags("User")
@Controller('api/user')
export class UserController {
    constructor(@InjectRepository(Email)
                private readonly emailRepository: Repository<Email>,
                private readonly service: UsersService) {
    }

    @Post('forgotPassword')
    async forgotPassword(@Body('email') email: string): Promise<ForgotPasswordResponseDto> {
        return this.service.forgotPassword(email);
    }

    @UseGuards(JwtAuthGuard)
    @Put('resetPassword')
    async resetPassword(@Body("newPassword") newPassword: string, @Req() request: Request): Promise<ResetPasswordResponseDto> {
      const token = request.headers.authorization.replace('Bearer ', '');
      return this.service.resetPassword(token, newPassword);
    }    
}
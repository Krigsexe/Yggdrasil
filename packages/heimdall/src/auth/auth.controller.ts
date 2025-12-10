/**
 * Auth Controller
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { LoginDto, RegisterDto, RefreshDto, LogoutDto } from './dto/auth.dto.js';
import { User } from '@yggdrasil/shared';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto.email, dto.password);
    return { user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    const tokens = await this.authService.refresh(dto.refreshToken);
    return { tokens };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() dto: LogoutDto) {
    this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    return { user };
  }
}

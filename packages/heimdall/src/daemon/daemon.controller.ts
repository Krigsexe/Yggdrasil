/**
 * Daemon Controller
 *
 * REST API endpoints for controlling the Cognitive Daemon.
 * All control endpoints require superadmin authorization.
 *
 * "Le pouvoir exige la responsabilite."
 */

import { Controller, Get, Post, Body, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { DaemonService } from './daemon.service.js';
import { DaemonCommand, DaemonTaskType } from '@yggdrasil/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
  };
}

interface CommandBody {
  action: DaemonCommand['action'];
  email?: string; // For dev mode - pass email directly
}

interface AddTaskBody {
  type: DaemonTaskType;
  payload?: Record<string, unknown>;
  priority?: number;
}

@Controller('daemon')
export class DaemonController {
  constructor(private readonly daemon: DaemonService) {}

  /**
   * Get daemon status (public endpoint)
   */
  @Get('status')
  getStatus() {
    return {
      ...this.daemon.getStatus(),
      config: {
        superadminEmail: this.daemon.getSuperadminEmail(),
        cycleIntervalMs: this.daemon.getConfig().cycleIntervalMs,
      },
    };
  }

  /**
   * Get daemon events (public endpoint)
   */
  @Get('events')
  getEvents() {
    return {
      events: this.daemon.getEvents(),
    };
  }

  /**
   * Execute a daemon command (dev mode - accepts email in body)
   * In production, use the JWT-protected endpoints instead.
   */
  @Post('command')
  async executeCommand(@Body() body: CommandBody) {
    // Dev mode: accept email from body
    const email = body.email;
    if (!email) {
      throw new HttpException('Email requis pour les commandes daemon', HttpStatus.BAD_REQUEST);
    }

    // Check authorization
    if (!this.daemon.isAuthorized(email)) {
      throw new HttpException(
        `Non autorise. Seul ${this.daemon.getSuperadminEmail()} peut controler le daemon.`,
        HttpStatus.FORBIDDEN
      );
    }

    const command: DaemonCommand = {
      action: body.action,
      requestedBy: email,
      timestamp: new Date(),
    };

    const result = await this.daemon.executeCommand(command);

    if (!result.success) {
      throw new HttpException(result.message, HttpStatus.FORBIDDEN);
    }

    return {
      success: result.success,
      message: result.message,
      status: this.daemon.getStatus(),
    };
  }

  /**
   * Start the daemon (protected - superadmin only)
   */
  @UseGuards(JwtAuthGuard)
  @Post('start')
  async start(@Request() req: AuthenticatedRequest) {
    const command: DaemonCommand = {
      action: 'start',
      requestedBy: req.user.email,
      timestamp: new Date(),
    };

    const result = await this.daemon.executeCommand(command);

    if (!result.success) {
      throw new HttpException(result.message, HttpStatus.FORBIDDEN);
    }

    return {
      success: true,
      message: result.message,
      status: this.daemon.getStatus(),
    };
  }

  /**
   * Stop the daemon (protected - superadmin only)
   */
  @UseGuards(JwtAuthGuard)
  @Post('stop')
  async stop(@Request() req: AuthenticatedRequest) {
    const command: DaemonCommand = {
      action: 'stop',
      requestedBy: req.user.email,
      timestamp: new Date(),
    };

    const result = await this.daemon.executeCommand(command);

    if (!result.success) {
      throw new HttpException(result.message, HttpStatus.FORBIDDEN);
    }

    return {
      success: true,
      message: result.message,
      status: this.daemon.getStatus(),
    };
  }

  /**
   * Pause the daemon (protected - superadmin only)
   */
  @UseGuards(JwtAuthGuard)
  @Post('pause')
  async pause(@Request() req: AuthenticatedRequest) {
    const command: DaemonCommand = {
      action: 'pause',
      requestedBy: req.user.email,
      timestamp: new Date(),
    };

    const result = await this.daemon.executeCommand(command);

    if (!result.success) {
      throw new HttpException(result.message, HttpStatus.FORBIDDEN);
    }

    return {
      success: true,
      message: result.message,
      status: this.daemon.getStatus(),
    };
  }

  /**
   * Resume the daemon (protected - superadmin only)
   */
  @UseGuards(JwtAuthGuard)
  @Post('resume')
  async resume(@Request() req: AuthenticatedRequest) {
    const command: DaemonCommand = {
      action: 'resume',
      requestedBy: req.user.email,
      timestamp: new Date(),
    };

    const result = await this.daemon.executeCommand(command);

    if (!result.success) {
      throw new HttpException(result.message, HttpStatus.FORBIDDEN);
    }

    return {
      success: true,
      message: result.message,
      status: this.daemon.getStatus(),
    };
  }

  /**
   * Add a task to the queue (protected - superadmin only)
   */
  @UseGuards(JwtAuthGuard)
  @Post('task')
  async addTask(@Request() req: AuthenticatedRequest, @Body() body: AddTaskBody) {
    // Check authorization
    if (!this.daemon.isAuthorized(req.user.email)) {
      throw new HttpException(
        `Non autorise. Seul ${this.daemon.getSuperadminEmail()} peut ajouter des taches.`,
        HttpStatus.FORBIDDEN
      );
    }

    const task = await this.daemon.addTask(body.type, body.payload, body.priority || 5);

    return {
      success: true,
      task: {
        id: task.id,
        type: task.type,
        status: task.status,
        priority: task.priority,
        createdAt: task.createdAt,
      },
    };
  }

  /**
   * Clear the task queue (protected - superadmin only)
   */
  @UseGuards(JwtAuthGuard)
  @Post('clear-queue')
  async clearQueue(@Request() req: AuthenticatedRequest) {
    const command: DaemonCommand = {
      action: 'clear_queue',
      requestedBy: req.user.email,
      timestamp: new Date(),
    };

    const result = await this.daemon.executeCommand(command);

    if (!result.success) {
      throw new HttpException(result.message, HttpStatus.FORBIDDEN);
    }

    return {
      success: true,
      message: result.message,
    };
  }

  /**
   * Check if current user is authorized to control daemon
   */
  @UseGuards(JwtAuthGuard)
  @Get('authorized')
  checkAuthorized(@Request() req: AuthenticatedRequest) {
    return {
      authorized: this.daemon.isAuthorized(req.user.email),
      superadminEmail: this.daemon.getSuperadminEmail(),
      userEmail: req.user.email,
    };
  }
}

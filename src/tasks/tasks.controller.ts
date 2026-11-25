import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQuery } from './dto/list-tasks.query.dto';
import {
  ErrorResponseDto,
  ListTasksResponseDto,
  TaskResponseDto,
  TaskStatsResponseDto,
} from './dto/task-response.dto';
import { TasksService } from './tasks.service';

/**
 * HTTP qatlami: faqat so'rovni qabul qiladi va service'ga uzatadi.
 * Biznes-logika (qoidalar) TasksService ichida bo'lishi kerak.
 *
 * Bu faylning mantiqini o'zgartirmang. Faqat TODO(SWAGGER-2) da
 * Swagger dekoratorlarini (@ApiTags, @ApiOperation, @ApiResponse ...) qo'shasiz.
 */
@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  /** Yangi task: 201. Bir xil idempotencyKey qayta kelsa: mavjud task va 200. */
  @Post()
  @ApiOperation({ summary: 'Task yaratish (idempotent)' })
  @ApiCreatedResponse({ description: 'Yangi task yaratildi', type: TaskResponseDto })
  @ApiOkResponse({ description: 'Shu idempotencyKey bilan task allaqachon bor', type: TaskResponseDto })
  @ApiBadRequestResponse({ description: "Noto'g'ri ma'lumot", type: ErrorResponseDto })
  async create(@Body() dto: CreateTaskDto, @Res({ passthrough: true }) res: Response) {
    const { task, created } = await this.tasks.create(dto);
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return task;
  }

  // DIQQAT: 'stats' route'i ':id' dan OLDIN turishi kerak, aks holda "stats" ham id deb o'ylanadi.
  @Get('stats')
  @ApiOperation({ summary: "Statuslar bo'yicha statistika" })
  @ApiOkResponse({ type: TaskStatsResponseDto })
  stats() {
    return this.tasks.getStats();
  }

  @Get()
  @ApiOperation({ summary: "Tasklar ro'yxati (filtr + pagination)" })
  @ApiOkResponse({ type: ListTasksResponseDto })
  @ApiBadRequestResponse({ description: "Noto'g'ri query parametr", type: ErrorResponseDto })
  findAll(@Query() query: ListTasksQuery) {
    return this.tasks.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta task' })
  @ApiParam({ name: 'id', description: 'Task ID (uuid)', example: '3f1c2a9e-6b7d-4e2a-9c1f-1a2b3c4d5e6f' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiNotFoundResponse({ description: 'Task topilmadi', type: ErrorResponseDto })
  findOne(@Param('id') id: string) {
    return this.tasks.findOne(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Taskni bekor qilish (faqat PENDING)' })
  @ApiParam({ name: 'id', description: 'Task ID (uuid)', example: '3f1c2a9e-6b7d-4e2a-9c1f-1a2b3c4d5e6f' })
  @ApiOkResponse({ description: 'Bekor qilindi', type: TaskResponseDto })
  @ApiNotFoundResponse({ description: 'Task topilmadi', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Task PENDING emas', type: ErrorResponseDto })
  cancel(@Param('id') id: string) {
    return this.tasks.cancel(id);
  }
}

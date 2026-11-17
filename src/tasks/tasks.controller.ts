import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQuery } from './dto/list-tasks.query.dto';
import { TasksService } from './tasks.service';

/**
 * HTTP qatlami: faqat so'rovni qabul qiladi va service'ga uzatadi.
 * Biznes-logika (qoidalar) TasksService ichida bo'lishi kerak.
 *
 * Bu faylning mantiqini o'zgartirmang. Faqat TODO(SWAGGER-2) da
 * Swagger dekoratorlarini (@ApiTags, @ApiOperation, @ApiResponse ...) qo'shasiz.
 */
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  /** Yangi task: 201. Bir xil idempotencyKey qayta kelsa: mavjud task va 200. */
  @Post()
  async create(@Body() dto: CreateTaskDto, @Res({ passthrough: true }) res: Response) {
    const { task, created } = await this.tasks.create(dto);
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return task;
  }

  // DIQQAT: 'stats' route'i ':id' dan OLDIN turishi kerak, aks holda "stats" ham id deb o'ylanadi.
  @Get('stats')
  stats() {
    return this.tasks.getStats();
  }

  @Get()
  findAll(@Query() query: ListTasksQuery) {
    return this.tasks.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasks.findOne(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string) {
    return this.tasks.cancel(id);
  }
}

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQuery } from './dto/list-tasks.query.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  async create(@Body() dto: CreateTaskDto, @Res({ passthrough: true }) res: Response) {
    const { task, created } = await this.tasks.create(dto);
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return task;
  }

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

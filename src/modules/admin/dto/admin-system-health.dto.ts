import { ApiProperty } from '@nestjs/swagger';

export class DatabaseHealthDto {
  @ApiProperty({ example: 'connected' })
  status: string;

  @ApiProperty({ example: 4 })
  activeConnections?: number;

  @ApiProperty({ example: 'PostgreSQL' })
  type: string;
}

export class MemoryUsageDto {
  @ApiProperty({ example: '85 MB' })
  rss: string;

  @ApiProperty({ example: '42 MB' })
  heapTotal: string;

  @ApiProperty({ example: '35 MB' })
  heapUsed: string;

  @ApiProperty({ example: '25 MB' })
  external: string;
}

export class AdminSystemHealthDto {
  @ApiProperty({ example: 'healthy' })
  status: string;

  @ApiProperty({ example: 14520 })
  uptimeSeconds: number;

  @ApiProperty({ example: '4h 2m 0s' })
  uptimeFormatted: string;

  @ApiProperty({ example: 'v22.10.2' })
  nodeVersion: string;

  @ApiProperty({ example: 'darwin' })
  platform: string;

  @ApiProperty({ type: DatabaseHealthDto })
  database: DatabaseHealthDto;

  @ApiProperty({ type: MemoryUsageDto })
  memory: MemoryUsageDto;

  @ApiProperty({ example: '2026-09-29T02:30:00.000Z' })
  timestamp: Date;
}

export class SystemLogEntryDto {
  @ApiProperty({ example: 'req-uuid-1' })
  id: string;

  @ApiProperty({ example: 'INFO' })
  level: string;

  @ApiProperty({ example: 'Chat completion request fulfilled for user user-uuid-1' })
  message: string;

  @ApiProperty({ example: 'ChatService' })
  context: string;

  @ApiProperty({ example: '2026-09-29T02:30:00.000Z' })
  timestamp: Date;
}

export class AdminSystemLogsDto {
  @ApiProperty({ type: [SystemLogEntryDto] })
  logs: SystemLogEntryDto[];

  @ApiProperty({ example: 50 })
  total: number;
}

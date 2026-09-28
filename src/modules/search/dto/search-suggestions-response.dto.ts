import { ApiProperty } from '@nestjs/swagger';

export class SearchSuggestionsResponseDto {
  @ApiProperty({
    description: 'The query prefix used to generate suggestions',
    example: 'nest',
  })
  prefix: string;

  @ApiProperty({
    description: 'List of matching search suggestions',
    example: ['nestjs microservices', 'nestjs swagger documentation', 'nestjs auth jwt'],
    type: [String],
  })
  suggestions: string[];
}

export class RecentSearchesResponseDto {
  @ApiProperty({
    description: 'List of recent distinct search queries',
    example: ['Latest advancements in AI 2026', 'NestJS best practices', 'PostgreSQL indexing'],
    type: [String],
  })
  recentQueries: string[];
}

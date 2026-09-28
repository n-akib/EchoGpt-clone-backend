import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchResultItemDto {
  @ApiProperty({
    description: 'Title of the search result page',
    example: 'State of Artificial Intelligence in 2026',
  })
  title: string;

  @ApiProperty({
    description: 'URL of the web result',
    example: 'https://example.com/ai-2026',
  })
  url: string;

  @ApiProperty({
    description: 'Snippet / excerpt of content from the page',
    example: 'Comprehensive review of foundation models, multi-agent frameworks, and autonomous tooling...',
  })
  snippet: string;

  @ApiPropertyOptional({
    description: 'Domain or source name',
    example: 'example.com',
  })
  source?: string;

  @ApiPropertyOptional({
    description: 'Published date if available',
    example: '2026-09-15',
  })
  publishedDate?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { SearchResultItemDto } from './search-result-item.dto';

export class SearchResponseDto {
  @ApiProperty({
    description: 'The search query executed',
    example: 'Latest advancements in AI 2026',
  })
  query: string;

  @ApiProperty({
    description: 'Total number of results returned',
    example: 5,
  })
  totalResults: number;

  @ApiProperty({
    description: 'Array of search result items',
    type: [SearchResultItemDto],
  })
  results: SearchResultItemDto[];

  @ApiProperty({
    description: 'Whether the search result was served from cache',
    example: false,
  })
  cached: boolean;

  @ApiProperty({
    description: 'Timestamp of when the search was executed',
    example: '2026-09-29T02:30:00.000Z',
  })
  searchedAt: Date;
}

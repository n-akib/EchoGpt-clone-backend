import { ApiProperty } from '@nestjs/swagger';
import { SearchResultItemDto } from './search-result-item.dto';

export class SearchHistoryItemDto {
  @ApiProperty({
    description: 'Unique identifier of the search query record',
    example: 'd9b2d63d-a23b-486a-8b9a-7c9b0e352f20',
  })
  id: string;

  @ApiProperty({
    description: 'Search query string',
    example: 'Latest advancements in AI 2026',
  })
  query: string;

  @ApiProperty({
    description: 'Number of results saved with the search',
    example: 5,
  })
  resultsCount: number;

  @ApiProperty({
    description: 'Results recorded for this search',
    type: [SearchResultItemDto],
  })
  results: SearchResultItemDto[];

  @ApiProperty({
    description: 'Timestamp when search was created',
    example: '2026-09-29T02:30:00.000Z',
  })
  createdAt: Date;
}

export class SearchHistoryListDto {
  @ApiProperty({
    description: 'List of past searches',
    type: [SearchHistoryItemDto],
  })
  searches: SearchHistoryItemDto[];

  @ApiProperty({
    description: 'Total number of search history entries',
    example: 25,
  })
  total: number;
}

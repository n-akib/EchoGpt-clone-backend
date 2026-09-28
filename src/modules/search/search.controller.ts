import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResponseDto } from './dto/search-response.dto';
import {
  SearchHistoryItemDto,
  SearchHistoryListDto,
} from './dto/search-history-response.dto';
import {
  RecentSearchesResponseDto,
  SearchSuggestionsResponseDto,
} from './dto/search-suggestions-response.dto';

@ApiTags('Web Search')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute web search query',
    description: 'Searches the web for the specified query, utilizes results cache if available, and records search history for the user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results returned successfully',
    type: SearchResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid query input' })
  async search(
    @CurrentUser('id') userId: string,
    @Body() searchQueryDto: SearchQueryDto,
  ): Promise<SearchResponseDto> {
    return this.searchService.search(userId, searchQueryDto);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get search history',
    description: 'Returns chronological list of past search queries executed by the user.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'User search history list',
    type: SearchHistoryListDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getSearchHistory(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ): Promise<SearchHistoryListDto> {
    return this.searchService.getSearchHistory(
      userId,
      limit ? Number(limit) : 20,
      page ? Number(page) : 1,
    );
  }

  @Get('recent')
  @ApiOperation({
    summary: 'Get recent distinct searches',
    description: 'Returns list of unique search query strings recently searched by the user.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'List of recent search queries',
    type: RecentSearchesResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getRecentSearches(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
  ): Promise<RecentSearchesResponseDto> {
    return this.searchService.getRecentSearches(
      userId,
      limit ? Number(limit) : 10,
    );
  }

  @Get('suggestions')
  @ApiOperation({
    summary: 'Get search query autocomplete suggestions',
    description: 'Returns autocomplete suggestions matching the provided query prefix based on user history and topics.',
  })
  @ApiQuery({ name: 'q', required: true, type: String, example: 'nest' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  @ApiResponse({
    status: 200,
    description: 'Autocomplete suggestions',
    type: SearchSuggestionsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getSuggestions(
    @CurrentUser('id') userId: string,
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ): Promise<SearchSuggestionsResponseDto> {
    return this.searchService.getSuggestions(
      userId,
      query,
      limit ? Number(limit) : 5,
    );
  }

  @Delete('history/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a search history entry',
    description: 'Removes a specific search record from the user\'s history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search record deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Search history item deleted successfully' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Search record not found' })
  async deleteSearchHistoryItem(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.searchService.deleteSearchHistoryItem(userId, id);
  }

  @Delete('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear all search history',
    description: 'Deletes all search query history records for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'All search history cleared successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Search history cleared successfully' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async clearSearchHistory(
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string }> {
    return this.searchService.clearSearchHistory(userId);
  }
}

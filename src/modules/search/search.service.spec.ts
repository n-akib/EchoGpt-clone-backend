import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { SearchService } from './search.service';
import { WebSearch } from './entities/web-search.entity';

describe('SearchService', () => {
  let service: SearchService;
  let webSearchRepository: any;

  const mockUserId = 'user-uuid-123';
  const mockSearchEntity: WebSearch = {
    id: 'search-uuid-1',
    userId: mockUserId,
    query: 'nestjs swagger',
    resultsCount: 2,
    results: [
      {
        title: 'NestJS Swagger Guide',
        url: 'https://docs.nestjs.com/openapi/introduction',
        snippet: 'An OpenAPI (Swagger) module for NestJS framework',
      },
    ],
    createdAt: new Date('2026-09-29T00:00:00.000Z'),
    updatedAt: new Date('2026-09-29T00:00:00.000Z'),
    user: {} as any,
  };

  const createQueryBuilderMock = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([{ query: 'nestjs microservices' }]),
  };

  beforeEach(async () => {
    webSearchRepository = {
      create: jest.fn().mockImplementation((dto) => ({
        ...dto,
        id: 'search-uuid-generated',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findAndCount: jest.fn().mockResolvedValue([[mockSearchEntity], 1]),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([
        mockSearchEntity,
        { ...mockSearchEntity, id: 's2', query: 'nestjs swagger' },
        { ...mockSearchEntity, id: 's3', query: 'typescript tips' },
      ]),
      remove: jest.fn().mockResolvedValue(mockSearchEntity),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue(createQueryBuilderMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(WebSearch),
          useValue: webSearchRepository,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  afterEach(() => {
    service.clearCache();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should perform a web search, save the query to DB, and cache results', async () => {
      const result = await service.search(mockUserId, {
        query: 'Artificial Intelligence 2026',
        limit: 5,
      });

      expect(result).toBeDefined();
      expect(result.query).toBe('Artificial Intelligence 2026');
      expect(result.cached).toBe(false);
      expect(result.results.length).toBeGreaterThan(0);
      expect(webSearchRepository.create).toHaveBeenCalled();
      expect(webSearchRepository.save).toHaveBeenCalled();
    });

    it('should return cached results on subsequent identical queries', async () => {
      // First search populates cache
      const firstResult = await service.search(mockUserId, {
        query: 'Fast Caching Search',
        limit: 3,
      });
      expect(firstResult.cached).toBe(false);

      // Second search uses cache
      const secondResult = await service.search(mockUserId, {
        query: 'Fast Caching Search',
        limit: 3,
      });
      expect(secondResult.cached).toBe(true);
      expect(secondResult.results).toEqual(firstResult.results);
    });
  });

  describe('getSearchHistory', () => {
    it('should return paginated user search history', async () => {
      const history = await service.getSearchHistory(mockUserId, 10, 1);

      expect(history.total).toBe(1);
      expect(history.searches.length).toBe(1);
      expect(history.searches[0].query).toBe('nestjs swagger');
      expect(webSearchRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId },
          take: 10,
          skip: 0,
        }),
      );
    });
  });

  describe('deleteSearchHistoryItem', () => {
    it('should delete existing search item', async () => {
      webSearchRepository.findOne.mockResolvedValue(mockSearchEntity);

      const res = await service.deleteSearchHistoryItem(
        mockUserId,
        mockSearchEntity.id,
      );
      expect(res.message).toContain('deleted successfully');
      expect(webSearchRepository.remove).toHaveBeenCalledWith(mockSearchEntity);
    });

    it('should throw NotFoundException if item does not exist', async () => {
      webSearchRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteSearchHistoryItem(mockUserId, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('clearSearchHistory', () => {
    it('should delete all search records for user', async () => {
      const res = await service.clearSearchHistory(mockUserId);
      expect(res.message).toContain('cleared successfully');
      expect(webSearchRepository.delete).toHaveBeenCalledWith({
        userId: mockUserId,
      });
    });
  });

  describe('getRecentSearches', () => {
    it('should return deduplicated recent query strings', async () => {
      const recent = await service.getRecentSearches(mockUserId, 10);
      expect(recent.recentQueries).toEqual(['nestjs swagger', 'typescript tips']);
    });
  });

  describe('getSuggestions', () => {
    it('should return suggestions based on user history and common topics', async () => {
      const suggestions = await service.getSuggestions(mockUserId, 'nest', 5);
      expect(suggestions.prefix).toBe('nest');
      expect(suggestions.suggestions).toContain('nestjs microservices');
      expect(suggestions.suggestions.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty list for blank query prefix', async () => {
      const empty = await service.getSuggestions(mockUserId, '');
      expect(empty.suggestions).toEqual([]);
    });
  });
});

/**
 * Barrel export for all API contracts
 *
 * Usage:
 *   import { ProductDTO, ListProductsResponse } from '@shared/contracts';
 */
export { ProductDTO, ListProductsResponse } from './products.contract';

export { GenerationDTO, ListGenerationsResponse, TransformResponse } from './generations.contract';

export { QualityScoreDTO, CharacterCountsDTO, CopyVariationDTO, GenerateCopyResponse } from './copywriting.contract';

export {
  SourcesUsedDTO,
  IdeaBankSuggestionDTO,
  AnalysisStatusDTO,
  IdeaBankSuggestResponseDTO,
} from './ideaBank.contract';

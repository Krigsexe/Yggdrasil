/**
 * ODIN Bridge
 *
 * Connects to the ODIN maestro component.
 * The All-Father who sees all and validates all.
 *
 * ODIN is the final validation gate. Nothing exits YGGDRASIL
 * without ODIN's approval. Either 100% validated or rejected.
 */

import { Injectable } from '@nestjs/common';
import {
  ValidationResult,
  CouncilDeliberation,
  createLogger,
} from '@yggdrasil/shared';
import {
  ValidationService,
  AnchoringService,
  SynthesisService,
} from '@yggdrasil/odin';

const logger = createLogger('OdinBridge', 'info');

export interface ValidationInput {
  content: string;
  deliberation?: CouncilDeliberation;
  requestId: string;
  requireMimirAnchor?: boolean;
}

@Injectable()
export class OdinBridge {
  private readonly validation: ValidationService;

  constructor() {
    const anchoring = new AnchoringService();
    this.validation = new ValidationService(anchoring);
  }

  async validate(input: ValidationInput): Promise<ValidationResult> {
    logger.info('ODIN validation starting', {
      requestId: input.requestId,
      contentLength: input.content.length,
      hasDeliberation: !!input.deliberation,
      requireMimirAnchor: input.requireMimirAnchor,
    });

    const result = this.validation.validate({
      content: input.content,
      deliberation: input.deliberation,
      requestId: input.requestId,
      requireMimirAnchor: input.requireMimirAnchor,
    });

    logger.info('ODIN validation complete', {
      requestId: input.requestId,
      isValid: result.isValid,
      confidence: result.confidence,
      sourceCount: result.sources.length,
      decision: result.trace.finalDecision,
    });

    return result;
  }
}

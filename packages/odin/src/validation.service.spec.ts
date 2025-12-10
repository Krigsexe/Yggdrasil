/**
 * Validation Service Tests
 *
 * Tests for ODIN's core validation logic - the heart of YGGDRASIL's
 * Absolute Veracity pillar.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationService } from './validation.service.js';
import { AnchoringService } from './anchoring.service.js';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    const anchoring = new AnchoringService();
    service = new ValidationService(anchoring);
  });

  describe('Absolute Veracity Principle', () => {
    it('should reject content without source anchoring', () => {
      const result = service.validate({
        content: 'Unverifiable claim without any sources',
        requestId: 'test-request-1',
      });

      expect(result.isValid).toBe(false);
      expect(result.rejectionReason).toBe('NO_SOURCE');
    });

    it('should provide rejection reasons', () => {
      const result = service.validate({
        content: 'Content that fails validation',
        requestId: 'test-request-2',
      });

      if (!result.isValid) {
        expect(result.rejectionReason).toBeDefined();
      }
    });
  });

  describe('Confidence Levels', () => {
    it('should only accept 100% confidence for approval', () => {
      const result = service.validate({
        content: 'Claim requiring 100% confidence',
        requestId: 'test-request-3',
      });

      // Without verified sources, should be rejected
      if (result.isValid) {
        expect(result.confidence).toBe(100);
      } else {
        expect(result.rejectionReason).toBeDefined();
      }
    });

    it('should allow bypassing MIMIR anchor requirement', () => {
      const result = service.validate({
        content: 'Content without MIMIR anchor requirement',
        requestId: 'test-request-4',
        requireMimirAnchor: false,
      });

      // With requireMimirAnchor: false, may pass even without sources
      expect(result).toBeDefined();
    });
  });

  describe('Validation Trace', () => {
    it('should provide complete validation trace', () => {
      const result = service.validate({
        content: 'Content to trace',
        requestId: 'test-request-5',
      });

      expect(result.trace).toBeDefined();
      expect(result.trace.steps).toBeDefined();
      expect(Array.isArray(result.trace.steps)).toBe(true);
      expect(result.trace.steps.length).toBeGreaterThan(0);

      // Each step should have required fields
      result.trace.steps.forEach((step) => {
        expect(step.stepNumber).toBeDefined();
        expect(step.action).toBeDefined();
        expect(step.result).toBeDefined();
      });
    });

    it('should include timestamp in trace steps', () => {
      const result = service.validate({
        content: 'Content with timestamp',
        requestId: 'test-request-6',
      });

      result.trace.steps.forEach((step) => {
        expect(step.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should include processing time in trace', () => {
      const result = service.validate({
        content: 'Content for timing',
        requestId: 'test-request-7',
      });

      expect(result.trace.processingTimeMs).toBeDefined();
      expect(result.trace.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Validation Result Structure', () => {
    it('should have correct structure for approved result', () => {
      // Approval requires sources, so test structure with bypassed requirement
      const result = service.validate({
        content: 'Test content',
        requestId: 'test-structure-1',
        requireMimirAnchor: false,
      });

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('sources');
      expect(result).toHaveProperty('trace');
    });

    it('should have correct structure for rejected result', () => {
      const result = service.validate({
        content: 'Test content without sources',
        requestId: 'test-structure-2',
      });

      expect(result.isValid).toBe(false);
      expect(result).toHaveProperty('rejectionReason');
      expect(result).toHaveProperty('trace');
      expect(result.trace.finalDecision).toBe('REJECTED');
    });
  });

  describe('ODIN Version Tracking', () => {
    it('should include ODIN version in trace', () => {
      const result = service.validate({
        content: 'Version check content',
        requestId: 'test-version-1',
      });

      expect(result.trace.odinVersion).toBeDefined();
      expect(typeof result.trace.odinVersion).toBe('string');
    });
  });
});

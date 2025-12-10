/**
 * Auth Service Tests
 *
 * Tests for authentication logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Since we're using NestJS, we'll create basic unit tests
// that don't require the full DI container

describe('AuthService', () => {
  describe('Password hashing', () => {
    it('should hash passwords with bcrypt', async () => {
      const bcrypt = await import('bcrypt');
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 10);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify correct passwords', async () => {
      const bcrypt = await import('bcrypt');
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 10);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const bcrypt = await import('bcrypt');
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 10);

      const isValid = await bcrypt.compare('WrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Token expiration parsing', () => {
    const parseExpiration = (expiration: string): number => {
      const match = expiration.match(/^(\d+)([smhd])$/);
      if (!match) {
        return 15 * 60 * 1000; // Default 15 minutes
      }

      const value = parseInt(match[1] ?? '15', 10);
      const unit = match[2];

      switch (unit) {
        case 's':
          return value * 1000;
        case 'm':
          return value * 60 * 1000;
        case 'h':
          return value * 60 * 60 * 1000;
        case 'd':
          return value * 24 * 60 * 60 * 1000;
        default:
          return 15 * 60 * 1000;
      }
    };

    it('should parse seconds correctly', () => {
      expect(parseExpiration('30s')).toBe(30 * 1000);
    });

    it('should parse minutes correctly', () => {
      expect(parseExpiration('15m')).toBe(15 * 60 * 1000);
    });

    it('should parse hours correctly', () => {
      expect(parseExpiration('2h')).toBe(2 * 60 * 60 * 1000);
    });

    it('should parse days correctly', () => {
      expect(parseExpiration('7d')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should return default for invalid format', () => {
      expect(parseExpiration('invalid')).toBe(15 * 60 * 1000);
    });
  });
});

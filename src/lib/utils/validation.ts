/**
 * Validation utilities for recipe management system
 *
 * This module provides reusable validation functions for recipes,
 * item IDs, and other Minecraft-related data.
 */

/**
 * Validates a recipe or namespace name format
 * Valid: lowercase letters, numbers, underscores, hyphens only
 */
export function isValidMinecraftIdentifier(name: string): boolean {
  const pattern = /^[a-z0-9_\-]+$/;
  return pattern.test(name);
}

/**
 * Validates an item ID format (namespace:item_name)
 * Returns validation result with optional warning message
 */
export interface ItemIdValidation {
  valid: boolean;
  warning?: string;
}

export function validateItemId(itemId: string): ItemIdValidation {
  if (!itemId || !itemId.trim()) {
    return { valid: true }; // Empty is handled by required field validation
  }

  const namespacePattern = /^[a-z0-9_\-]+:[a-z0-9_\-\/\.]+$/;

  if (!namespacePattern.test(itemId)) {
    // Check if it looks like they forgot the namespace
    if (!itemId.includes(':')) {
      return {
        valid: false,
        warning: 'Item ID should include a namespace (e.g., "minecraft:diamond" or "custom:my_item")',
      };
    }

    // Check for invalid characters
    return {
      valid: false,
      warning: 'Item ID can only contain lowercase letters, numbers, underscores, hyphens, slashes, and dots',
    };
  }

  // Warn if using non-minecraft namespace (not an error, just a warning)
  const namespace = itemId.split(':')[0];
  if (namespace !== 'minecraft' && namespace !== 'custom') {
    return {
      valid: true,
      warning: `Using custom namespace "${namespace}". Make sure this mod is installed on your server.`,
    };
  }

  return { valid: true };
}

/**
 * Validates numeric ranges for recipe values
 */
export interface NumericRangeValidation {
  valid: boolean;
  error?: string;
}

export function validateResultCount(count: number): NumericRangeValidation {
  if (!Number.isInteger(count)) {
    return { valid: false, error: 'Count must be a whole number' };
  }
  if (count < 1 || count > 64) {
    return { valid: false, error: 'Count must be between 1 and 64' };
  }
  return { valid: true };
}

export function validateExperience(experience: number): NumericRangeValidation {
  if (isNaN(experience)) {
    return { valid: false, error: 'Experience must be a valid number' };
  }
  if (experience < 0 || experience > 100) {
    return { valid: false, error: 'Experience must be between 0 and 100' };
  }
  return { valid: true };
}

export function validateCookingTime(cookingTime: number): NumericRangeValidation {
  if (!Number.isInteger(cookingTime)) {
    return { valid: false, error: 'Cooking time must be a whole number (in ticks)' };
  }
  if (cookingTime <= 0) {
    return { valid: false, error: 'Cooking time must be greater than 0' };
  }
  if (cookingTime > 72000) {
    return { valid: false, error: 'Cooking time cannot exceed 72000 ticks (1 hour)' };
  }
  return { valid: true };
}

/**
 * Validates a crafting pattern
 */
export interface PatternValidation {
  valid: boolean;
  error?: string;
}

export function validateCraftingPattern(pattern: string[]): PatternValidation {
  if (!Array.isArray(pattern)) {
    return { valid: false, error: 'Pattern must be an array' };
  }

  if (pattern.length === 0) {
    return { valid: false, error: 'Pattern cannot be empty' };
  }

  if (pattern.length > 3) {
    return { valid: false, error: 'Pattern can have a maximum of 3 rows' };
  }

  const hasContent = pattern.some(row => row && row.trim().length > 0);
  if (!hasContent) {
    return { valid: false, error: 'Pattern cannot be empty - at least one row must have content' };
  }

  for (let i = 0; i < pattern.length; i++) {
    const row = pattern[i];
    if (typeof row !== 'string') {
      return { valid: false, error: `Pattern row ${i + 1} must be a string` };
    }
    if (row.length > 3) {
      return { valid: false, error: `Pattern row ${i + 1} cannot exceed 3 characters` };
    }
  }

  return { valid: true };
}

/**
 * Constants for validation limits
 */
export const VALIDATION_LIMITS = {
  RESULT_COUNT_MIN: 1,
  RESULT_COUNT_MAX: 64,
  EXPERIENCE_MIN: 0,
  EXPERIENCE_MAX: 100,
  COOKING_TIME_MIN: 1,
  COOKING_TIME_MAX: 72000, // 1 hour in ticks
  PATTERN_ROWS_MAX: 3,
  PATTERN_ROW_LENGTH_MAX: 3,
  SHAPELESS_INGREDIENTS_MIN: 1,
  SHAPELESS_INGREDIENTS_MAX: 9,
  NAME_MAX_LENGTH: 255,
} as const;

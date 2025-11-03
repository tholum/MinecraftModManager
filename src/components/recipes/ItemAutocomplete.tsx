'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { MinecraftItem } from '@/types/recipe.types';

interface ItemAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}

/**
 * Validates if an item ID follows the Minecraft namespaced ID format
 *
 * Valid format: namespace:item_name (e.g., minecraft:diamond, custom:my_item)
 * - namespace: lowercase letters, numbers, underscores, hyphens
 * - item_name: lowercase letters, numbers, underscores, hyphens, slashes, dots
 *
 * @param itemId - The item ID to validate
 * @returns Object with valid flag and optional warning message
 */
function validateItemIdFormat(itemId: string): { valid: boolean; warning?: string } {
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

export default function ItemAutocomplete({
  value,
  onChange,
  label,
  error = false,
  helperText = '',
  disabled = false,
}: ItemAutocompleteProps) {
  const [items, setItems] = useState<MinecraftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  // Validate item ID format when value changes
  useEffect(() => {
    if (value) {
      const validation = validateItemIdFormat(value);
      setValidationWarning(validation.warning || null);
    } else {
      setValidationWarning(null);
    }
  }, [value]);

  const fetchItems = useCallback(async (search: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/minecraft/items?search=${encodeURIComponent(search)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced fetch
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputValue.length >= 2) {
        fetchItems(inputValue);
      } else {
        setItems([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [inputValue, fetchItems]);

  return (
    <Box>
      <Autocomplete
        value={value}
        onChange={(event, newValue) => {
          onChange(newValue || '');
        }}
        inputValue={inputValue}
        onInputChange={(event, newInputValue) => {
          setInputValue(newInputValue);
        }}
        options={items.map((item) => item.id)}
        freeSolo
        loading={loading}
        disabled={disabled}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={error}
            helperText={helperText}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => {
          const item = items.find((i) => i.id === option);
          return (
            <Box component="li" {...props} key={option}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {item?.iconUrl && (
                  <img
                    src={item.iconUrl}
                    alt={option}
                    style={{ width: 24, height: 24, objectFit: 'contain' }}
                  />
                )}
                <Box>
                  <Box sx={{ fontWeight: 500 }}>
                    {item?.displayName || option}
                  </Box>
                  <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {option}
                  </Box>
                </Box>
              </Box>
            </Box>
          );
        }}
      />
      {validationWarning && (
        <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
          {validationWarning}
        </Alert>
      )}
    </Box>
  );
}

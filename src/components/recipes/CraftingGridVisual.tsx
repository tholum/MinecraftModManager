'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from '@mui/material';
import { Clear as ClearIcon } from '@mui/icons-material';
import ItemAutocomplete from './ItemAutocomplete';

/**
 * Props for the CraftingGridVisual component
 * @property pattern - Array of 3 strings representing the 3x3 crafting grid pattern
 * @property keyMap - Mapping of pattern characters to item IDs
 * @property onChange - Callback when pattern or keyMap changes
 */
interface CraftingGridVisualProps {
  pattern: string[];
  keyMap: Record<string, { item: string }>;
  onChange: (pattern: string[], keyMap: Record<string, { item: string }>) => void;
}

export default function CraftingGridVisual({
  pattern,
  keyMap,
  onChange,
}: CraftingGridVisualProps) {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tempItem, setTempItem] = useState('');

  // Ensure pattern is always 3x3
  const normalizedPattern = [
    pattern[0] || '   ',
    pattern[1] || '   ',
    pattern[2] || '   ',
  ].map(row => row.padEnd(3, ' '));

  const handleCellClick = (row: number, col: number) => {
    const char = normalizedPattern[row][col];
    const currentItem = char === ' ' ? '' : (keyMap[char]?.item || '');
    setSelectedCell({ row, col });
    setTempItem(currentItem);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (selectedCell === null) return;

    const { row, col } = selectedCell;
    let newPattern = [...normalizedPattern];
    let newKeyMap = { ...keyMap };

    if (!tempItem) {
      // Clear the cell
      const rowArray = newPattern[row].split('');
      rowArray[col] = ' ';
      newPattern[row] = rowArray.join('');
    } else {
      // Find existing key for this item
      let existingKey = Object.keys(newKeyMap).find(
        (key) => newKeyMap[key].item === tempItem
      );

      // If no existing key, find a new one
      if (!existingKey) {
        const usedKeys = new Set(Object.keys(newKeyMap));
        const availableKeys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#@*+=-'.split('');
        existingKey = availableKeys.find((k) => !usedKeys.has(k)) || 'X';
        newKeyMap[existingKey] = { item: tempItem };
      }

      // Set the cell to the key
      const rowArray = newPattern[row].split('');
      rowArray[col] = existingKey;
      newPattern[row] = rowArray.join('');
    }

    // Clean up unused keys
    const usedKeys = new Set(
      newPattern.flatMap((row) => row.split('')).filter((c) => c !== ' ')
    );
    Object.keys(newKeyMap).forEach((key) => {
      if (!usedKeys.has(key)) {
        delete newKeyMap[key];
      }
    });

    // Remove trailing empty rows and columns
    while (newPattern.length > 0 && newPattern[newPattern.length - 1].trim() === '') {
      newPattern.pop();
    }

    onChange(newPattern, newKeyMap);
    setDialogOpen(false);
    setSelectedCell(null);
  };

  const handleClear = () => {
    setTempItem('');
  };

  const getItemForCell = (row: number, col: number): string => {
    const char = normalizedPattern[row][col];
    if (char === ' ') return '';
    return keyMap[char]?.item || '';
  };

  return (
    <>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Crafting Pattern (3x3 Grid)
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Click a cell to set or change the item
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1,
              maxWidth: 400,
            }}
          >
            {[0, 1, 2].map((row) =>
              [0, 1, 2].map((col) => {
                const item = getItemForCell(row, col);
                return (
                  <Box
                    key={`${row}-${col}`}
                    onClick={() => handleCellClick(row, col)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Crafting grid cell ${row + 1}, ${col + 1}${item ? `: ${item}` : ': empty'}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleCellClick(row, col);
                      }
                    }}
                    sx={{
                      aspectRatio: '1',
                      border: 2,
                      borderColor: 'divider',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      bgcolor: item ? 'action.hover' : 'background.paper',
                      '&:hover': {
                        bgcolor: 'action.selected',
                      },
                      p: 1,
                      transition: 'background-color 0.2s',
                      position: 'relative',
                    }}
                  >
                    {item ? (
                      <Typography
                        variant="caption"
                        sx={{
                          wordBreak: 'break-word',
                          textAlign: 'center',
                          fontSize: '0.65rem',
                          lineHeight: 1.2,
                        }}
                      >
                        {item.replace('minecraft:', '')}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        +
                      </Typography>
                    )}
                  </Box>
                );
              })
            )}
          </Box>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Set Item for Cell
            {tempItem && (
              <IconButton size="small" onClick={handleClear} title="Clear item">
                <ClearIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <ItemAutocomplete
              value={tempItem}
              onChange={setTempItem}
              label="Item ID"
              helperText="Type to search for items or enter a custom ID"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

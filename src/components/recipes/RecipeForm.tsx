'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Box,
  Alert,
  IconButton,
  CircularProgress,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import ItemAutocomplete from './ItemAutocomplete';
import CraftingGridVisual from './CraftingGridVisual';
import {
  Recipe,
  RecipeType,
  CraftingShapedData,
  CraftingShapelessData,
  CookingData,
  StonecuttingData,
  SmithingTransformData,
} from '@/types/recipe.types';
import { getTemplatesByType, getTemplateById } from '@/lib/constants/recipeTemplates';

interface RecipeFormProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  recipe?: Recipe;
  serverId: number;
}

export default function RecipeForm({
  open,
  onClose,
  onSave,
  recipe,
  serverId,
}: RecipeFormProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Template selection
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Basic info
  const [name, setName] = useState('');
  const [namespace, setNamespace] = useState('custom');
  const [recipeType, setRecipeType] = useState<RecipeType>(RecipeType.CRAFTING_SHAPED);

  // Result
  const [resultItem, setResultItem] = useState('');
  const [resultCount, setResultCount] = useState(1);

  // Crafting Shaped
  const [pattern, setPattern] = useState<string[]>(['   ', '   ', '   ']);
  const [keyMap, setKeyMap] = useState<Record<string, { item: string }>>({});

  // Crafting Shapeless
  const [ingredients, setIngredients] = useState<string[]>(['']);

  // Cooking (smelting, blasting, smoking, campfire)
  const [cookingIngredient, setCookingIngredient] = useState('');
  const [experience, setExperience] = useState(0.1);
  const [cookingTime, setCookingTime] = useState(200);

  // Stonecutting
  const [stonecuttingIngredient, setStonecuttingIngredient] = useState('');

  // Smithing Transform
  const [smithingTemplate, setSmithingTemplate] = useState('');
  const [smithingBase, setSmithingBase] = useState('');
  const [smithingAddition, setSmithingAddition] = useState('');

  const resetForm = useCallback(() => {
    setSelectedTemplate('');
    setName('');
    setNamespace('custom');
    setRecipeType(RecipeType.CRAFTING_SHAPED);
    setPattern(['   ', '   ', '   ']);
    setKeyMap({});
    setIngredients(['']);
    setResultItem('');
    setResultCount(1);
    setCookingIngredient('');
    setExperience(0.1);
    setCookingTime(200);
    setStonecuttingIngredient('');
    setSmithingTemplate('');
    setSmithingBase('');
    setSmithingAddition('');
    setActiveTab(0);
    setError(null);
  }, []);

  const loadTemplateData = useCallback((templateId: string) => {
    if (!templateId) return;

    const template = getTemplateById(templateId);
    if (!template) return;

    const { recipeData } = template.template;

    // Set basic info
    setName(template.template.name);
    setNamespace(template.template.namespace);
    setRecipeType(template.recipeType);

    // Load recipe-type specific data
    switch (template.recipeType) {
      case RecipeType.CRAFTING_SHAPED:
        setPattern(recipeData.pattern);
        setKeyMap(recipeData.key);
        setResultItem(recipeData.result.item);
        setResultCount(recipeData.result.count || 1);
        break;

      case RecipeType.CRAFTING_SHAPELESS:
        setIngredients(recipeData.ingredients.map((i: any) => i.item));
        setResultItem(recipeData.result.item);
        setResultCount(recipeData.result.count || 1);
        break;

      case RecipeType.SMELTING:
      case RecipeType.BLASTING:
      case RecipeType.SMOKING:
      case RecipeType.CAMPFIRE_COOKING:
        setCookingIngredient(recipeData.ingredient.item);
        setResultItem(recipeData.result);
        setExperience(recipeData.experience || 0.1);
        setCookingTime(recipeData.cookingtime || 200);
        break;

      case RecipeType.STONECUTTING:
        setStonecuttingIngredient(recipeData.ingredient.item);
        setResultItem(recipeData.result);
        setResultCount(recipeData.count || 1);
        break;

      case RecipeType.SMITHING_TRANSFORM:
        setSmithingTemplate(recipeData.template.item);
        setSmithingBase(recipeData.base.item);
        setSmithingAddition(recipeData.addition.item);
        setResultItem(recipeData.result.item);
        break;
    }
  }, []);

  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setNamespace(recipe.namespace);
      setRecipeType(recipe.type);

      switch (recipe.type) {
        case RecipeType.CRAFTING_SHAPED:
          const shapedData = recipe.data as CraftingShapedData;
          setPattern(shapedData.pattern);
          setKeyMap(shapedData.key);
          setResultItem(shapedData.result.item);
          setResultCount(shapedData.result.count || 1);
          break;

        case RecipeType.CRAFTING_SHAPELESS:
          const shapelessData = recipe.data as CraftingShapelessData;
          setIngredients(shapelessData.ingredients.map(i => i.item));
          setResultItem(shapelessData.result.item);
          setResultCount(shapelessData.result.count || 1);
          break;

        case RecipeType.SMELTING:
        case RecipeType.BLASTING:
        case RecipeType.SMOKING:
        case RecipeType.CAMPFIRE_COOKING:
          const cookingData = recipe.data as CookingData;
          setCookingIngredient(cookingData.ingredient.item);
          setResultItem(cookingData.result);
          setExperience(cookingData.experience || 0.1);
          setCookingTime(cookingData.cookingtime || 200);
          break;

        case RecipeType.STONECUTTING:
          const stonecuttingData = recipe.data as StonecuttingData;
          setStonecuttingIngredient(stonecuttingData.ingredient.item);
          setResultItem(stonecuttingData.result);
          setResultCount(stonecuttingData.count || 1);
          break;

        case RecipeType.SMITHING_TRANSFORM:
          const smithingData = recipe.data as SmithingTransformData;
          setSmithingTemplate(smithingData.template.item);
          setSmithingBase(smithingData.base.item);
          setSmithingAddition(smithingData.addition.item);
          setResultItem(smithingData.result.item);
          break;
      }
    } else {
      resetForm();
    }
  }, [recipe, open, resetForm]);

  const handleAddIngredient = () => {
    setIngredients([...ingredients, '']);
  };

  const handleRemoveIngredient = (index: number) => {
    const newIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(newIngredients.length > 0 ? newIngredients : ['']);
  };

  const handleIngredientChange = (index: number, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = value;
    setIngredients(newIngredients);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      loadTemplateData(templateId);
    }
  };

  const handleRecipeTypeChange = (newType: RecipeType) => {
    setRecipeType(newType);
    // Reset template selection when recipe type changes
    setSelectedTemplate('');
  };

  const validateForm = (): string | null => {
    // Basic info validation
    if (!name.trim()) return 'Recipe name is required';

    // Validate recipe name format (no special characters that would break filenames)
    const namePattern = /^[a-z0-9_\-]+$/;
    if (!namePattern.test(name.trim())) {
      return 'Recipe name can only contain lowercase letters, numbers, underscores, and hyphens';
    }

    if (!namespace.trim()) return 'Namespace is required';

    // Validate namespace format
    if (!namePattern.test(namespace.trim())) {
      return 'Namespace can only contain lowercase letters, numbers, underscores, and hyphens';
    }

    if (!resultItem.trim()) return 'Result item is required';

    // Validate result count for applicable recipe types
    if (
      recipeType !== RecipeType.SMELTING &&
      recipeType !== RecipeType.BLASTING &&
      recipeType !== RecipeType.SMOKING &&
      recipeType !== RecipeType.CAMPFIRE_COOKING &&
      recipeType !== RecipeType.SMITHING_TRANSFORM
    ) {
      if (resultCount < 1 || resultCount > 64) {
        return 'Result count must be between 1 and 64';
      }
      if (!Number.isInteger(resultCount)) {
        return 'Result count must be a whole number';
      }
    }

    // Recipe-type specific validation
    switch (recipeType) {
      case RecipeType.CRAFTING_SHAPED:
        if (Object.keys(keyMap).length === 0) {
          return 'At least one ingredient is required in the crafting grid';
        }

        // Check that pattern is not all empty
        const hasPatternContent = pattern.some(row => row.trim().length > 0);
        if (!hasPatternContent) {
          return 'Crafting pattern cannot be empty - place at least one ingredient in the grid';
        }

        // Validate that all keys in pattern exist in keyMap
        const patternKeys = new Set<string>();
        pattern.forEach(row => {
          for (const char of row) {
            if (char !== ' ') {
              patternKeys.add(char);
            }
          }
        });

        for (const key of patternKeys) {
          if (!keyMap[key] || !keyMap[key].item.trim()) {
            return `Pattern uses key '${key}' but no ingredient is assigned to it`;
          }
        }
        break;

      case RecipeType.CRAFTING_SHAPELESS:
        const validIngredients = ingredients.filter(i => i.trim());
        if (validIngredients.length === 0) {
          return 'At least one ingredient is required for shapeless crafting';
        }
        if (validIngredients.length > 9) {
          return 'Shapeless crafting can have a maximum of 9 ingredients';
        }
        break;

      case RecipeType.SMELTING:
      case RecipeType.BLASTING:
      case RecipeType.SMOKING:
      case RecipeType.CAMPFIRE_COOKING:
        if (!cookingIngredient.trim()) return 'Ingredient is required for cooking recipes';

        // Validate experience (reasonable range)
        if (experience < 0 || experience > 100) {
          return 'Experience must be between 0 and 100';
        }
        if (isNaN(experience)) {
          return 'Experience must be a valid number';
        }

        // Validate cooking time (must be positive)
        if (cookingTime <= 0) {
          return 'Cooking time must be greater than 0';
        }
        if (!Number.isInteger(cookingTime)) {
          return 'Cooking time must be a whole number (in ticks)';
        }
        if (cookingTime > 72000) {
          return 'Cooking time cannot exceed 72000 ticks (1 hour)';
        }
        break;

      case RecipeType.STONECUTTING:
        if (!stonecuttingIngredient.trim()) return 'Ingredient is required for stonecutting';

        // Validate result count for stonecutting
        if (resultCount < 1 || resultCount > 64) {
          return 'Result count must be between 1 and 64';
        }
        if (!Number.isInteger(resultCount)) {
          return 'Result count must be a whole number';
        }
        break;

      case RecipeType.SMITHING_TRANSFORM:
        if (!smithingTemplate.trim()) return 'Template item is required for smithing';
        if (!smithingBase.trim()) return 'Base item is required for smithing';
        if (!smithingAddition.trim()) return 'Addition item is required for smithing';
        break;
    }

    return null;
  };

  const buildRecipeData = () => {
    switch (recipeType) {
      case RecipeType.CRAFTING_SHAPED:
        return {
          pattern: pattern.filter(row => row.trim()),
          key: keyMap,
          result: {
            item: resultItem,
            count: resultCount,
          },
        };

      case RecipeType.CRAFTING_SHAPELESS:
        return {
          ingredients: ingredients.filter(i => i.trim()).map(item => ({ item })),
          result: {
            item: resultItem,
            count: resultCount,
          },
        };

      case RecipeType.SMELTING:
      case RecipeType.BLASTING:
      case RecipeType.SMOKING:
      case RecipeType.CAMPFIRE_COOKING:
        return {
          ingredient: { item: cookingIngredient },
          result: resultItem,
          experience,
          cookingtime: cookingTime,
        };

      case RecipeType.STONECUTTING:
        return {
          ingredient: { item: stonecuttingIngredient },
          result: resultItem,
          count: resultCount,
        };

      case RecipeType.SMITHING_TRANSFORM:
        return {
          template: { item: smithingTemplate },
          base: { item: smithingBase },
          addition: { item: smithingAddition },
          result: { item: resultItem },
        };

      default:
        return {};
    }
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        name,
        namespace,
        type: recipeType,
        data: buildRecipeData(),
      };

      const url = recipe
        ? `/api/servers/${serverId}/recipes/${recipe.id}`
        : `/api/servers/${serverId}/recipes`;
      const method = recipe ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save recipe');
      }

      onSave();
      onClose();
      resetForm();
    } catch (err: any) {
      console.error('Error saving recipe:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderIngredientsTab = () => {
    switch (recipeType) {
      case RecipeType.CRAFTING_SHAPED:
        return (
          <Box sx={{ py: 2 }}>
            <CraftingGridVisual
              pattern={pattern}
              keyMap={keyMap}
              onChange={(newPattern, newKeyMap) => {
                setPattern(newPattern);
                setKeyMap(newKeyMap);
              }}
            />
          </Box>
        );

      case RecipeType.CRAFTING_SHAPELESS:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Ingredients (up to 9)
            </Typography>
            <Box sx={{ display: 'grid', gap: 2 }}>
              {ingredients.map((ingredient, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Box sx={{ flex: 1 }}>
                    <ItemAutocomplete
                      value={ingredient}
                      onChange={(value) => handleIngredientChange(index, value)}
                      label={`Ingredient ${index + 1}`}
                    />
                  </Box>
                  <IconButton
                    color="error"
                    onClick={() => handleRemoveIngredient(index)}
                    disabled={ingredients.length === 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              {ingredients.length < 9 && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddIngredient}
                >
                  Add Ingredient
                </Button>
              )}
            </Box>
          </Box>
        );

      case RecipeType.SMELTING:
      case RecipeType.BLASTING:
      case RecipeType.SMOKING:
      case RecipeType.CAMPFIRE_COOKING:
        return (
          <Box sx={{ py: 2, display: 'grid', gap: 2 }}>
            <ItemAutocomplete
              value={cookingIngredient}
              onChange={setCookingIngredient}
              label="Ingredient"
            />
            <TextField
              label="Experience"
              type="number"
              value={experience}
              onChange={(e) => setExperience(parseFloat(e.target.value))}
              inputProps={{ min: 0, step: 0.1 }}
              fullWidth
            />
            <TextField
              label="Cooking Time (ticks)"
              type="number"
              value={cookingTime}
              onChange={(e) => setCookingTime(parseInt(e.target.value))}
              inputProps={{ min: 1 }}
              fullWidth
              helperText="200 ticks = 10 seconds"
            />
          </Box>
        );

      case RecipeType.STONECUTTING:
        return (
          <Box sx={{ py: 2 }}>
            <ItemAutocomplete
              value={stonecuttingIngredient}
              onChange={setStonecuttingIngredient}
              label="Ingredient"
            />
          </Box>
        );

      case RecipeType.SMITHING_TRANSFORM:
        return (
          <Box sx={{ py: 2, display: 'grid', gap: 2 }}>
            <ItemAutocomplete
              value={smithingTemplate}
              onChange={setSmithingTemplate}
              label="Template"
              helperText="e.g., minecraft:netherite_upgrade_smithing_template"
            />
            <ItemAutocomplete
              value={smithingBase}
              onChange={setSmithingBase}
              label="Base Item"
              helperText="e.g., minecraft:diamond_sword"
            />
            <ItemAutocomplete
              value={smithingAddition}
              onChange={setSmithingAddition}
              label="Addition"
              helperText="e.g., minecraft:netherite_ingot"
            />
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {recipe ? 'Edit Recipe' : 'Create New Recipe'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab label="Basic Info" />
          <Tab label="Ingredients" />
          <Tab label="Result" />
        </Tabs>

        {/* Tab 0: Basic Info */}
        {activeTab === 0 && (
          <Box sx={{ py: 2, display: 'grid', gap: 2 }}>
            {!recipe && (
              <FormControl fullWidth>
                <InputLabel>Start from Template (Optional)</InputLabel>
                <Select
                  value={selectedTemplate}
                  label="Start from Template (Optional)"
                  onChange={(e) => handleTemplateChange(e.target.value)}
                >
                  <MenuItem value="">
                    <em>None - Start from scratch</em>
                  </MenuItem>
                  {getTemplatesByType(recipeType).map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name} - {template.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <TextField
              label="Recipe Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              helperText="e.g., custom_diamond_sword"
            />
            <TextField
              label="Namespace"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              required
              fullWidth
              helperText="e.g., custom, mymod (default: custom)"
            />
            <FormControl fullWidth required>
              <InputLabel>Recipe Type</InputLabel>
              <Select
                value={recipeType}
                label="Recipe Type"
                onChange={(e) => handleRecipeTypeChange(e.target.value as RecipeType)}
              >
                <MenuItem value={RecipeType.CRAFTING_SHAPED}>Crafting (Shaped)</MenuItem>
                <MenuItem value={RecipeType.CRAFTING_SHAPELESS}>Crafting (Shapeless)</MenuItem>
                <MenuItem value={RecipeType.SMELTING}>Smelting</MenuItem>
                <MenuItem value={RecipeType.BLASTING}>Blasting</MenuItem>
                <MenuItem value={RecipeType.SMOKING}>Smoking</MenuItem>
                <MenuItem value={RecipeType.CAMPFIRE_COOKING}>Campfire Cooking</MenuItem>
                <MenuItem value={RecipeType.STONECUTTING}>Stonecutting</MenuItem>
                <MenuItem value={RecipeType.SMITHING_TRANSFORM}>Smithing (Transform)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}

        {/* Tab 1: Ingredients */}
        {activeTab === 1 && renderIngredientsTab()}

        {/* Tab 2: Result */}
        {activeTab === 2 && (
          <Box sx={{ py: 2, display: 'grid', gap: 2 }}>
            <ItemAutocomplete
              value={resultItem}
              onChange={setResultItem}
              label="Result Item"
            />
            {recipeType !== RecipeType.SMELTING &&
              recipeType !== RecipeType.BLASTING &&
              recipeType !== RecipeType.SMOKING &&
              recipeType !== RecipeType.CAMPFIRE_COOKING &&
              recipeType !== RecipeType.SMITHING_TRANSFORM && (
                <TextField
                  label="Result Count"
                  type="number"
                  value={resultCount}
                  onChange={(e) => setResultCount(parseInt(e.target.value))}
                  inputProps={{ min: 1, max: 64 }}
                  fullWidth
                />
              )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {loading ? 'Saving...' : recipe ? 'Update Recipe' : 'Create Recipe'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

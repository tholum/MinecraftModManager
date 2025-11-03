'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as DeployIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import RecipeForm from './RecipeForm';
import { Recipe, RecipeType } from '@/types/recipe.types';

interface RecipeManagerProps {
  serverId: number;
}

export default function RecipeManager({ serverId }: RecipeManagerProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | undefined>(undefined);
  const [filterType, setFilterType] = useState<string>('all');
  const [deployLoading, setDeployLoading] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const fetchRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/servers/${serverId}/recipes`);
      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }
      const data = await response.json();
      setRecipes(data.recipes || []);
    } catch (err: any) {
      console.error('Error fetching recipes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const handleCreate = () => {
    setSelectedRecipe(undefined);
    setFormOpen(true);
  };

  const handleEdit = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setFormOpen(true);
  };

  const handleDelete = async (recipe: Recipe) => {
    if (!window.confirm(`Are you sure you want to delete the recipe "${recipe.namespace}:${recipe.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading(recipe.id);
      const response = await fetch(`/api/servers/${serverId}/recipes/${recipe.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete recipe');
      }

      setSuccess('Recipe deleted successfully');
      await fetchRecipes();
    } catch (err: any) {
      console.error('Error deleting recipe:', err);
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleEnabled = async (recipe: Recipe) => {
    try {
      setActionLoading(recipe.id);
      const response = await fetch(`/api/servers/${serverId}/recipes/${recipe.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !recipe.enabled }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update recipe');
      }

      await fetchRecipes();
    } catch (err: any) {
      console.error('Error toggling recipe:', err);
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeploy = async () => {
    try {
      setDeployLoading(true);
      setError(null);
      setSuccess(null);

      // Check if there are any enabled recipes
      const enabledCount = recipes.filter(r => r.enabled).length;
      if (enabledCount === 0) {
        setError('No enabled recipes to deploy. Please enable at least one recipe before deploying.');
        setDeployLoading(false);
        return;
      }

      const response = await fetch(`/api/servers/${serverId}/recipes/deploy`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to deploy recipes');
      }

      const data = await response.json();

      // Build a detailed success message
      let message = `Successfully deployed ${data.recipesDeployed || 0} enabled recipe(s) to datapack.`;

      // Add restart warning for NeoForge/Forge servers
      if (data.requiresRestart) {
        message += ' ⚠️ IMPORTANT: Please restart your server for the recipes to take effect. NeoForge/Forge servers require a full restart to load new datapacks.';
      }

      // Add reload information
      if (data.reload) {
        if (data.reload.success) {
          if (!data.requiresRestart) {
            message += ' Server recipes reloaded successfully.';
          }
          // Add warning if reload was executed but restart is still needed
          if (data.reload.warning) {
            message += ` ${data.reload.warning}`;
          }
        } else {
          // Server not running or reload failed - add helpful context
          if (data.reload.error) {
            message += ` Note: ${data.reload.error}`;
          }
        }
      }

      setSuccess(message);
    } catch (err: any) {
      console.error('Error deploying recipes:', err);
      setError(err.message);
    } finally {
      setDeployLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/servers/${serverId}/recipes/export`);
      if (!response.ok) {
        throw new Error('Failed to export recipes');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recipes-server-${serverId}-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('Recipes exported successfully');
    } catch (err: any) {
      console.error('Error exporting recipes:', err);
      setError(err.message);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;

    try {
      setActionLoading(-1);
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch(`/api/servers/${serverId}/recipes/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import recipes');
      }

      const data = await response.json();
      setSuccess(data.message || 'Recipes imported successfully');
      setImportDialogOpen(false);
      setImportFile(null);
      await fetchRecipes();
    } catch (err: any) {
      console.error('Error importing recipes:', err);
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getRecipeTypeLabel = (type: RecipeType): string => {
    const labels: Record<RecipeType, string> = {
      [RecipeType.CRAFTING_SHAPED]: 'Crafting (Shaped)',
      [RecipeType.CRAFTING_SHAPELESS]: 'Crafting (Shapeless)',
      [RecipeType.SMELTING]: 'Smelting',
      [RecipeType.BLASTING]: 'Blasting',
      [RecipeType.SMOKING]: 'Smoking',
      [RecipeType.CAMPFIRE_COOKING]: 'Campfire',
      [RecipeType.STONECUTTING]: 'Stonecutting',
      [RecipeType.SMITHING_TRANSFORM]: 'Smithing',
    };
    return labels[type] || type;
  };

  const getRecipeTypeColor = (type: RecipeType): 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' => {
    // Convert enum to string for comparison
    const typeStr = String(type).toLowerCase();
    if (typeStr.includes('crafting')) return 'primary';
    if (typeStr.includes('smelting') || typeStr.includes('blasting') || typeStr.includes('smoking')) return 'error';
    if (typeStr.includes('smithing')) return 'warning';
    return 'info';
  };

  const filteredRecipes = filterType === 'all'
    ? recipes
    : recipes.filter(r => r.type === filterType);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Custom Recipes ({recipes.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh recipes">
              <IconButton onClick={fetchRecipes} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<ImportIcon />}
              onClick={() => setImportDialogOpen(true)}
              size="small"
            >
              Import
            </Button>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={handleExport}
              disabled={recipes.length === 0}
              size="small"
            >
              Export
            </Button>
            <Tooltip title="Deploy enabled recipes to server datapack and reload">
              <span>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={deployLoading ? <CircularProgress size={20} /> : <DeployIcon />}
                  onClick={handleDeploy}
                  disabled={recipes.length === 0 || deployLoading}
                >
                  Deploy All
                </Button>
              </span>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
            >
              Add Recipe
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Filter */}
        <Box sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Type</InputLabel>
            <Select
              value={filterType}
              label="Filter by Type"
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value={RecipeType.CRAFTING_SHAPED}>Crafting (Shaped)</MenuItem>
              <MenuItem value={RecipeType.CRAFTING_SHAPELESS}>Crafting (Shapeless)</MenuItem>
              <MenuItem value={RecipeType.SMELTING}>Smelting</MenuItem>
              <MenuItem value={RecipeType.BLASTING}>Blasting</MenuItem>
              <MenuItem value={RecipeType.SMOKING}>Smoking</MenuItem>
              <MenuItem value={RecipeType.CAMPFIRE_COOKING}>Campfire</MenuItem>
              <MenuItem value={RecipeType.STONECUTTING}>Stonecutting</MenuItem>
              <MenuItem value={RecipeType.SMITHING_TRANSFORM}>Smithing</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Recipes Table */}
        {filteredRecipes.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="textSecondary">
              {recipes.length === 0
                ? 'No custom recipes. Click "Add Recipe" to create one.'
                : 'No recipes match the selected filter.'}
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Namespace</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Enabled</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecipes.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {recipe.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {recipe.namespace}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRecipeTypeLabel(recipe.type)}
                        size="small"
                        color={getRecipeTypeColor(recipe.type)}
                      />
                    </TableCell>
                    <TableCell>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={recipe.enabled}
                            onChange={() => handleToggleEnabled(recipe)}
                            disabled={actionLoading === recipe.id}
                            size="small"
                          />
                        }
                        label=""
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Tooltip title="Edit recipe">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(recipe)}
                            disabled={actionLoading === recipe.id}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete recipe">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(recipe)}
                            disabled={actionLoading === recipe.id}
                          >
                            {actionLoading === recipe.id ? (
                              <CircularProgress size={20} />
                            ) : (
                              <DeleteIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>

      {/* Recipe Form Dialog */}
      <RecipeForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedRecipe(undefined);
        }}
        onSave={() => {
          setSuccess(selectedRecipe ? 'Recipe updated successfully' : 'Recipe created successfully');
          fetchRecipes();
        }}
        recipe={selectedRecipe}
        serverId={serverId}
      />

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Recipes</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Upload a ZIP file containing recipe JSON files or a single recipe JSON file.
          </Typography>
          <Button
            variant="outlined"
            component="label"
            fullWidth
            startIcon={<ImportIcon />}
          >
            {importFile ? importFile.name : 'Choose File'}
            <input
              type="file"
              hidden
              accept=".json,.zip"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleImportSubmit}
            disabled={!importFile || actionLoading === -1}
            startIcon={actionLoading === -1 ? <CircularProgress size={20} /> : <ImportIcon />}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

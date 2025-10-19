'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  TextField,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Collapse,
  Divider,
  Badge,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';

interface ModProject {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  author?: string;
  projectUrl?: string;
  iconUrl?: string;
  source: string;
  externalId?: string;
  autoUpdate: boolean;
  versions?: ModVersion[];
}

interface ModVersion {
  id: number;
  projectId: number;
  fileName: string;
  versionNumber: string;
  modLoader: string;
  minecraftVersions: string[];
  downloadUrl?: string;
  fileSize?: number;
  releaseType?: string;
}

interface ModrinthSearchResult {
  project_id: string;
  title: string;
  description: string;
  author: string;
  icon_url: string;
  downloads: number;
  categories: string[];
}

// Memoized ProjectCard component to prevent unnecessary re-renders
const ProjectCard = React.memo(({
  project,
  isExpanded,
  onToggleExpand,
  onDelete,
  deleteLoading
}: {
  project: ModProject;
  isExpanded: boolean;
  onToggleExpand: (id: number) => void;
  onDelete: (id: number, name: string) => void;
  deleteLoading: boolean;
}) => {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Mod Icon */}
          {project.iconUrl && (
            <img
              src={project.iconUrl}
              alt={project.name}
              style={{ width: 64, height: 64, borderRadius: 8 }}
            />
          )}

          {/* Mod Info */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {project.name}
              </Typography>
              {project.source === 'modrinth' && (
                <Chip label="Modrinth" size="small" color="primary" />
              )}
            </Box>

            {project.author && (
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                by {project.author}
              </Typography>
            )}

            {project.description && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                {project.description.length > 150
                  ? `${project.description.substring(0, 150)}...`
                  : project.description}
              </Typography>
            )}

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                label={`${project.versions?.length || 0} versions`}
                size="small"
                variant="outlined"
              />
              {project.autoUpdate && (
                <Chip label="Auto-update" size="small" color="success" variant="outlined" />
              )}
            </Box>
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => onToggleExpand(project.id)}
              title="Show versions"
            >
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => onDelete(project.id, project.name)}
              disabled={deleteLoading}
              title="Remove from library"
            >
              {deleteLoading ? (
                <CircularProgress size={20} />
              ) : (
                <DeleteIcon fontSize="small" />
              )}
            </IconButton>
          </Box>
        </Box>

        {/* Expanded Versions */}
        <Collapse in={isExpanded}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Available Versions
          </Typography>
          <Box sx={{ display: 'grid', gap: 1 }}>
            {project.versions && project.versions.length > 0 ? (
              project.versions.map((version) => (
                <Box
                  key={version.id}
                  sx={{
                    p: 1.5,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {version.versionNumber}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {version.fileName}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Chip
                        label={version.modLoader}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                      {version.minecraftVersions.slice(0, 3).map((mcVer, idx) => (
                        <Chip key={idx} label={mcVer} size="small" variant="outlined" />
                      ))}
                      {version.minecraftVersions.length > 3 && (
                        <Chip
                          label={`+${version.minecraftVersions.length - 3}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                No versions available
              </Typography>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
});

ProjectCard.displayName = 'ProjectCard';

// Memoized SearchResultCard component to prevent unnecessary re-renders
const SearchResultCard = React.memo(({
  mod,
  onAdd,
  isAdding
}: {
  mod: ModrinthSearchResult;
  onAdd: (mod: ModrinthSearchResult) => void;
  isAdding: boolean;
}) => {
  const handleClick = useCallback(() => {
    onAdd(mod);
  }, [mod, onAdd]);

  return (
    <Card
      sx={{ mb: 1, cursor: 'pointer' }}
      onClick={handleClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {mod.icon_url && (
            <img
              src={mod.icon_url}
              alt={mod.title}
              style={{ width: 48, height: 48, borderRadius: 4 }}
            />
          )}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {mod.title}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
              by {mod.author}
            </Typography>
            <Typography variant="body2" noWrap>
              {mod.description}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
              <Chip label={`${mod.downloads.toLocaleString()} downloads`} size="small" />
            </Box>
          </Box>
          {isAdding ? (
            <CircularProgress size={24} />
          ) : (
            <AddIcon color="primary" />
          )}
        </Box>
      </CardContent>
    </Card>
  );
});

SearchResultCard.displayName = 'SearchResultCard';

export default function ModLibraryV2() {
  const [projects, setProjects] = useState<ModProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ModrinthSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingModId, setAddingModId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  // Advanced filters
  const [filterMinecraftVersion, setFilterMinecraftVersion] = useState('');
  const [filterModLoader, setFilterModLoader] = useState('');

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mod-projects');
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching mod projects:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearchLoading(true);
      const params = new URLSearchParams({
        query: searchQuery,
        limit: '20',
      });

      if (filterMinecraftVersion) {
        params.append('minecraftVersion', filterMinecraftVersion);
      }
      if (filterModLoader) {
        params.append('modLoader', filterModLoader);
      }

      const response = await fetch(`/api/modrinth/search?${params.toString()}`);
      const data = await response.json();
      setSearchResults(data.hits || []);
    } catch (error) {
      console.error('Error searching Modrinth:', error);
      setError('Failed to search Modrinth');
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, filterMinecraftVersion, filterModLoader]);

  const handleAddModFromModrinth = useCallback(async (mod: ModrinthSearchResult) => {
    try {
      setAddingModId(mod.project_id);
      setError(null);

      const response = await fetch('/api/mod-projects/from-modrinth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: mod.project_id,
          minecraftVersion: filterMinecraftVersion || undefined,
          modLoader: filterModLoader || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError('This mod is already in your library');
        } else {
          throw new Error(data.error || 'Failed to add mod');
        }
        return;
      }

      setSearchDialogOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      await fetchProjects();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingModId(null);
    }
  }, [filterMinecraftVersion, filterModLoader, fetchProjects]);

  const handleDeleteProject = useCallback(async (projectId: number, projectName: string) => {
    if (!confirm(`Remove "${projectName}" and all its versions from your library?`)) {
      return;
    }

    try {
      setDeleteLoading(projectId);
      const response = await fetch(`/api/mod-projects?id=${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchProjects();
      } else {
        console.error('Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    } finally {
      setDeleteLoading(null);
    }
  }, [fetchProjects]);

  const toggleExpand = useCallback((projectId: number) => {
    setExpandedProjects(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(projectId)) {
        newExpanded.delete(projectId);
      } else {
        newExpanded.add(projectId);
      }
      return newExpanded;
    });
  }, []);

  const handleDialogClose = useCallback(() => {
    setSearchDialogOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  }, []);

  // Memoized handlers for text field changes
  const handleSearchQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleMinecraftVersionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterMinecraftVersion(e.target.value);
  }, []);

  const handleModLoaderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterModLoader(e.target.value);
  }, []);

  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const toggleShowAdvanced = useCallback(() => {
    setShowAdvanced(prev => !prev);
  }, []);

  const handleOpenDialog = useCallback(() => {
    setSearchDialogOpen(true);
  }, []);

  const handleClearError = useCallback(() => {
    setError(null);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Mod Library
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
          size="large"
        >
          Add Mod
        </Button>
      </Box>

      {/* Empty State */}
      {projects.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h5" gutterBottom>
              No mods in library
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 4 }}>
              Search Modrinth to add mods to your library
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<SearchIcon />}
              onClick={handleOpenDialog}
            >
              Search Modrinth
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Mod Projects List */
        <Box sx={{ display: 'grid', gap: 2 }}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isExpanded={expandedProjects.has(project.id)}
              onToggleExpand={toggleExpand}
              onDelete={handleDeleteProject}
              deleteLoading={deleteLoading === project.id}
            />
          ))}
        </Box>
      )}

      {/* Search Dialog */}
      <Dialog open={searchDialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Search Modrinth
            <IconButton size="small" onClick={toggleShowAdvanced}>
              <Badge color="primary" variant="dot" invisible={!filterMinecraftVersion && !filterModLoader}>
                <TuneIcon />
              </Badge>
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={handleClearError}>
              {error}
            </Alert>
          )}

          {/* Search Bar */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              label="Search mods"
              value={searchQuery}
              onChange={handleSearchQueryChange}
              onKeyPress={handleSearchKeyPress}
              fullWidth
              placeholder="e.g., Fabric API, Sodium, JEI..."
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={searchLoading || !searchQuery.trim()}
              startIcon={searchLoading ? <CircularProgress size={20} /> : <SearchIcon />}
            >
              Search
            </Button>
          </Box>

          {/* Advanced Filters */}
          <Collapse in={showAdvanced}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <TextField
                label="Minecraft Version (optional)"
                value={filterMinecraftVersion}
                onChange={handleMinecraftVersionChange}
                placeholder="e.g., 1.21.1"
                size="small"
              />
              <TextField
                label="Mod Loader (optional)"
                value={filterModLoader}
                onChange={handleModLoaderChange}
                placeholder="fabric or neoforge"
                size="small"
              />
            </Box>
          </Collapse>

          {/* Search Results */}
          {searchLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {!searchLoading && searchResults.length > 0 && (
            <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
              {searchResults.map((mod) => (
                <SearchResultCard
                  key={mod.project_id}
                  mod={mod}
                  onAdd={handleAddModFromModrinth}
                  isAdding={addingModId === mod.project_id}
                />
              ))}
            </Box>
          )}

          {!searchLoading && searchQuery && searchResults.length === 0 && (
            <Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
              No mods found. Try a different search query.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

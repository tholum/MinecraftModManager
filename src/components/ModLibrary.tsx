'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  CloudUpload as UploadIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { Tabs, Tab } from '@mui/material';

interface Mod {
  id: number;
  name: string;
  fileName: string;
  version: string;
  modLoader: string;
  minecraftVersions: string[];
  downloadUrl?: string;
  description?: string;
  author?: string;
  projectUrl?: string;
  autoUpdate: boolean;
}

export default function ModLibrary() {
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    fileName: '',
    version: '',
    modLoader: 'fabric',
    minecraftVersions: '',
    downloadUrl: '',
    description: '',
    author: '',
    projectUrl: '',
    autoUpdate: false,
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMod, setSelectedMod] = useState<any>(null);
  const [modVersions, setModVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');

  useEffect(() => {
    fetchMods();
  }, []);

  const fetchMods = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mods');
      const data = await response.json();
      setMods(data.mods || []);
    } catch (error) {
      console.error('Error fetching mods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (modId: number, modName: string) => {
    if (!confirm(`Are you sure you want to delete "${modName}" from the library?`)) {
      return;
    }

    try {
      setDeleteLoading(modId);
      const response = await fetch(`/api/mods/${modId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchMods();
      } else {
        console.error('Failed to delete mod');
      }
    } catch (error) {
      console.error('Error deleting mod:', error);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitLoading(true);

    try {
      const versionsArray = formData.minecraftVersions
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);

      const response = await fetch('/api/mods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          minecraftVersions: versionsArray,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add mod');
      }

      setDialogOpen(false);
      setFormData({
        name: '',
        fileName: '',
        version: '',
        modLoader: 'fabric',
        minecraftVersions: '',
        downloadUrl: '',
        description: '',
        author: '',
        projectUrl: '',
        autoUpdate: false,
      });
      await fetchMods();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearchLoading(true);
      const response = await fetch(
        `/api/modrinth/search?query=${encodeURIComponent(searchQuery)}&limit=20`
      );
      const data = await response.json();
      setSearchResults(data.hits || []);
    } catch (error) {
      console.error('Error searching Modrinth:', error);
      setError('Failed to search Modrinth');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectMod = async (mod: any) => {
    setSelectedMod(mod);
    try {
      const response = await fetch(`/api/modrinth/project/${mod.project_id}/versions`);
      const data = await response.json();
      setModVersions(data.versions || []);
      if (data.versions && data.versions.length > 0) {
        setSelectedVersion(data.versions[0].id);
      }
    } catch (error) {
      console.error('Error fetching mod versions:', error);
      setError('Failed to fetch mod versions');
    }
  };

  const handleAddFromModrinth = async () => {
    if (!selectedMod || !selectedVersion) return;

    try {
      setSubmitLoading(true);
      const version = modVersions.find(v => v.id === selectedVersion);
      if (!version) throw new Error('Version not found');

      const primaryFile = version.files.find((f: any) => f.primary) || version.files[0];

      const modData = {
        name: selectedMod.title,
        fileName: primaryFile.filename,
        version: version.version_number,
        modLoader: version.loaders[0] || 'fabric',
        minecraftVersions: version.game_versions,
        downloadUrl: primaryFile.url,
        description: selectedMod.description,
        author: selectedMod.author,
        projectUrl: `https://modrinth.com/mod/${selectedMod.slug}`,
        autoUpdate: true,
      };

      const response = await fetch('/api/mods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add mod');
      }

      setDialogOpen(false);
      setSelectedMod(null);
      setModVersions([]);
      setSearchResults([]);
      setSearchQuery('');
      await fetchMods();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setTabValue(0);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMod(null);
    setModVersions([]);
    setError(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Mod Library
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add Mod
        </Button>
      </Box>

      {mods.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h5" gutterBottom>
              No mods in library
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 4 }}>
              Add mods to your central library to use them across servers
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Add Your First Mod
            </Button>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Mod Loader</TableCell>
                <TableCell>Minecraft Versions</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>Auto Update</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mods.map((mod) => (
                <TableRow key={mod.id} hover>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {mod.name}
                    </Typography>
                    {mod.description && (
                      <Typography variant="body2" color="textSecondary">
                        {mod.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{mod.version}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {mod.modLoader}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {mod.minecraftVersions.slice(0, 3).map((version, idx) => (
                        <Chip key={idx} label={version} size="small" />
                      ))}
                      {mod.minecraftVersions.length > 3 && (
                        <Chip label={`+${mod.minecraftVersions.length - 3}`} size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{mod.author || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={mod.autoUpdate ? 'Yes' : 'No'}
                      color={mod.autoUpdate ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(mod.id, mod.name)}
                      disabled={deleteLoading === mod.id}
                      title="Delete mod"
                    >
                      {deleteLoading === mod.id ? (
                        <CircularProgress size={20} />
                      ) : (
                        <DeleteIcon fontSize="small" />
                      )}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Mod Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>Add Mod to Library</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
            <Tab label="Search Modrinth" icon={<SearchIcon />} iconPosition="start" />
            <Tab label="Manual Entry" icon={<AddIcon />} iconPosition="start" />
          </Tabs>

          {/* Modrinth Search Tab */}
          {tabValue === 0 && (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="Search mods on Modrinth"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  fullWidth
                  placeholder="e.g., Fabric API, JEI, Sodium..."
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

              {searchLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              )}

              {!searchLoading && searchResults.length > 0 && (
                <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
                  {searchResults.map((mod) => (
                    <Card
                      key={mod.project_id}
                      sx={{
                        mb: 1,
                        cursor: 'pointer',
                        border: selectedMod?.project_id === mod.project_id ? 2 : 0,
                        borderColor: 'primary.main',
                      }}
                      onClick={() => handleSelectMod(mod)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', gap: 2 }}>
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
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                              by {mod.author}
                            </Typography>
                            <Typography variant="body2" noWrap>
                              {mod.description}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                              <Chip label={`${mod.downloads.toLocaleString()} downloads`} size="small" />
                              {mod.categories.slice(0, 3).map((cat: string) => (
                                <Chip key={cat} label={cat} size="small" />
                              ))}
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}

              {!searchLoading && searchQuery && searchResults.length === 0 && (
                <Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                  No mods found. Try a different search query.
                </Typography>
              )}

              {selectedMod && modVersions.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Select Version for {selectedMod.title}
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel>Version</InputLabel>
                    <Select
                      value={selectedVersion}
                      label="Version"
                      onChange={(e) => setSelectedVersion(e.target.value)}
                    >
                      {modVersions.map((version) => (
                        <MenuItem key={version.id} value={version.id}>
                          {version.version_number} - {version.game_versions.join(', ')} ({version.loaders.join(', ')})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}
            </Box>
          )}

          {/* Manual Entry Tab */}
          {tabValue === 1 && (
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2, mt: 1 }}>
              <TextField
                label="Mod Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                fullWidth
                helperText="Display name for the mod"
              />

              <TextField
                label="File Name"
                value={formData.fileName}
                onChange={(e) => handleChange('fileName', e.target.value)}
                required
                fullWidth
                helperText="Actual .jar file name (e.g., fabric-api-0.92.0+1.20.4.jar)"
              />

              <TextField
                label="Version"
                value={formData.version}
                onChange={(e) => handleChange('version', e.target.value)}
                required
                fullWidth
              />

              <FormControl fullWidth required>
                <InputLabel>Mod Loader</InputLabel>
                <Select
                  value={formData.modLoader}
                  label="Mod Loader"
                  onChange={(e) => handleChange('modLoader', e.target.value)}
                >
                  <MenuItem value="neoforge">NeoForge</MenuItem>
                  <MenuItem value="fabric">Fabric</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Minecraft Versions"
                value={formData.minecraftVersions}
                onChange={(e) => handleChange('minecraftVersions', e.target.value)}
                required
                fullWidth
                helperText="Comma-separated list (e.g., 1.20.4, 1.20.3, 1.20.2)"
              />

              <TextField
                label="Download URL (Optional)"
                value={formData.downloadUrl}
                onChange={(e) => handleChange('downloadUrl', e.target.value)}
                fullWidth
                helperText="URL to download the mod (for auto-updates)"
              />

              <TextField
                label="Description (Optional)"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                fullWidth
                multiline
                rows={2}
              />

              <TextField
                label="Author (Optional)"
                value={formData.author}
                onChange={(e) => handleChange('author', e.target.value)}
                fullWidth
              />

              <TextField
                label="Project URL (Optional)"
                value={formData.projectUrl}
                onChange={(e) => handleChange('projectUrl', e.target.value)}
                fullWidth
                helperText="Link to mod's CurseForge, Modrinth, or GitHub page"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.autoUpdate}
                    onChange={(e) => handleChange('autoUpdate', e.target.checked)}
                  />
                }
                label="Enable Auto-Update"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={submitLoading}>
            Cancel
          </Button>
          {tabValue === 0 ? (
            <Button
              variant="contained"
              onClick={handleAddFromModrinth}
              disabled={!selectedMod || !selectedVersion || submitLoading}
              startIcon={submitLoading ? <CircularProgress size={20} /> : <AddIcon />}
            >
              Add from Modrinth
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitLoading}
              startIcon={submitLoading ? <CircularProgress size={20} /> : <AddIcon />}
            >
              Add Manually
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';

interface ModProject {
  id: number;
  name: string;
  iconUrl?: string;
  versions?: ModVersion[];
}

interface ModVersion {
  id: number;
  projectId: number;
  fileName: string;
  versionNumber: string;
  modLoader: string;
  minecraftVersions: string[];
}

interface ServerMod {
  id: number;
  modVersionId: number;
  enabled: boolean;
  modVersion: {
    id: number;
    versionNumber: string;
    fileName: string;
    modLoader: string;
    minecraftVersions: string[];
    project: {
      id: number;
      name: string;
      iconUrl?: string;
    };
  };
}

interface ServerModsV2Props {
  serverId: number;
  serverMinecraftVersion: string;
  serverModLoader: string;
}

export default function ServerModsV2({ serverId, serverMinecraftVersion, serverModLoader }: ServerModsV2Props) {
  const [serverMods, setServerMods] = useState<ServerMod[]>([]);
  const [availableProjects, setAvailableProjects] = useState<ModProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ModProject | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkingDeps, setCheckingDeps] = useState(false);
  const [depInfo, setDepInfo] = useState<string | null>(null);

  useEffect(() => {
    fetchServerMods();
    fetchAvailableProjects();
  }, [serverId]);

  const fetchServerMods = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/servers/${serverId}/mods-v2`);
      const data = await response.json();
      setServerMods(data.mods || []);
    } catch (error) {
      console.error('Error fetching server mods:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProjects = async () => {
    try {
      const response = await fetch('/api/mod-projects');
      const data = await response.json();
      setAvailableProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching available projects:', error);
    }
  };

  const handleAddMod = async () => {
    if (!selectedVersionId) return;

    try {
      setActionLoading(selectedVersionId);
      setError(null);
      const response = await fetch(`/api/servers/${serverId}/mods-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modVersionId: selectedVersionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add mod');
      }

      await fetchServerMods();
      setDialogOpen(false);
      setSelectedProject(null);
      setSelectedVersionId(null);
    } catch (err: any) {
      console.error('Error adding mod:', err);
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleMod = async (modVersionId: number, enabled: boolean) => {
    try {
      setActionLoading(modVersionId);
      const response = await fetch(`/api/servers/${serverId}/mods-v2/${modVersionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        await fetchServerMods();
      }
    } catch (error) {
      console.error('Error toggling mod:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMod = async (modVersionId: number, modName: string) => {
    if (!confirm(`Remove "${modName}" from this server?`)) {
      return;
    }

    try {
      setActionLoading(modVersionId);
      const response = await fetch(`/api/servers/${serverId}/mods-v2/${modVersionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchServerMods();
      } else {
        console.error('Failed to remove mod');
      }
    } catch (error) {
      console.error('Error removing mod:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const isVersionCompatible = (version: ModVersion): boolean => {
    if (!serverModLoader || !serverMinecraftVersion) return false;
    const loaderMatch = version.modLoader.toLowerCase() === serverModLoader.toLowerCase();
    const versionMatch = version.minecraftVersions.includes(serverMinecraftVersion);
    return loaderMatch && versionMatch;
  };

  const getCompatibleVersions = (project: ModProject): ModVersion[] => {
    if (!project.versions) return [];
    return project.versions.filter(isVersionCompatible);
  };

  const getUninstalledProjects = (): ModProject[] => {
    const installedProjectIds = serverMods.map(sm => sm.modVersion.project.id);
    return availableProjects.filter(project => !installedProjectIds.includes(project.id));
  };

  const handleCheckDependencies = async () => {
    try {
      setCheckingDeps(true);
      setDepInfo(null);
      setError(null);

      const response = await fetch(`/api/servers/${serverId}/dependencies`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        if (data.count > 0) {
          setDepInfo(`Installed ${data.count} missing dependencies`);
          await fetchServerMods();
        } else {
          setDepInfo('All dependencies are already installed');
        }
      } else {
        throw new Error(data.error || 'Failed to check dependencies');
      }
    } catch (err: any) {
      console.error('Error checking dependencies:', err);
      setError(err.message);
    } finally {
      setCheckingDeps(false);
    }
  };

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
            Installed Mods ({serverMods.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={checkingDeps ? <CircularProgress size={20} /> : <SyncIcon />}
              onClick={handleCheckDependencies}
              disabled={serverModLoader === 'vanilla' || checkingDeps || serverMods.length === 0}
            >
              Sync Dependencies
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              disabled={serverModLoader === 'vanilla'}
            >
              Add Mod
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {depInfo && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setDepInfo(null)}>
            {depInfo}
          </Alert>
        )}

        {serverModLoader === 'vanilla' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            This server is running vanilla Minecraft. Change the mod loader to NeoForge or Fabric to add mods.
          </Alert>
        )}

        {serverMods.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="textSecondary">
              No mods installed on this server
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            {serverMods.map((serverMod) => {
              const compatible = serverMod.modVersion.minecraftVersions.includes(serverMinecraftVersion);
              return (
                <Box
                  key={serverMod.id}
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: serverMod.enabled ? 'background.paper' : 'action.hover',
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {serverMod.modVersion.project.iconUrl && (
                      <img
                        src={serverMod.modVersion.project.iconUrl}
                        alt={serverMod.modVersion.project.name}
                        style={{ width: 40, height: 40, borderRadius: 4 }}
                      />
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {serverMod.modVersion.project.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {serverMod.modVersion.versionNumber}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      {!compatible && (
                        <Chip
                          icon={<WarningIcon />}
                          label="Incompatible"
                          color="error"
                          size="small"
                        />
                      )}
                      <FormControlLabel
                        control={
                          <Switch
                            checked={serverMod.enabled}
                            onChange={(e) => handleToggleMod(serverMod.modVersionId, e.target.checked)}
                            disabled={actionLoading === serverMod.modVersionId}
                          />
                        }
                        label=""
                      />
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveMod(serverMod.modVersionId, serverMod.modVersion.project.name)}
                        disabled={actionLoading === serverMod.modVersionId}
                        title="Remove mod"
                      >
                        {actionLoading === serverMod.modVersionId ? (
                          <CircularProgress size={20} />
                        ) : (
                          <DeleteIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>

      {/* Add Mod Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Mod to Server</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {getUninstalledProjects().length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="textSecondary">
                All mods from your library are already installed.
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Add more mods to your library first.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Select Project */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Mod</InputLabel>
                <Select
                  value={selectedProject?.id || ''}
                  label="Select Mod"
                  onChange={(e) => {
                    const project = availableProjects.find(p => p.id === e.target.value);
                    setSelectedProject(project || null);
                    setSelectedVersionId(null);
                  }}
                >
                  {getUninstalledProjects().map((project) => {
                    const compatibleCount = getCompatibleVersions(project).length;
                    return (
                      <MenuItem key={project.id} value={project.id} disabled={compatibleCount === 0}>
                        {project.name} {compatibleCount === 0 && '(no compatible versions)'}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              {/* Select Version */}
              {selectedProject && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Select Version
                  </Typography>
                  <FormControl fullWidth>
                    <Select
                      value={selectedVersionId || ''}
                      onChange={(e) => setSelectedVersionId(e.target.value as number)}
                      displayEmpty
                    >
                      <MenuItem value="" disabled>
                        Choose a version...
                      </MenuItem>
                      {getCompatibleVersions(selectedProject).map((version) => (
                        <MenuItem key={version.id} value={version.id}>
                          {version.versionNumber} - {version.minecraftVersions.join(', ')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddMod}
            disabled={!selectedVersionId || !!actionLoading}
            startIcon={actionLoading ? <CircularProgress size={20} /> : <AddIcon />}
          >
            Add Mod
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

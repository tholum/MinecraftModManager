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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface Mod {
  id: number;
  name: string;
  version: string;
  modLoader: string;
  minecraftVersions: string[];
  description?: string;
}

interface ServerMod {
  modId: number;
  enabled: boolean;
  mod: Mod;
}

interface ServerModsProps {
  serverId: number;
  serverMinecraftVersion: string;
  serverModLoader: string;
}

export default function ServerMods({ serverId, serverMinecraftVersion, serverModLoader }: ServerModsProps) {
  const [serverMods, setServerMods] = useState<ServerMod[]>([]);
  const [availableMods, setAvailableMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServerMods();
    fetchAvailableMods();
  }, [serverId]);

  const fetchServerMods = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/servers/${serverId}/mods`);
      const data = await response.json();
      setServerMods(data.mods || []);
    } catch (error) {
      console.error('Error fetching server mods:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableMods = async () => {
    try {
      const response = await fetch(`/api/mods?modLoader=${serverModLoader}`);
      const data = await response.json();
      setAvailableMods(data.mods || []);
    } catch (error) {
      console.error('Error fetching available mods:', error);
    }
  };

  const handleAddMod = async (modId: number) => {
    try {
      setActionLoading(modId);
      setError(null);
      const response = await fetch(`/api/servers/${serverId}/mods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add mod');
      }

      await fetchServerMods();
      setDialogOpen(false);
    } catch (err: any) {
      console.error('Error adding mod:', err);
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleMod = async (modId: number, enabled: boolean) => {
    try {
      setActionLoading(modId);
      const response = await fetch(`/api/servers/${serverId}/mods/${modId}`, {
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

  const handleRemoveMod = async (modId: number, modName: string) => {
    if (!confirm(`Remove "${modName}" from this server?`)) {
      return;
    }

    try {
      setActionLoading(modId);
      const response = await fetch(`/api/servers/${serverId}/mods/${modId}`, {
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

  const isModCompatible = (mod: Mod): boolean => {
    return mod.minecraftVersions.includes(serverMinecraftVersion);
  };

  const getUninstalledMods = (): Mod[] => {
    const installedModIds = serverMods.map(sm => sm.modId);
    return availableMods.filter(mod => !installedModIds.includes(mod.id));
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
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            disabled={serverModLoader === 'vanilla'}
          >
            Add Mod
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
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
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Compatible</TableCell>
                  <TableCell>Enabled</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {serverMods.map((serverMod) => {
                  const compatible = isModCompatible(serverMod.mod);
                  return (
                    <TableRow key={serverMod.modId} hover>
                      <TableCell>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {serverMod.mod.name}
                        </Typography>
                        {serverMod.mod.description && (
                          <Typography variant="body2" color="textSecondary">
                            {serverMod.mod.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{serverMod.mod.version}</TableCell>
                      <TableCell>
                        {compatible ? (
                          <Chip label="Compatible" color="success" size="small" />
                        ) : (
                          <Chip
                            label="Incompatible"
                            color="error"
                            size="small"
                            icon={<WarningIcon />}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={serverMod.enabled}
                              onChange={(e) => handleToggleMod(serverMod.modId, e.target.checked)}
                              disabled={actionLoading === serverMod.modId}
                            />
                          }
                          label=""
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveMod(serverMod.modId, serverMod.mod.name)}
                          disabled={actionLoading === serverMod.modId}
                          title="Remove mod"
                        >
                          {actionLoading === serverMod.modId ? (
                            <CircularProgress size={20} />
                          ) : (
                            <DeleteIcon fontSize="small" />
                          )}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>

      {/* Add Mod Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Mod to Server</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {getUninstalledMods().length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="textSecondary">
                All compatible mods from the library are already installed.
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Add more mods to your library to install them on this server.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Version</TableCell>
                    <TableCell>Compatible</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getUninstalledMods().map((mod) => {
                    const compatible = isModCompatible(mod);
                    return (
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
                          {compatible ? (
                            <Chip label="Compatible" color="success" size="small" />
                          ) : (
                            <Chip
                              label="Incompatible"
                              color="warning"
                              size="small"
                              icon={<WarningIcon />}
                            />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleAddMod(mod.id)}
                            disabled={actionLoading === mod.id}
                            startIcon={actionLoading === mod.id ? <CircularProgress size={16} /> : <AddIcon />}
                          >
                            Add
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

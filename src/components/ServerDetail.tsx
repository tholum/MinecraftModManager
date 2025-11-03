'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  Divider,
  Alert,
  Paper,
  IconButton,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RestartIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  CloudDownload as ExportIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import ServerModsV2 from './ServerModsV2';
import ServerConsole from './ServerConsole';
import { RecipeManager } from '@/components/recipes';

interface Server {
  id: number;
  name: string;
  status: string;
  minecraftVersion: string;
  modLoader: string;
  modLoaderVersion?: string;
  port: number;
  seed?: string;
  memory: string;
  cpuLimit?: number;
  createdAt: string;
  settings?: {
    difficulty?: string;
    gamemode?: string;
    maxPlayers?: number;
    pvp?: boolean;
    allowNether?: boolean;
    allowFlight?: boolean;
    spawnMonsters?: boolean;
    spawnAnimals?: boolean;
    spawnNpcs?: boolean;
    viewDistance?: number;
    simulationDistance?: number;
    levelType?: string;
    motd?: string;
    onlineMode?: boolean;
    whitelist?: boolean;
    enableCommandBlock?: boolean;
  };
}

interface ServerDetailProps {
  serverId: number;
}

export default function ServerDetail({ serverId }: ServerDetailProps) {
  const router = useRouter();
  const [server, setServer] = useState<Server | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [editMemory, setEditMemory] = useState('2G');
  const [editCpuLimit, setEditCpuLimit] = useState<string>('');
  const [updatingResources, setUpdatingResources] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchServer();
    fetchLogs();

    // Auto-refresh status every 5 seconds
    const interval = setInterval(() => {
      fetchServer();
    }, 5000);

    return () => clearInterval(interval);
  }, [serverId]);

  const fetchServer = async () => {
    try {
      const response = await fetch(`/api/servers/${serverId}`);
      if (!response.ok) {
        throw new Error('Server not found');
      }
      const data = await response.json();
      setServer(data.server);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching server:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch(`/api/servers/${serverId}/logs?tail=100`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || '');
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    try {
      setActionLoading(action);
      setError(null);
      const response = await fetch(`/api/servers/${serverId}/${action}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} server`);
      }

      await fetchServer();
      if (action === 'start' || action === 'restart') {
        // Wait a bit and fetch logs
        setTimeout(fetchLogs, 2000);
      }
    } catch (error: any) {
      console.error(`Error ${action}ing server:`, error);
      setError(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete server "${server?.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading('delete');
      const response = await fetch(`/api/servers/${serverId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/servers');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete server');
      }
    } catch (error: any) {
      console.error('Error deleting server:', error);
      setError(error.message);
      setActionLoading(null);
    }
  };

  const handleDownloadModpack = () => {
    window.open(`/api/servers/${serverId}/modpack`, '_blank');
  };

  const handleSyncProperties = async () => {
    try {
      setSyncing(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(`/api/servers/${serverId}/sync-properties`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync server properties');
      }

      setSuccessMessage(`Properties synced successfully! Updated seed: ${data.updates.seed}`);
      await fetchServer();
    } catch (error: any) {
      console.error('Error syncing properties:', error);
      setError(error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenResourceDialog = () => {
    setEditMemory(server?.memory || '2G');
    setEditCpuLimit(server?.cpuLimit?.toString() || '');
    setResourceDialogOpen(true);
  };

  const handleUpdateResources = async () => {
    try {
      setUpdatingResources(true);
      setError(null);

      const response = await fetch(`/api/servers/${serverId}/resources`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memory: editMemory,
          cpuLimit: editCpuLimit ? parseFloat(editCpuLimit) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update resources');
      }

      setSuccessMessage('Resources updated successfully! You must restart the server for changes to take effect.');
      setResourceDialogOpen(false);
      await fetchServer();
    } catch (error: any) {
      console.error('Error updating resources:', error);
      setError(error.message);
    } finally {
      setUpdatingResources(false);
    }
  };

  const handleExportWorld = async () => {
    try {
      setActionLoading('export');
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(`/api/servers/${serverId}/export-world`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to export world');
      }

      setSuccessMessage(`World exported successfully (${data.fileSize}MB). Downloading...`);

      // Download the exported file
      window.open(data.filePath, '_blank');
    } catch (error: any) {
      console.error('Error exporting world:', error);
      setError(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleImportWorld = () => {
    if (server?.status !== 'stopped') {
      setError('Server must be stopped before importing a world');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.tar.gz') && !file.name.endsWith('.tgz')) {
      setError('Please select a .tar.gz file');
      return;
    }

    if (!confirm('Importing a world will replace the current world. This cannot be undone. Continue?')) {
      event.target.value = '';
      return;
    }

    try {
      setActionLoading('import');
      setError(null);
      setSuccessMessage(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/servers/${serverId}/import-world`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import world');
      }

      setSuccessMessage(data.message);
      await fetchServer();
    } catch (error: any) {
      console.error('Error importing world:', error);
      setError(error.message);
    } finally {
      setActionLoading(null);
      event.target.value = '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'success';
      case 'stopped':
        return 'default';
      case 'starting':
        return 'info';
      case 'stopping':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !server) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!server) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Server not found
      </Alert>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Hidden file input for world import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".tar.gz,.tgz"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            {server.name}
          </Typography>
          <Chip
            label={server.status}
            color={getStatusColor(server.status) as any}
            size="medium"
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={actionLoading === 'export' ? <CircularProgress size={20} /> : <ExportIcon />}
            onClick={handleExportWorld}
            disabled={!!actionLoading}
          >
            Export World
          </Button>
          <Button
            variant="outlined"
            startIcon={actionLoading === 'import' ? <CircularProgress size={20} /> : <UploadIcon />}
            onClick={handleImportWorld}
            disabled={!!actionLoading || server.status !== 'stopped'}
            title={server.status !== 'stopped' ? 'Stop the server to import a world' : 'Import a world backup'}
          >
            Import World
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadModpack}
            disabled={!!actionLoading}
          >
            Download Modpack
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => router.push(`/servers/${serverId}/edit`)}
            disabled={!!actionLoading}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
            disabled={!!actionLoading}
          >
            Delete
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Overview" />
          <Tab label="Mods" />
          <Tab label="Recipes" />
          {server.status === 'running' && <Tab label="Console" />}
          <Tab label="Logs" />
          <Tab label="Settings" />
        </Tabs>
      </Box>

      {/* Tab Panel: Overview */}
      {tabValue === 0 && (
      <>
      {/* Control Buttons */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Server Controls
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            {server.status === 'stopped' && (
              <Button
                variant="contained"
                color="success"
                size="large"
                startIcon={actionLoading === 'start' ? <CircularProgress size={20} /> : <StartIcon />}
                onClick={() => handleAction('start')}
                disabled={!!actionLoading}
              >
                Start Server
              </Button>
            )}
            {server.status === 'running' && (
              <>
                <Button
                  variant="contained"
                  color="warning"
                  size="large"
                  startIcon={actionLoading === 'restart' ? <CircularProgress size={20} /> : <RestartIcon />}
                  onClick={() => handleAction('restart')}
                  disabled={!!actionLoading}
                >
                  Restart Server
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  startIcon={actionLoading === 'stop' ? <CircularProgress size={20} /> : <StopIcon />}
                  onClick={() => handleAction('stop')}
                  disabled={!!actionLoading}
                >
                  Stop Server
                </Button>
              </>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Server Information */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Server Information
              </Typography>
              {server.status === 'running' && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
                  onClick={handleSyncProperties}
                  disabled={syncing}
                >
                  {syncing ? 'Syncing...' : 'Sync from Server'}
                </Button>
              )}
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Minecraft Version
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {server.minecraftVersion}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Mod Loader
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, textTransform: 'capitalize' }}>
                  {server.modLoader}
                </Typography>
              </Box>
              {server.modLoaderVersion && (
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Mod Loader Version
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {server.modLoaderVersion}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Port
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {server.port}
                </Typography>
              </Box>
              {server.seed && (
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    World Seed
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                    {server.seed}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Created
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {new Date(server.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Game Settings
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Difficulty
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, textTransform: 'capitalize' }}>
                  {server.settings?.difficulty || 'normal'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Game Mode
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, textTransform: 'capitalize' }}>
                  {server.settings?.gamemode || 'survival'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Max Players
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {server.settings?.maxPlayers || 20}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  View Distance
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {server.settings?.viewDistance || 10} chunks
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  PvP
                </Typography>
                <Chip
                  label={server.settings?.pvp !== false ? 'Enabled' : 'Disabled'}
                  color={server.settings?.pvp !== false ? 'success' : 'default'}
                  size="small"
                />
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Online Mode
                </Typography>
                <Chip
                  label={server.settings?.onlineMode !== false ? 'Enabled' : 'Disabled'}
                  color={server.settings?.onlineMode !== false ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Server Resources */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Server Resources
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleOpenResourceDialog}
              disabled={server.status === 'running'}
            >
              Edit Resources
            </Button>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Memory (RAM)
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 500 }}>
                {server.memory || '2G'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Allocated to Minecraft server
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                CPU Limit
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 500 }}>
                {server.cpuLimit ? `${server.cpuLimit} cores` : 'Unlimited'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Maximum CPU cores to use
              </Typography>
            </Box>
          </Box>
          {server.status === 'running' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Stop the server to edit resource limits. Changes require container recreation.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* All Settings Accordion */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">All Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Allow Nether
              </Typography>
              <Chip label={server.settings?.allowNether !== false ? 'Yes' : 'No'} size="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Allow Flight
              </Typography>
              <Chip label={server.settings?.allowFlight ? 'Yes' : 'No'} size="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Spawn Monsters
              </Typography>
              <Chip label={server.settings?.spawnMonsters !== false ? 'Yes' : 'No'} size="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Spawn Animals
              </Typography>
              <Chip label={server.settings?.spawnAnimals !== false ? 'Yes' : 'No'} size="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Spawn NPCs
              </Typography>
              <Chip label={server.settings?.spawnNpcs !== false ? 'Yes' : 'No'} size="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Whitelist
              </Typography>
              <Chip label={server.settings?.whitelist ? 'Enabled' : 'Disabled'} size="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Command Blocks
              </Typography>
              <Chip label={server.settings?.enableCommandBlock ? 'Enabled' : 'Disabled'} size="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Simulation Distance
              </Typography>
              <Typography variant="body2">{server.settings?.simulationDistance || 10} chunks</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Level Type
              </Typography>
              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                {server.settings?.levelType || 'default'}
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              MOTD (Message of the Day)
            </Typography>
            <Typography variant="body2">{server.settings?.motd || 'A Minecraft Server'}</Typography>
          </Box>
        </AccordionDetails>
      </Accordion>
      </>
      )}

      {/* Tab Panel: Mods */}
      {tabValue === 1 && (
        <ServerModsV2
          serverId={serverId}
          serverMinecraftVersion={server.minecraftVersion}
          serverModLoader={server.modLoader}
        />
      )}

      {/* Tab Panel: Recipes */}
      {tabValue === 2 && (
        <RecipeManager serverId={serverId} />
      )}

      {/* Tab Panel: Console (only when server is running) */}
      {server.status === 'running' && tabValue === 3 && (
        <ServerConsole serverId={serverId} />
      )}

      {/* Tab Panel: Logs */}
      {tabValue === (server.status === 'running' ? 4 : 3) && (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Server Logs
            </Typography>
            <IconButton onClick={fetchLogs} size="small" title="Refresh logs">
              <RefreshIcon />
            </IconButton>
          </Box>
          <Paper
            sx={{
              p: 2,
              backgroundColor: '#1e1e1e',
              maxHeight: '400px',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
            }}
          >
            <pre style={{ margin: 0, color: '#d4d4d4', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {logs || 'No logs available. Start the server to see logs.'}
            </pre>
          </Paper>
        </CardContent>
      </Card>
      )}

      {/* Tab Panel: Settings */}
      {tabValue === (server.status === 'running' ? 5 : 4) && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              All Server Settings
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Difficulty
                </Typography>
                <Chip label={server.settings?.difficulty || 'normal'} size="small" sx={{ textTransform: 'capitalize' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Game Mode
                </Typography>
                <Chip label={server.settings?.gamemode || 'survival'} size="small" sx={{ textTransform: 'capitalize' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Max Players
                </Typography>
                <Typography variant="body2">{server.settings?.maxPlayers || 20}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  PvP
                </Typography>
                <Chip label={server.settings?.pvp !== false ? 'Enabled' : 'Disabled'} size="small" />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  View Distance
                </Typography>
                <Typography variant="body2">{server.settings?.viewDistance || 10} chunks</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Allow Nether
                </Typography>
                <Chip label={server.settings?.allowNether !== false ? 'Yes' : 'No'} size="small" />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Allow Flight
                </Typography>
                <Chip label={server.settings?.allowFlight ? 'Yes' : 'No'} size="small" />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Spawn Monsters
                </Typography>
                <Chip label={server.settings?.spawnMonsters !== false ? 'Yes' : 'No'} size="small" />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Spawn Animals
                </Typography>
                <Chip label={server.settings?.spawnAnimals !== false ? 'Yes' : 'No'} size="small" />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Spawn NPCs
                </Typography>
                <Chip label={server.settings?.spawnNpcs !== false ? 'Yes' : 'No'} size="small" />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Whitelist
                </Typography>
                <Chip label={server.settings?.whitelist ? 'Enabled' : 'Disabled'} size="small" />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Command Blocks
                </Typography>
                <Chip label={server.settings?.enableCommandBlock ? 'Enabled' : 'Disabled'} size="small" />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Simulation Distance
                </Typography>
                <Typography variant="body2">{server.settings?.simulationDistance || 10} chunks</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Level Type
                </Typography>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {server.settings?.levelType || 'default'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Online Mode
                </Typography>
                <Chip label={server.settings?.onlineMode !== false ? 'Enabled' : 'Disabled'} size="small" />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  MOTD (Message of the Day)
                </Typography>
                <Typography variant="body2">{server.settings?.motd || 'A Minecraft Server'}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Resource Edit Dialog */}
      <Dialog open={resourceDialogOpen} onClose={() => setResourceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Server Resources</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            Changing resources requires stopping and recreating the container. Server must be stopped to apply changes.
          </Alert>

          <TextField
            label="Memory (RAM)"
            fullWidth
            value={editMemory}
            onChange={(e) => setEditMemory(e.target.value)}
            helperText="Examples: 2G, 4G, 8G, 10G (G = Gigabytes, M = Megabytes)"
            sx={{ mb: 3 }}
          />

          <TextField
            label="CPU Limit (optional)"
            fullWidth
            type="number"
            value={editCpuLimit}
            onChange={(e) => setEditCpuLimit(e.target.value)}
            helperText="Number of CPU cores to limit (e.g., 2, 4). Leave empty for unlimited."
            inputProps={{ min: 0.5, max: 16, step: 0.5 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResourceDialogOpen(false)} disabled={updatingResources}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateResources}
            variant="contained"
            disabled={updatingResources}
            startIcon={updatingResources ? <CircularProgress size={20} /> : null}
          >
            {updatingResources ? 'Updating...' : 'Update Resources'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Save as SaveIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface ServerFormData {
  name: string;
  port: number;
  minecraftVersion: string;
  modLoader: string;
  modLoaderVersion: string;
  seed: string;
  settings: {
    difficulty: string;
    gamemode: string;
    maxPlayers: number;
    pvp: boolean;
    allowNether: boolean;
    allowFlight: boolean;
    spawnMonsters: boolean;
    spawnAnimals: boolean;
    spawnNpcs: boolean;
    viewDistance: number;
    simulationDistance: number;
    levelType: string;
    motd: string;
    onlineMode: boolean;
    whitelist: boolean;
    enableCommandBlock: boolean;
  };
}

const defaultFormData: ServerFormData = {
  name: '',
  port: 25565,
  minecraftVersion: '',
  modLoader: 'vanilla',
  modLoaderVersion: '',
  seed: '',
  settings: {
    difficulty: 'normal',
    gamemode: 'survival',
    maxPlayers: 20,
    pvp: true,
    allowNether: true,
    allowFlight: false,
    spawnMonsters: true,
    spawnAnimals: true,
    spawnNpcs: true,
    viewDistance: 10,
    simulationDistance: 10,
    levelType: 'default',
    motd: 'A Minecraft Server',
    onlineMode: true,
    whitelist: false,
    enableCommandBlock: false,
  },
};

interface ServerFormProps {
  serverId?: number;
  initialData?: Partial<ServerFormData>;
}

export default function ServerForm({ serverId, initialData }: ServerFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<ServerFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [minecraftVersions, setMinecraftVersions] = useState<string[]>([]);
  const [modLoaderVersions, setModLoaderVersions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchMinecraftVersions();
    if (serverId) {
      fetchServerData();
    }
  }, []);

  useEffect(() => {
    if (formData.modLoader !== 'vanilla' && formData.minecraftVersion) {
      fetchModLoaderVersions();
    } else {
      setModLoaderVersions([]);
    }
  }, [formData.modLoader, formData.minecraftVersion]);

  const fetchServerData = async () => {
    if (!serverId) return;

    try {
      setLoadingVersions(true);
      const response = await fetch(`/api/servers/${serverId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch server data');
      }
      const data = await response.json();
      const server = data.server;
      setFormData({
        name: server.name,
        port: server.port,
        minecraftVersion: server.minecraftVersion,
        modLoader: server.modLoader,
        modLoaderVersion: server.modLoaderVersion || '',
        seed: server.seed || '',
        settings: server.settings || defaultFormData.settings,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingVersions(false);
    }
  };

  const fetchMinecraftVersions = async () => {
    try {
      const response = await fetch('/api/versions?type=minecraft');
      const data = await response.json();
      const versions = data.versions.map((v: any) => v.id);
      setMinecraftVersions(versions);
      if (!formData.minecraftVersion && versions.length > 0) {
        setFormData(prev => ({ ...prev, minecraftVersion: versions[0] }));
      }
    } catch (error) {
      console.error('Error fetching Minecraft versions:', error);
    } finally {
      setLoadingVersions(false);
    }
  };

  const fetchModLoaderVersions = async () => {
    try {
      const type = formData.modLoader === 'neoforge' ? 'neoforge' : 'fabric';
      const response = await fetch(
        `/api/versions?type=${type}&minecraftVersion=${formData.minecraftVersion}`
      );
      const data = await response.json();
      const versions = data.versions.map((v: any) => v.version);
      setModLoaderVersions(versions);
      if (versions.length > 0 && !formData.modLoaderVersion) {
        setFormData(prev => ({ ...prev, modLoaderVersion: versions[0] }));
      }
    } catch (error) {
      console.error('Error fetching mod loader versions:', error);
    }
  };

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('settings.')) {
      const settingField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        settings: { ...prev.settings, [settingField]: value },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const url = serverId ? `/api/servers/${serverId}` : '/api/servers';
      const method = serverId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save server');
      }

      router.push('/servers');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingVersions) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Basic Settings" />
          <Tab label="Game Settings" />
          <Tab label="World & Spawn" />
          <Tab label="Player Settings" />
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {/* Tab 0: Basic Settings */}
          {activeTab === 0 && (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <TextField
                label="Server Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                fullWidth
              />

              <TextField
                label="Port"
                type="number"
                value={formData.port}
                onChange={(e) => handleChange('port', parseInt(e.target.value))}
                required
                fullWidth
                InputProps={{ inputProps: { min: 1024, max: 65535 } }}
              />

              <FormControl fullWidth required>
                <InputLabel>Minecraft Version</InputLabel>
                <Select
                  value={formData.minecraftVersion || ''}
                  label="Minecraft Version"
                  onChange={(e) => handleChange('minecraftVersion', e.target.value)}
                >
                  {minecraftVersions.map((version) => (
                    <MenuItem key={version} value={version}>
                      {version}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Mod Loader</InputLabel>
                <Select
                  value={formData.modLoader || 'vanilla'}
                  label="Mod Loader"
                  onChange={(e) => handleChange('modLoader', e.target.value)}
                >
                  <MenuItem value="vanilla">Vanilla (No Mods)</MenuItem>
                  <MenuItem value="neoforge">NeoForge</MenuItem>
                  <MenuItem value="fabric">Fabric</MenuItem>
                </Select>
              </FormControl>

              {formData.modLoader !== 'vanilla' && modLoaderVersions.length > 0 && (
                <FormControl fullWidth>
                  <InputLabel>Mod Loader Version</InputLabel>
                  <Select
                    value={formData.modLoaderVersion || ''}
                    label="Mod Loader Version"
                    onChange={(e) => handleChange('modLoaderVersion', e.target.value)}
                  >
                    {modLoaderVersions.map((version) => (
                      <MenuItem key={version} value={version}>
                        {version}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <TextField
                label="World Seed (Optional)"
                value={formData.seed}
                onChange={(e) => handleChange('seed', e.target.value)}
                fullWidth
                helperText="Leave blank for random generation"
              />
            </Box>
          )}

          {/* Tab 1: Game Settings */}
          {activeTab === 1 && (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={formData.settings.difficulty}
                  label="Difficulty"
                  onChange={(e) => handleChange('settings.difficulty', e.target.value)}
                >
                  <MenuItem value="peaceful">Peaceful</MenuItem>
                  <MenuItem value="easy">Easy</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="hard">Hard</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Game Mode</InputLabel>
                <Select
                  value={formData.settings.gamemode}
                  label="Game Mode"
                  onChange={(e) => handleChange('settings.gamemode', e.target.value)}
                >
                  <MenuItem value="survival">Survival</MenuItem>
                  <MenuItem value="creative">Creative</MenuItem>
                  <MenuItem value="adventure">Adventure</MenuItem>
                  <MenuItem value="spectator">Spectator</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Max Players"
                type="number"
                value={formData.settings.maxPlayers}
                onChange={(e) => handleChange('settings.maxPlayers', parseInt(e.target.value))}
                fullWidth
                InputProps={{ inputProps: { min: 1, max: 100 } }}
              />

              <TextField
                label="View Distance"
                type="number"
                value={formData.settings.viewDistance}
                onChange={(e) => handleChange('settings.viewDistance', parseInt(e.target.value))}
                fullWidth
                InputProps={{ inputProps: { min: 3, max: 32 } }}
              />

              <TextField
                label="Simulation Distance"
                type="number"
                value={formData.settings.simulationDistance}
                onChange={(e) => handleChange('settings.simulationDistance', parseInt(e.target.value))}
                fullWidth
                InputProps={{ inputProps: { min: 3, max: 32 } }}
              />

              <TextField
                label="Server MOTD"
                value={formData.settings.motd}
                onChange={(e) => handleChange('settings.motd', e.target.value)}
                fullWidth
                helperText="Message of the Day shown in server list"
              />
            </Box>
          )}

          {/* Tab 2: World & Spawn Settings */}
          {activeTab === 2 && (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.settings.spawnMonsters}
                    onChange={(e) => handleChange('settings.spawnMonsters', e.target.checked)}
                  />
                }
                label="Spawn Monsters"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.settings.spawnAnimals}
                    onChange={(e) => handleChange('settings.spawnAnimals', e.target.checked)}
                  />
                }
                label="Spawn Animals"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.settings.spawnNpcs}
                    onChange={(e) => handleChange('settings.spawnNpcs', e.target.checked)}
                  />
                }
                label="Spawn NPCs (Villagers)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.settings.allowNether}
                    onChange={(e) => handleChange('settings.allowNether', e.target.checked)}
                  />
                }
                label="Allow Nether"
              />
            </Box>
          )}

          {/* Tab 3: Player Settings */}
          {activeTab === 3 && (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.settings.pvp}
                    onChange={(e) => handleChange('settings.pvp', e.target.checked)}
                  />
                }
                label="PvP Enabled"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.settings.allowFlight}
                    onChange={(e) => handleChange('settings.allowFlight', e.target.checked)}
                  />
                }
                label="Allow Flight"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.settings.onlineMode}
                    onChange={(e) => handleChange('settings.onlineMode', e.target.checked)}
                  />
                }
                label="Online Mode (Mojang Authentication)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.settings.whitelist}
                    onChange={(e) => handleChange('settings.whitelist', e.target.checked)}
                  />
                }
                label="Enable Whitelist"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.settings.enableCommandBlock}
                    onChange={(e) => handleChange('settings.enableCommandBlock', e.target.checked)}
                  />
                }
                label="Enable Command Blocks"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {loading ? 'Saving...' : serverId ? 'Update Server' : 'Create Server'}
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
}

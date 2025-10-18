'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface Server {
  id: number;
  name: string;
  status: string;
  minecraftVersion: string;
  modLoader: string;
  port: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const response = await fetch('/api/servers');
      const data = await response.json();
      setServers(data.servers || []);
    } catch (error) {
      console.error('Error fetching servers:', error);
    } finally {
      setLoading(false);
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

  const runningServers = servers.filter(s => s.status === 'running').length;
  const stoppedServers = servers.filter(s => s.status === 'stopped').length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Dashboard
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => router.push('/servers/new')}
        >
          Create Server
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 4 }}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Servers
            </Typography>
            <Typography variant="h3" component="div">
              {servers.length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Running
            </Typography>
            <Typography variant="h3" component="div" color="success.main">
              {runningServers}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Stopped
            </Typography>
            <Typography variant="h3" component="div">
              {stoppedServers}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Mods
            </Typography>
            <Typography variant="h3" component="div">
              0
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Typography variant="h5" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
        Recent Servers
      </Typography>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : servers.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No servers yet
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 3 }}>
              Create your first Minecraft server to get started
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => router.push('/servers/new')}
            >
              Create Server
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          {servers.slice(0, 6).map((server) => (
            <Card key={server.id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    {server.name}
                  </Typography>
                  <Chip
                    label={server.status}
                    color={getStatusColor(server.status) as any}
                    size="small"
                  />
                </Box>
                <Typography color="textSecondary" variant="body2">
                  Version: {server.minecraftVersion}
                </Typography>
                <Typography color="textSecondary" variant="body2">
                  Mod Loader: {server.modLoader}
                </Typography>
                <Typography color="textSecondary" variant="body2">
                  Port: {server.port}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => router.push(`/servers/${server.id}`)}
                  >
                    View
                  </Button>
                  {server.status === 'stopped' && (
                    <Button size="small" startIcon={<StartIcon />}>
                      Start
                    </Button>
                  )}
                  {server.status === 'running' && (
                    <Button size="small" startIcon={<StopIcon />} color="error">
                      Stop
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {servers.length > 6 && (
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button variant="outlined" onClick={() => router.push('/servers')}>
            View All Servers
          </Button>
        </Box>
      )}
    </Box>
  );
}

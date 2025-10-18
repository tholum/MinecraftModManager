'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RestartIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface Server {
  id: number;
  name: string;
  status: string;
  minecraftVersion: string;
  modLoader: string;
  port: number;
  createdAt: string;
}

interface ServerListProps {
  onImportClick?: () => void;
}

export default function ServerList({ onImportClick }: ServerListProps) {
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/servers');
      const data = await response.json();
      setServers(data.servers || []);
    } catch (error) {
      console.error('Error fetching servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (serverId: number, action: 'start' | 'stop' | 'restart') => {
    try {
      setActionLoading(serverId);
      const response = await fetch(`/api/servers/${serverId}/${action}`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchServers();
      } else {
        console.error(`Failed to ${action} server`);
      }
    } catch (error) {
      console.error(`Error ${action}ing server:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (serverId: number, serverName: string) => {
    if (!confirm(`Are you sure you want to delete server "${serverName}"?`)) {
      return;
    }

    try {
      setActionLoading(serverId);
      const response = await fetch(`/api/servers/${serverId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchServers();
      } else {
        console.error('Failed to delete server');
      }
    } catch (error) {
      console.error('Error deleting server:', error);
    } finally {
      setActionLoading(null);
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

  if (servers.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" gutterBottom>
            No servers yet
          </Typography>
          <Typography color="textSecondary" sx={{ mb: 4 }}>
            Create your first Minecraft server or import an existing one
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              size="large"
              startIcon={<UploadIcon />}
              onClick={onImportClick}
            >
              Import Server
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={() => router.push('/servers/new')}
            >
              Create Server
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Version</TableCell>
            <TableCell>Mod Loader</TableCell>
            <TableCell>Port</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {servers.map((server) => (
            <TableRow key={server.id} hover>
              <TableCell>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {server.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={server.status}
                  color={getStatusColor(server.status) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>{server.minecraftVersion}</TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {server.modLoader}
                </Typography>
              </TableCell>
              <TableCell>{server.port}</TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                  <IconButton
                    size="small"
                    onClick={() => router.push(`/servers/${server.id}`)}
                    title="View details"
                  >
                    <ViewIcon fontSize="small" />
                  </IconButton>

                  {server.status === 'stopped' && (
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => handleAction(server.id, 'start')}
                      disabled={actionLoading === server.id}
                      title="Start server"
                    >
                      {actionLoading === server.id ? (
                        <CircularProgress size={20} />
                      ) : (
                        <StartIcon fontSize="small" />
                      )}
                    </IconButton>
                  )}

                  {server.status === 'running' && (
                    <>
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => handleAction(server.id, 'restart')}
                        disabled={actionLoading === server.id}
                        title="Restart server"
                      >
                        {actionLoading === server.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <RestartIcon fontSize="small" />
                        )}
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleAction(server.id, 'stop')}
                        disabled={actionLoading === server.id}
                        title="Stop server"
                      >
                        {actionLoading === server.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <StopIcon fontSize="small" />
                        )}
                      </IconButton>
                    </>
                  )}

                  <IconButton
                    size="small"
                    onClick={() => router.push(`/servers/${server.id}/edit`)}
                    title="Edit server"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(server.id, server.name)}
                    disabled={actionLoading === server.id}
                    title="Delete server"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

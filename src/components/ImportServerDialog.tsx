'use client';

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  Typography,
  LinearProgress,
  Paper,
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface ImportServerDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ImportServerDialog({ open, onClose }: ImportServerDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [port, setPort] = useState<number>(25565);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.tar.gz') && !selectedFile.name.endsWith('.tgz')) {
        setError('Please select a .tar.gz file');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!port || port < 1024 || port > 65535) {
      setError('Please enter a valid port (1024-65535)');
      return;
    }

    try {
      setImporting(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('port', port.toString());

      const response = await fetch('/api/servers/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import server');
      }

      // Close dialog and navigate to the new server
      onClose();
      router.push(`/servers/${data.server.id}`);
      router.refresh();
    } catch (error: any) {
      console.error('Error importing server:', error);
      setError(error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing) {
      setFile(null);
      setPort(25565);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Server</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Import a server from an exported backup. The backup file must be a .tar.gz file created by the Export World feature.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* File selection */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".tar.gz,.tgz"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          <Paper
            variant="outlined"
            sx={{
              p: 3,
              mb: 3,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: file ? 'action.hover' : 'background.paper',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body1" gutterBottom>
              {file ? file.name : 'Click to select server backup file'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {file
                ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                : 'Accepted formats: .tar.gz, .tgz'}
            </Typography>
          </Paper>

          {/* Port input */}
          <TextField
            fullWidth
            label="Server Port"
            type="number"
            value={port}
            onChange={(e) => setPort(parseInt(e.target.value, 10))}
            disabled={importing}
            inputProps={{ min: 1024, max: 65535 }}
            helperText="Port number for the new server (1024-65535)"
          />

          {importing && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1, textAlign: 'center' }}>
                Importing server... This may take a few minutes.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={importing}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={!file || importing}
        >
          Import Server
        </Button>
      </DialogActions>
    </Dialog>
  );
}

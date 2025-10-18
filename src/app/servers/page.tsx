'use client';

import AppShell from '@/components/AppShell';
import ServerList from '@/components/ServerList';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon, Upload as UploadIcon } from '@mui/icons-material';
import Link from 'next/link';
import ImportServerDialog from '@/components/ImportServerDialog';
import { useState } from 'react';

export default function ServersPage() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  return (
    <AppShell>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Servers
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setImportDialogOpen(true)}
            >
              Import Server
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              component={Link}
              href="/servers/new"
            >
              Create Server
            </Button>
          </Box>
        </Box>
        <ServerList onImportClick={() => setImportDialogOpen(true)} />
        <ImportServerDialog
          open={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
        />
      </Box>
    </AppShell>
  );
}

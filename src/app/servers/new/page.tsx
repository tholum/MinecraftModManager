import AppShell from '@/components/AppShell';
import ServerForm from '@/components/ServerForm';
import { Box, Typography } from '@mui/material';

export default function NewServerPage() {
  return (
    <AppShell>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
          Create New Server
        </Typography>
        <ServerForm />
      </Box>
    </AppShell>
  );
}

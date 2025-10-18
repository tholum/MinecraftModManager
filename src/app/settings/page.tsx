import AppShell from '@/components/AppShell';
import { Box, Typography } from '@mui/material';

export default function SettingsPage() {
  return (
    <AppShell>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
          Settings
        </Typography>
        <Typography>Settings view coming soon...</Typography>
      </Box>
    </AppShell>
  );
}

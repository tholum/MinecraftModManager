import AppShell from '@/components/AppShell';
import ModLibraryV2 from '@/components/ModLibraryV2';
import { Box } from '@mui/material';

export default function ModsPage() {
  return (
    <AppShell>
      <Box>
        <ModLibraryV2 />
      </Box>
    </AppShell>
  );
}

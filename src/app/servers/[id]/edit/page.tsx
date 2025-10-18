import AppShell from '@/components/AppShell';
import ServerForm from '@/components/ServerForm';
import { Box, Typography } from '@mui/material';

export default async function EditServerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const serverId = parseInt(id, 10);

  // In a real implementation, you would fetch the server data here
  // For now, the ServerForm component will fetch it

  return (
    <AppShell>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
          Edit Server
        </Typography>
        <ServerForm serverId={serverId} />
      </Box>
    </AppShell>
  );
}

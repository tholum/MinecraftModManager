import AppShell from '@/components/AppShell';
import ServerDetail from '@/components/ServerDetail';
import { Box } from '@mui/material';

export default async function ServerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const serverId = parseInt(id, 10);

  return (
    <AppShell>
      <Box>
        <ServerDetail serverId={serverId} />
      </Box>
    </AppShell>
  );
}

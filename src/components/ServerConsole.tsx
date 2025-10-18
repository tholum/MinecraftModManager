'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  IconButton,
  Paper,
  Alert,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Send as SendIcon,
  Build as BuildIcon,
} from '@mui/icons-material';

interface ConsoleMessage {
  type: 'command' | 'output' | 'error';
  text: string;
  timestamp: Date;
}

interface ServerConsoleProps {
  serverId: number;
}

export default function ServerConsole({ serverId }: ServerConsoleProps) {
  const [command, setCommand] = useState('');
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [executing, setExecuting] = useState(false);
  const [fixing, setFixing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const executeCommand = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!command.trim()) return;

    const cmdText = command.trim();
    setCommand('');
    setExecuting(true);

    // Add command to messages
    setMessages(prev => [...prev, {
      type: 'command',
      text: cmdText,
      timestamp: new Date(),
    }]);

    try {
      const response = await fetch(`/api/servers/${serverId}/console`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmdText }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, {
          type: 'output',
          text: data.output || 'Command executed successfully',
          timestamp: new Date(),
        }]);
      } else {
        setMessages(prev => [...prev, {
          type: 'error',
          text: data.error || 'Failed to execute command',
          timestamp: new Date(),
        }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        type: 'error',
        text: error.message || 'Network error',
        timestamp: new Date(),
      }]);
    } finally {
      setExecuting(false);
    }
  };

  const handleFixConsole = async () => {
    if (!confirm('This will enable RCON and restart the server. Continue?')) {
      return;
    }

    setFixing(true);
    setMessages(prev => [...prev, {
      type: 'output',
      text: 'Starting console fix... This will restart the server.',
      timestamp: new Date(),
    }]);

    try {
      const response = await fetch(`/api/servers/${serverId}/fix-console`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, {
          type: 'output',
          text: `Console fixed successfully!\n${data.steps.join('\n')}`,
          timestamp: new Date(),
        }]);
      } else {
        setMessages(prev => [...prev, {
          type: 'error',
          text: `Failed to fix console: ${data.error}`,
          timestamp: new Date(),
        }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        type: 'error',
        text: `Error: ${error.message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setFixing(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'command':
        return '#4FC3F7'; // Light blue
      case 'error':
        return '#EF5350'; // Red
      case 'output':
        return '#A5D6A7'; // Green
      default:
        return '#E0E0E0';
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Server Console
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={fixing ? <CircularProgress size={16} /> : <BuildIcon />}
            onClick={handleFixConsole}
            disabled={fixing}
            color="warning"
          >
            {fixing ? 'Fixing...' : 'Fix Console'}
          </Button>
        </Box>

        {messages.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Enter commands to execute on the server. Examples: <code>gamerule keepInventory true</code>, <code>op Username</code>
            <br />
            <strong>Not working?</strong> Click "Fix Console" to enable RCON (requires server restart).
          </Alert>
        )}

        {/* Console output */}
        <Paper
          sx={{
            bgcolor: '#1a1a1a',
            color: '#E0E0E0',
            p: 2,
            mb: 2,
            height: 400,
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            border: 1,
            borderColor: 'divider',
          }}
        >
          {messages.map((msg, index) => (
            <Box key={index} sx={{ mb: 1 }}>
              <Typography
                component="span"
                sx={{
                  color: '#666',
                  fontSize: '0.75rem',
                  mr: 1,
                }}
              >
                [{formatTime(msg.timestamp)}]
              </Typography>
              <Typography
                component="span"
                sx={{
                  color: getMessageColor(msg.type),
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.type === 'command' ? `> ${msg.text}` : msg.text}
              </Typography>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Paper>

        {/* Command input */}
        <Box
          component="form"
          onSubmit={executeCommand}
          sx={{ display: 'flex', gap: 1 }}
        >
          <TextField
            fullWidth
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Enter command (e.g., gamerule keepInventory true)"
            disabled={executing}
            variant="outlined"
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                fontFamily: 'monospace',
              },
            }}
          />
          <IconButton
            type="submit"
            color="primary"
            disabled={executing || !command.trim()}
            sx={{ flexShrink: 0 }}
          >
            <SendIcon />
          </IconButton>
        </Box>

        {/* Quick commands */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ width: '100%', color: 'text.secondary' }}>
            Quick commands:
          </Typography>
          {[
            'gamerule keepInventory true',
            'gamerule doFireTick false',
            'difficulty peaceful',
            'weather clear',
            'time set day',
          ].map((quickCmd) => (
            <Typography
              key={quickCmd}
              component="button"
              type="button"
              onClick={() => setCommand(quickCmd)}
              sx={{
                fontSize: '0.75rem',
                padding: '4px 8px',
                bgcolor: 'action.hover',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                cursor: 'pointer',
                fontFamily: 'monospace',
                color: 'text.primary',
                '&:hover': {
                  bgcolor: 'action.selected',
                },
              }}
            >
              {quickCmd}
            </Typography>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

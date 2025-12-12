import { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Alert,
  Button,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useFormDefinition } from '@/lib/form';
import { profileFormDefinition } from '@/forms/profile';

export function ProfilePage() {
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null);
  const { RenderedForm } = useFormDefinition(profileFormDefinition);

  const handleSubmit = (data: Record<string, unknown>) => {
    console.log('Profile form submitted:', data);
    setSubmittedData(data);
  };

  if (submittedData) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Profile updated successfully!
          </Alert>
          <Typography variant="h6" gutterBottom>
            Submitted Data:
          </Typography>
          <Box
            component="pre"
            sx={{
              bgcolor: 'grey.100',
              p: 2,
              borderRadius: 1,
              overflow: 'auto',
              fontSize: '0.875rem',
            }}
          >
            {JSON.stringify(submittedData, null, 2)}
          </Box>
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={() => setSubmittedData(null)}
            >
              Edit Profile
            </Button>
            <Button
              component={Link}
              to="/"
              variant="outlined"
            >
              Back to Home
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Edit Profile
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Update your profile information using Material UI components.
        </Typography>

        <RenderedForm onSubmit={handleSubmit} />

        <Box sx={{ mt: 2 }}>
          <Button component={Link} to="/" variant="text">
            &larr; Back to Home
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

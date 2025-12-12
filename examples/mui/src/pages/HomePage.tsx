import {
  Container,
  Typography,
  Paper,
  Box,
  List,
  ListItem,
  ListItemText,
  Card,
  CardActionArea,
  CardContent,
  Divider,
} from '@mui/material';
import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          use-form-definition
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Material UI Example
        </Typography>

        <Typography variant="body1" sx={{ mb: 3 }}>
          This example demonstrates integrating use-form-definition with Material UI components.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Example Forms
          </Typography>
          <Card variant="outlined">
            <CardActionArea component={Link} to="/profile">
              <CardContent>
                <Typography variant="subtitle1" color="primary">
                  Profile Form
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Demonstrates various MUI field types
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Features Demonstrated
          </Typography>
          <List dense disablePadding>
            <ListItem>
              <ListItemText primary="MUI TextField with floating labels" />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText primary="MUI Select and Autocomplete" />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText primary="MUI DatePicker with hidden input pattern" />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText primary="MUI Grid2 responsive layout" />
            </ListItem>
            <Divider component="li" />
            <ListItem>
              <ListItemText primary="No Field wrapper (ignoreFieldWrapper)" />
            </ListItem>
          </List>
        </Box>
      </Paper>
    </Container>
  );
}

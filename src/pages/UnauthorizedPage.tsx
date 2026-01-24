import { Box, Typography } from "@mui/material";

const UnauthorizedPage = () => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
    >
      <Typography variant="h1" color="error" gutterBottom>
        403
      </Typography>
      <Typography variant="h5" gutterBottom>
        Unauthorized Access
      </Typography>
      <Typography variant="body1" color="text.secondary">
        You don't have permission to access this page.
      </Typography>
    </Box>
  );
};

export default UnauthorizedPage;

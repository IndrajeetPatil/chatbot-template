import PersonIcon from "@mui/icons-material/Person";
import { Box, Paper, Typography } from "@mui/material";
import type React from "react";
import { useIsDark } from "@/client/hooks";

interface UserMessageProps {
  content: string;
}

const USER_MESSAGE_CONTAINER_SX = {
  display: "flex",
  justifyContent: "flex-end",
  mb: 2,
} as const;

const USER_MESSAGE_PAPER_SX = {
  maxWidth: "70%",
  p: 2,
  wordWrap: "break-word",
} as const;

const USER_MESSAGE_COLORS = {
  dark: {
    icon: "#90caf9",
    paper: "#1a237e",
    text: "common.white",
  },
  light: {
    icon: "#1976d2",
    paper: "#e3f2fd",
    text: "inherit",
  },
} as const;

const UserMessage: React.FC<UserMessageProps> = ({ content }) => {
  const isDark = useIsDark();
  const colors = isDark ? USER_MESSAGE_COLORS.dark : USER_MESSAGE_COLORS.light;

  return (
    <Box sx={USER_MESSAGE_CONTAINER_SX}>
      <Paper
        elevation={2}
        sx={[USER_MESSAGE_PAPER_SX, { backgroundColor: colors.paper }]}
      >
        <PersonIcon sx={{ color: colors.icon }} />
        <Typography
          variant="body1"
          component="div"
          sx={{ color: colors.text }}
        >
          {content}
        </Typography>
      </Paper>
    </Box>
  );
};

export default UserMessage;

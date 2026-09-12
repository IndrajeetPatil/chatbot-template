import { Box, Typography } from "@mui/material";

interface UserMessageProps {
  content: string;
}

const USER_MESSAGE_CONTAINER_SX = {
  display: "flex",
  justifyContent: "flex-end",
} as const;

const USER_MESSAGE_PAPER_SX = {
  maxWidth: { xs: "90%", sm: "80%" },
  bgcolor: "action.hover",
  border: 1,
  borderColor: "divider",
  borderRadius: "20px 20px 4px 20px",
  px: 2.5,
  py: 1.5,
  overflowWrap: "anywhere",
} as const;

function UserMessage({ content }: UserMessageProps) {
  return (
    <Box sx={USER_MESSAGE_CONTAINER_SX}>
      <Box sx={USER_MESSAGE_PAPER_SX}>
        <Typography
          component="div"
          variant="caption"
          sx={{ color: "text.secondary", mb: 0.5 }}
        >
          You
        </Typography>
        <Typography
          variant="body1"
          component="div"
          sx={{ whiteSpace: "pre-wrap" }}
        >
          {content}
        </Typography>
      </Box>
    </Box>
  );
}

export default UserMessage;

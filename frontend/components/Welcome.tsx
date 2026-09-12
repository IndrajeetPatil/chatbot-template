import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import { Box, Button, Typography } from "@mui/material";

const SUGGESTIONS = [
  {
    title: "Understand something",
    prompt: "Explain a complex idea in simple terms.",
  },
  {
    title: "Make something",
    prompt: "Help me turn an idea into a clear plan.",
  },
  {
    title: "Explore a possibility",
    prompt: "Give me a creative exercise to spark new ideas.",
  },
];

export default function Welcome({
  onSendMessage,
}: {
  onSendMessage: (message: string) => Promise<void>;
}) {
  return (
    <Box sx={{ my: "auto", py: { xs: 1, sm: 6 } }}>
      <Typography
        variant="overline"
        sx={{
          color: "primary.main",
          letterSpacing: "0.16em",
          display: { xs: "none", sm: "block" },
        }}
      >
        A little curiosity goes a long way
      </Typography>
      <Typography
        component="h2"
        sx={{
          fontSize: { xs: "2.5rem", sm: "3.75rem" },
          fontWeight: 450,
          letterSpacing: "-0.055em",
          lineHeight: 1.1,
          maxWidth: 600,
          mt: { xs: 0, sm: 2 },
          textWrap: "balance",
        }}
      >
        Where should we begin?
      </Typography>
      <Typography
        sx={{
          color: "text.secondary",
          mt: 2,
          maxWidth: 440,
          fontSize: { xs: "0.875rem", sm: "1rem" },
        }}
      >
        Bring a question, a rough idea, or a fresh perspective. Let’s work
        through it together.
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 1.5,
          mt: { xs: 3, sm: 5 },
        }}
      >
        {SUGGESTIONS.map(({ title, prompt }) => (
          <Button
            key={title}
            onClick={() => void onSendMessage(prompt)}
            sx={{
              alignItems: "flex-start",
              border: 1,
              borderColor: "divider",
              color: "text.primary",
              flexDirection: "column",
              p: { xs: 1.5, sm: 2 },
              textAlign: "left",
              gap: 1,
              "&:hover": {
                borderColor: "primary.main",
                backgroundColor: "action.hover",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                gap: 1,
              }}
            >
              {title}
              <ArrowOutwardIcon
                sx={{ fontSize: 16, color: "text.secondary" }}
              />
            </Box>
            <Typography
              component="span"
              variant="body2"
              sx={{ color: "text.secondary" }}
            >
              {prompt}
            </Typography>
          </Button>
        ))}
      </Box>
    </Box>
  );
}

import type { Comment } from "../types/Comment";

export const mockComments: Comment[] = [
  {
    id: "1",
    author: "user123",
    content:
      "AI tools in education can enhance productivity if used responsibly and with proper guidance.",
    reasoningScore: 8.5,
    summary:
      "Claims AI improves productivity in education when guided properly, provides conditional reasoning."
  },
  {
    id: "2",
    author: "debateGuy",
    content:
      "AI is ruining learning because students rely on it too much without understanding concepts.",
    reasoningScore: 6.2,
    summary:
      "Argues AI harms learning due to over-reliance; lacks supporting evidence."
  },
  {
    id: "3",
    author: "researchPro",
    content:
      "Studies show blended AI-assisted learning improves retention rates by 15% in controlled trials.",
    reasoningScore: 9.1,
    summary:
      "Provides evidence-backed claim citing research data, strong structured reasoning."
  }
];

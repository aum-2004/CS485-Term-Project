import type { Comment } from "../types/Comment";

export const mockComments: Comment[] = [
  {
    id: "1",
    author: "PhilosophyDebater",
    content:
      "I think the fundamental issue here is that we’re conflating correlation with causation. The data shows a relationship, but it doesn’t prove that one thing directly causes another. We need to consider confounding variables and alternative explanations before drawing any definitive conclusions.",
    summary:
      "Argues against assuming causation from correlation, emphasizing need for deeper analysis of confounding factors.",
    reasoningScore: 94
  },
  {
    id: "2",
    author: "LogicEnthusiast",
    content:
      "Both of you make valid points, but I think we’re missing the bigger picture. The methodology section clearly states they used a longitudinal study design over 5 years, which helps establish temporal precedence. This isn’t just correlation – there’s a time component that strengthens the causal inference.",
    summary:
      "Highlights longitudinal design and temporal precedence as evidence supporting causal relationship beyond mere correlation.",
    reasoningScore: 92
  },
  {
    id: "3",
    author: "DataScientist2024",
    content:
      "While I agree with the general sentiment, I’d like to point out that the study actually did control for several confounding variables using multivariate regression analysis. The p-value was less than 0.01, which suggests statistical significance. However, I do think the sample size could have been larger.",
    summary:
      "Supports causation with statistical evidence, notes controls were implemented but acknowledges sample size limitation.",
    reasoningScore: 89
  },
  {
    id: "4",
    author: "ResearchPro",
    content:
      "Let’s take a step back and examine the theoretical framework. The researchers based their hypothesis on established psychological theories like cognitive dissonance and confirmation bias. Even if the execution had minor flaws, the theoretical foundation is solid and the findings align with decades of prior research.",
    summary:
      "Defends research by emphasizing strong theoretical foundation and consistency with existing literature.",
    reasoningScore: 88
  },
  {
    id: "5",
    author: "CriticalThinker99",
    content:
      "I disagree entirely. The study has serious methodological flaws. The sample was not representative of the general population – it was skewed heavily toward urban areas with higher income brackets. Any conclusions drawn from this data cannot be generalized without significant caveats.",
    summary:
      "Criticizes study methodology citing non-representative sampling and generalizability concerns.",
    reasoningScore: 86
  },
  {
    id: "6",
    author: "SkepticalReader",
    content:
      "Another issue is publication bias. We only see studies that found statistically significant results. It’s possible that several null-result studies were never published. That means the evidence base might be distorted in favor of stronger claims than reality supports.",
    summary:
      "Raises concern about publication bias potentially distorting the strength of evidence.",
    reasoningScore: 84
  },
  {
    id: "7",
    author: "BalancedPerspective",
    content:
      "I think the truth probably lies somewhere in the middle. The study provides useful evidence, but it should be interpreted as probabilistic rather than deterministic. Social science research rarely produces absolute conclusions — it refines likelihoods.",
    summary:
      "Advocates balanced interpretation, framing conclusions as probabilistic rather than absolute.",
    reasoningScore: 82
  }
];
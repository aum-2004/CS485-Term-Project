# Development Specification: US1 - Inline AI Reasoning Summary

## Overview

This document specifies the development of the Inline AI Reasoning Summary feature for new users, enabling quick understanding of comment quality through AI-generated reasoning summaries displayed inline next to each comment.

**User Story**: As a new user, I want an inline AI summary of a comment's reasoning so that I can quickly understand its main claims and supporting evidence.

**T-Shirt Size**: Small

Rationale: The fact that users leave lengthy Reddit threads because of repetition and buried, excellent arguments is directly addressed by this feature. It must be put into practice first since it is the cornerstone of the product's value proposition.
LLM Interaction:
Prompt: Generate a development specification header for an inline AI debate summary feature including sprint assignment, priority, and dependencies.
Response:
Feature Name: Inline AI Debate Summary
User Story: As a Reddit reader, I want to see an AI-generated reasoning-based summary of a discussion so that I can quickly understand the strongest arguments without reading the entire thread.
Sprint Assignment: Sprint 1 (2-week sprint)
	Priority: High
	Dependencies: None
Description:
The Inline AI Debate Summary feature analyzes Reddit discussion threads using a large language model to extract key arguments, opposing viewpoints, and reasoning quality indicators. The feature generates a structured summary that appears within the thread interface, allowing users to quickly understand the substance of the debate without reading all comments.
Justification:
This feature addresses the core user pain point identified during interviews: difficulty navigating long threads and identifying high-quality arguments. It serves as the foundational capability upon which other AI-assisted features will build.


---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Reddit Clone UI - Comment Display Component            │   │
│  │  - Comment Text                                          │   │
│  │  - ▼ [Show AI Summary] (Expandable)                     │   │
│  │  - AI Summary Panel (1-2 sentences)                     │   │
│  └────────────────┬─────────────────────────────────────────┘   │
└─────────────────┼──────────────────────────────────────────────┘
                  │ HTTP/REST
                  │ GET /api/v1/comments/{commentId}/reasoning-summary
                  │ Response: { summary, claim, evidence, coherence }
                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Backend Server (Node.js)                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  API Routes Layer                                          │  │
│  │  - GET /api/v1/comments/{commentId}/reasoning-summary     │  │
│  └────────────────┬───────────────────────────────────────────┘  │
│                   │                                               │
│  ┌────────────────▼───────────────────────────────────────────┐  │
│  │  AI Analysis Service                                       │  │
│  │  - parseCommentText()                                      │  │
│  │  - extractClaims()                                         │  │
│  │  - extractEvidence()                                       │  │
│  │  - evaluateCoherence()                                     │  │
│  │  - generateSummary()                                       │  │
│  └────────────────┬───────────────────────────────────────────┘  │
│                   │                                               │
│  ┌────────────────┼──────────────────────────────────────────┐   │
│  │  Data Access Layer                                         │   │
│  │  - commentRepository.getById()                             │   │
│  │  - reasoningSummaryCache.get/set()                         │   │
│  └────────────────┬──────────────┬────────────────────────────┘   │
└─────────────────┼──────────────┼─────────────────────────────────┘
                  │              │
    ┌─────────────▼────────┐     │
    │  PostgreSQL DB       │     │
    │  - comments table    │     │
    │  - summaries table   │     │
    └──────────────────────┘     │
                          ┌──────▼──────────────┐
                          │  Redis Cache        │
                          │  - summary_cache    │
                          │  - key: commentId   │
                          └─────────────────────┘
```

**Component Locations**:

- **Client**: Browser-based React component
- **API Server**: Node.js/Express backend (AWS EC2 or similar)
- **Database**: PostgreSQL (primary data store)
- **Cache**: Redis (in-memory summaries cache)

**Information Flows**:

1. User clicks "Show AI Summary" on comment
2. Client sends GET request to API with `commentId`
3. API checks Redis cache first
4. If cache miss, API retrieves comment from PostgreSQL
5. AI Analysis Service processes comment text
6. Summary is cached in Redis for subsequent requests
7. Response returned to client and displayed

Rationale: Separation of concerns is ensured by a layered architecture. To safeguard API keys, AI processing is managed on the server side. Redis improves response latency and lowers API costs.

---

## Class Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                  ReasoningSummaryController                        │
├────────────────────────────────────────────────────────────────────┤
│ - reasoningSummaryService: ReasoningSummaryService                │
├────────────────────────────────────────────────────────────────────┤
│ + GET /comments/{id}/reasoning-summary(req): Promise<Response>    │
└────────────────┬─────────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────────┐
│                    ReasoningSummaryService                        │
├────────────────────────────────────────────────────────────────────┤
│ - aiAnalysisService: AIAnalysisService                            │
│ - cacheService: CacheService                                      │
│ - commentRepository: CommentRepository                            │
│ - reasoningSummaryRepository: ReasoningSummaryRepository          │
├────────────────────────────────────────────────────────────────────┤
│ + getSummary(commentId: string): Promise<ReasoningSummary>        │
│ + generateAndCacheSummary(comment: Comment): Promise<void>        │
│ + invalidateCache(commentId: string): Promise<void>               │
└──────────┬──────────────────────┬──────────────────┬─────────────┘
           │                      │                  │
    ┌──────▼──────┐    ┌──────────▼────────┐    ┌────▼──────────────┐
    │AIAnalysis   │    │CacheService      │    │CommentValidator   │
    │Service      │    ├──────────────────┤    ├───────────────────┤
    ├─────────────┤    │-redisClient:Redis│    │+ validate(text):  │
    │-openaiClient│    ├──────────────────┤    │  Promise<bool>    │
    │-nlpProcessor│    │+ get(key): object│    │+ sanitize(text):  │
    ├─────────────┤    │+ set(key, value):│    │  string           │
    │+extractClaims│   │  Promise<void>   │    └───────────────────┘
    │+extractEvid.│    │+ delete(key):    │
    │+evaluateCoherence│  Promise<void>  │
    │+generateSum │    │+ exists(key):bool│
    └─────┬───────┘    └──────┬──────────┘
          │                    │
          └────────┬───────────┘
                   │
    ┌──────────────▼──────────────────┐
    │    ReasoningSummary (DTO)        │
    ├──────────────────────────────────┤
    │ - commentId: string               │
    │ - summary: string                 │
    │ - primaryClaim: string            │
    │ - evidenceBlocks: EvidenceBlock[] │
    │ - coherenceScore: number (0-1)    │
    │ - generatedAt: Date               │
    └──────────────┬───────────────────┘
                   │
        ┌──────────┼──────────┐
        │                     │
    ┌───▼──────┐      ┌──────▼────────┐
    │ Claim    │      │ EvidenceBlock │
    ├──────────┤      ├───────────────┤
    │- id      │      │- type         │
    │- text    │      │- content      │
    │- support │      │- strength     │
    └──────────┘      └───────────────┘
        │
┌───────▼─────────┬──────────────────────┬──────────────────┐
│CommentRepository│ReasoningSummaryRepo  │  NLPProcessor    │
├─────────────────┤────────────────────────┤──────────────────┤
│+ getById(id):   │+ save(summary):        │+ tokenize(text):  │
│  Promise<Cmt>   │  Promise<void>         │  string[]          │
│+ save(cmt):     │+ update(summary):      │+ parseSentences(): │
│  Promise<void>  │  Promise<void>         │  Sentence[]        │
└─────────────────┴────────────────────────┴──────────────────┘
```
Rationale: Every class adheres to the principles of single responsibility. By separating LLM interaction, AIAnalyzer avoids a close coupling between AI logic and controllers.

---

## List of Classes

| Class Name                   | Package      | Responsibility                                         |
| ---------------------------- | ------------ | ------------------------------------------------------ |
| `ReasoningSummaryService`    | services     | Orchestrates summary generation and retrieval          |
| `ReasoningSummaryController` | controllers  | HTTP request handler for summary endpoints             |
| `AIAnalysisService`          | services     | AI-powered text analysis (claims, evidence, coherence) |
| `CacheService`               | services     | Redis cache management                                 |
| `CommentRepository`          | repositories | Database access for comments                           |
| `ReasoningSummaryRepository` | repositories | Database access for cached summaries                   |
| `ReasoningSummary`           | models/dtos  | Data Transfer Object for summary response              |
| `Claim`                      | models       | Represents extracted claim from text                   |
| `EvidenceBlock`              | models       | Represents piece of evidence supporting a claim        |
| `NLPProcessor`               | utils        | Natural Language Processing utilities                  |
| `CommentValidator`           | utils        | Validation for comment text input                      |

Rationale: Certain listing makes sure that there is consistency in the implementation and that there is no mismatch between the diagram and the actual system elements.

---


## State Diagrams

### Summary Generation State Machine

```
┌─────────────┐
│   Idle      │
└──────┬──────┘
       │ GET /comments/{id}/reasoning-summary
       ▼
┌──────────────────┐
│  Checking Cache  │
└──────┬───────────┘
       │
       ├─ (Cache Hit) ──────────────────────────┐
       │                                         │
       └─ (Cache Miss) ──────────────┐          │
                                     │          │
                         ┌───────────▼──────┐   │
                         │ Fetching Comment │   │
                         └───────────┬──────┘   │
                                     │          │
                         ┌───────────▼──────┐   │
                         │  Analyzing Text  │   │
                         │  - Extract Claims│   │
                         │  - Extract Evid. │   │
                         │  - Score Cohere. │   │
                         └───────────┬──────┘   │
                                     │          │
                         ┌───────────▼──────┐   │
                         │ Generating Summary   │
                         └───────────┬──────┘   │
                                     │          │
                         ┌───────────▼──────┐   │
                         │  Caching Summary │   │
                         └───────────┬──────┘   │
                                     │          │
       ┌─────────────────────────────┘          │
       │                                         │
       └────────────┬──────────────────────────┘
                    │
       ┌────────────▼──────────┐
       │ Returning Response    │
       └────────────┬──────────┘
                    │
       ┌────────────▼──────────┐
       │ Idle                  │
       └───────────────────────┘
```
Rationale: This state model supports future streaming updates and also enables asynchronous processing behaviour to be better understood.


---

## Flow Chart

```
START
  │
  ▼
User Clicks "Show AI Summary"
  │
  ▼
Client Sends: GET /api/v1/comments/{commentId}/reasoning-summary
  │
  ▼
┌─────────────────────────────┐
│ Check Redis Cache           │
│ Key: "summary:{commentId}"  │
└──────┬──────────────────────┘
       │
       ├─ [Cache Hit] ─────────────────────────────┐
       │                                            │
       └─ [Cache Miss] ──────────┐                 │
                                 │                 │
                      ┌──────────▼─────────────┐   │
                      │ Query PostgreSQL       │   │
                      │ Get comment by ID      │   │
                      └──────────┬─────────────┘   │
                                 │                 │
                      ┌──────────▼─────────────┐   │
                      │ Call OpenAI API*       │   │
                      │ Prompt: Analyze        │   │
                      │ - main claim           │   │
                      │ - evidence             │   │
                      │ - reasoning quality    │   │
                      └──────────┬─────────────┘   │
                                 │                 │
                      ┌──────────▼─────────────┐   │
                      │ Structure Response     │   │
                      │ as ReasoningSummary DTO   │
                      └──────────┬─────────────┘   │
                                 │                 │
                      ┌──────────▼─────────────┐   │
                      │ Cache Result in Redis  │   │
                      │ TTL: 24 hours          │   │
                      └──────────┬─────────────┘   │
                                 │                 │
       ┌─────────────────────────┘                 │
       │                                            │
       ├──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Return JSON Response:        │
│ {                            │
│   summary: string,           │
│   primaryClaim: string,      │
│   evidenceBlocks: [...],     │
│   coherenceScore: 0.85       │
│ }                            │
└──────────┬───────────────────┘
           │
           ▼
Client Displays Summary
Panel Below Comment
           │
           ▼
         END

* Note: Initial implementation uses OpenAI API;
  can be replaced with on-premise model later
```

	Rationale: This flow prioritizes performance as well as cost optimization.

---

## Development Risks and Failures

| Risk                         | Likelihood | Impact                                  | Mitigation                                                                    |
| ---------------------------- | ---------- | --------------------------------------- | ----------------------------------------------------------------------------- |
| **API Rate Limiting**        | High       | Service delays if OpenAI API limits hit | Implement request queuing, cache aggressively, monitor usage                  |
| **AI Summary Quality**       | Medium     | Poor summaries confuse users            | Extensive prompt engineering, user feedback loop, A/B testing                 |
| **Cache Staleness**          | Low        | Edited comments show old summaries      | Set reasonable TTL (24h), invalidate on comment edit                          |
| **Latency on First Load**    | High       | Slow response time impacts UX           | Cache warming, background job processing, optimize AI prompts                 |
| **Data Privacy**             | Medium     | Comments sent to 3rd-party AI service   | Use OpenAI enterprise agreement, anonymize if possible, encryption in transit |
| **Dependency on OpenAI**     | Medium     | Service unavailable if OpenAI down      | Graceful degradation, fallback handler, monitoring/alerting                   |
| **Scalability**              | Medium     | High traffic overwhelms Redis/DB        | Horizontal scaling plan, read replicas, consider distributed cache            |
| **Coherence Score Accuracy** | Medium     | Misleading quality scores               | Validate with domain experts, collect user feedback, iterate                  |

Rationale: Risk identification is done early, where mitigation planning is done in the context of a sprint.

---

## Technology Stack

| Layer          | Technology         | Version  | Purpose                                     |
| -------------- | ------------------ | -------- | ------------------------------------------- |
| **Frontend**   | React              | 18.x     | UI component for summary display            |
| **Frontend**   | TypeScript         | 5.x      | Type safety in client code                  |
| **Backend**    | Node.js            | 18.x LTS | Runtime environment                         |
| **Backend**    | Express.js         | 4.x      | HTTP API framework                          |
| **Backend**    | TypeScript         | 5.x      | Type safety in server code                  |
| **AI Service** | OpenAI API         | GPT-4    | Text analysis and summary generation        |
| **Database**   | PostgreSQL         | 14+      | Primary data store for comments/summaries   |
| **Cache**      | Redis              | 7.x      | In-memory cache for summaries               |
| **NLP**        | natural/compromise | Latest   | Optional local NLP fallback                 |
| **Testing**    | Jest               | 29.x     | Unit and integration testing                |
| **Async**      | Bull               | 4.x      | Job queue for background summary generation |


Rationale: Stack chosen for scalability, rapid development, and AI integration compatibility.

---

## APIs

### Public REST Endpoints

#### 1. Get Reasoning Summary

```http
GET /api/v1/comments/{commentId}/reasoning-summary
Authorization: Bearer {jwt_token}
```

**Query Parameters**:

- None

**Response** (200 OK):

```json
{
  "commentId": "c12345",
  "summary": "User claims climate change is driven by human activity, citing peer-reviewed studies on CO2 emission trends.",
  "primaryClaim": "Human activity is the primary driver of climate change",
  "evidenceBlocks": [
    {
      "type": "study",
      "content": "peer-reviewed studies on CO2 emission trends",
      "strength": "high"
    }
  ],
  "coherenceScore": 0.87,
  "generatedAt": "2026-02-11T10:30:00Z"
}
```

**Error Responses**:

- `400 Bad Request`: Invalid commentId format
- `404 Not Found`: Comment does not exist
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Processing error

Rationale: RESTful endpoints allow modular expansion for future AI features

---

## Public Interfaces

### Frontend Component Interfaces

```typescript
// ReasoningSummaryPanel Component
interface ReasoningSummaryPanelProps {
  commentId: string;
  isExpanded?: boolean;
  onSummaryLoaded?: (summary: ReasoningSummary) => void;
  theme?: "light" | "dark";
}

// ReasoningSummary DTO
interface ReasoningSummary {
  commentId: string;
  summary: string;
  primaryClaim: string;
  evidenceBlocks: EvidenceBlock[];
  coherenceScore: number; // 0 to 1
  generatedAt: Date;
}

interface EvidenceBlock {
  type: "study" | "data" | "anecdote" | "authority" | "other";
  content: string;
  strength: "high" | "medium" | "low";
}
```


### Backend Service Interfaces

```typescript
interface IReasoningSummaryService {
  getSummary(commentId: string): Promise<ReasoningSummary>;
  generateAndCacheSummary(comment: Comment): Promise<void>;
  invalidateCache(commentId: string): Promise<void>;
}

interface IAIAnalysisService {
  extractClaims(text: string): Promise<Claim[]>;
  extractEvidence(text: string): Promise<EvidenceBlock[]>;
  evaluateCoherence(
    claims: Claim[],
    evidence: EvidenceBlock[],
  ): Promise<number>;
  generateSummary(analysis: AnalysisResult): Promise<string>;
}
```

Rationale: Structured JSON supports flexible frontend rendering.

---

## Data Schemas

### PostgreSQL Tables

#### `reasoning_summaries` Table

```sql
CREATE TABLE reasoning_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id VARCHAR(255) NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  primary_claim TEXT NOT NULL,
  evidence_blocks JSONB NOT NULL,
  coherence_score NUMERIC(3, 2) CHECK (coherence_score >= 0 AND coherence_score <= 1),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX idx_reasoning_comment_id ON reasoning_summaries(comment_id);
CREATE INDEX idx_reasoning_expires_at ON reasoning_summaries(expires_at);
```

#### `evidence_blocks` Table (Denormalized in JSONB for this feature; alternative normalized structure)

```sql
CREATE TABLE evidence_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  strength VARCHAR(20) NOT NULL,
  FOREIGN KEY (summary_id) REFERENCES reasoning_summaries(id) ON DELETE CASCADE
);
```

### Redis Key Structure

```
reasoning_summary:{commentId} -> ReasoningSummary JSON object
TTL: 86400 seconds (24 hours)

Example key: reasoning_summary:c12345
{
  "commentId": "c12345",
  "summary": "...",
  "primaryClaim": "...",
  "evidenceBlocks": [...],
  "coherenceScore": 0.87,
  "generatedAt": "2026-02-11T10:30:00Z"
}
```
Rationale: Normalized storage prevents redundancy.

---

## Security and Privacy

### Data Protection

- **In Transit**: All API calls use HTTPS/TLS 1.3
- **At Rest**: PostgreSQL data encrypted at storage level
- **AI Service**: Comments sent to OpenAI under enterprise agreement with data processing addendum (DPA)
- **Cache**: Redis instance runs in private VPC, no public access

### Privacy Considerations

1. **Anonymization**: Remove personally identifiable information (PII) before sending to OpenAI if possible
2. **User Consent**: Display notice that comment text is processed by AI third-party service
3. **Data Retention**: Delete cached summaries after 24-hour TTL, purge from DB after 30 days if unused
4. **Access Control**: API endpoints require valid user session (JWT token validation)

### Authentication & Authorization

- **Authentication**: JWT token required for API access
- **Authorization**: Only comment author or moderator can request summary (optional restriction based on product decision)
- **Rate Limiting**: 100 requests per minute per user to prevent abuse

### Compliance

- **GDPR**: Support right-to-be-forgotten with comment deletion
- **CCPA**: Data retention policy complies with minimum necessary principle
- **AI Transparency**: Clear disclosure that summaries are AI-generated

Rationale: Ensures compliance with best practices

---

## Risks to Completion

1. **OpenAI API Costs**: Scaling to millions of comments could be expensive
   - _Mitigation_: Implement aggressive caching (24h TTL), batch process during off-peak hours

2. **Prompt Engineering Quality**: LLM may need many iterations to produce useful summaries
   - _Mitigation_: Allocate time for A/B testing, collect user feedback early

3. **Integration with Existing Comment System**: May require DB schema changes
   - _Mitigation_: Plan schema migration carefully, test with data backup

4. **Real-time Performance**: Summary generation adds latency to comment loading
   - _Mitigation_: Background job processing, show "loading" state, pre-generate for popular comments

5. **Maintaining Consistency**: Cache invalidation is complex
   - _Mitigation_: Clear TTL strategy, event-driven invalidation on comment edit

6. **Evaluation Metrics**: Difficult to measure summary quality objectively
   - _Mitigation_: User satisfaction surveys, benchmark against human reviewers

Rationale: Keeps sprint achievable within 2 weeks.

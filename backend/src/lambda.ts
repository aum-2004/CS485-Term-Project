/**
 * AWS Lambda entry point.
 *
 * Wraps the Express application with @vendia/serverless-express so that
 * API Gateway proxy events are translated into Express req/res cycles.
 *
 * Local development still uses server.ts (npm run dev).
 * Lambda deployment uses this file via the build output: dist/lambda.js
 */

import serverlessExpress from "@vendia/serverless-express";
import app from "./app";

// Use PROMISE resolution mode so the handler returns a Promise directly,
// which is compatible with all Node.js Lambda runtimes.
export const lambdaHandler = serverlessExpress({ app, resolutionMode: "PROMISE" });

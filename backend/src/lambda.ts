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
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import app from "./app";

// One-time bootstrap: create the adapter at cold-start, reuse across warm invocations.
const handler = serverlessExpress({ app });

export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Allow the Lambda execution to finish even if there are open handles
  // (e.g. pg connection pool) by not waiting for the event loop to drain.
  context.callbackWaitsForEmptyEventLoop = false;
  return handler(event, context) as Promise<APIGatewayProxyResult>;
};

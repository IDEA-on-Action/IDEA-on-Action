/**
 * Verify Token Tool
 *
 * MCP tool for verifying Supabase JWT tokens
 */

import { z } from 'zod';
import { verifyToken } from '../lib/jwt.js';

/**
 * Input schema for verify_token tool
 */
export const verifyTokenInputSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type VerifyTokenInput = z.infer<typeof verifyTokenInputSchema>;

/**
 * Output schema for verify_token tool
 */
export const verifyTokenOutputSchema = z.object({
  valid: z.boolean(),
  user_id: z.string().optional(),
  error: z.string().optional(),
});

export type VerifyTokenOutput = z.infer<typeof verifyTokenOutputSchema>;

/**
 * Tool metadata for verify_token
 */
export const VERIFY_TOKEN_METADATA = {
  name: 'verify_token',
  title: 'Verify Token',
  description:
    'Verifies a Supabase JWT token and returns validity status with user ID if valid',
};

/**
 * Execute the verify_token tool
 *
 * @param input - Tool input containing the token
 * @returns Tool output with validity status and user ID
 */
export async function executeVerifyToken(
  input: VerifyTokenInput
): Promise<VerifyTokenOutput> {
  // Validate input
  const parsed = verifyTokenInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      error: parsed.error.errors[0]?.message ?? 'Invalid input',
    };
  }

  // Verify the token
  const result = await verifyToken(parsed.data.token);

  if (result.valid) {
    return {
      valid: true,
      user_id: result.userId,
    };
  }

  return {
    valid: false,
    error: result.error,
  };
}

/**
 * Format the tool result for MCP response
 */
export function formatVerifyTokenResult(output: VerifyTokenOutput): {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: VerifyTokenOutput;
} {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(output, null, 2),
      },
    ],
    structuredContent: output,
  };
}

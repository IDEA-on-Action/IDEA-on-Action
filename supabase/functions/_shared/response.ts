/**
 * 표준 응답 유틸리티
 */

import { getCorsHeaders } from './cors.ts'

export function createResponse(
    data: Record<string, unknown> | unknown[],
    status = 200,
    origin: string | null = null
): Response {
    return new Response(JSON.stringify(data), {
        headers: {
            ...getCorsHeaders(origin),
            'Content-Type': 'application/json',
        },
        status,
    })
}

export function createErrorResponse(
    message: string,
    status = 400,
    origin: string | null = null,
    details?: Record<string, unknown>
): Response {
    return new Response(
        JSON.stringify({
            error: message,
            details,
        }),
        {
            headers: {
                ...getCorsHeaders(origin),
                'Content-Type': 'application/json',
            },
            status,
        }
    )
}

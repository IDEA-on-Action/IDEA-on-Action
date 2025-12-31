/**
 * useMinuSandbox Hook
 *
 * Minu Sandbox 환경 관리 및 테스트 데이터 처리를 위한 커스텀 훅
 * 참조: plan/minu-sandbox-setup.md
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MinuSandboxClient,
  createSandboxClient,
  type SubscriptionResponse,
  type UserProfileResponse,
  type SessionInfo,
  type AuditLogEntry,
} from "@/lib/minu/sandbox-client";
import {
  SANDBOX_CONFIG,
  SANDBOX_USERS,
  ErrorScenario,
  isSandboxEnabled,
  getSandboxUser,
  type MinuServiceType,
  type SandboxUser,
} from "@/config/minu-sandbox";
import { toast } from "sonner";

/**
 * Sandbox 상태 인터페이스
 */
export interface SandboxState {
  enabled: boolean;
  currentUser: SandboxUser | null;
  errorScenario: ErrorScenario;
  mockDelay: number;
}

/**
 * useMinuSandbox Hook
 */
export function useMinuSandbox() {
  const queryClient = useQueryClient();

  // Sandbox 상태 관리
  const [sandboxState, setSandboxState] = useState<SandboxState>({
    enabled: isSandboxEnabled(),
    currentUser: null,
    errorScenario: ErrorScenario.NONE,
    mockDelay: SANDBOX_CONFIG.mockDelay ?? 500,
  });

  // Sandbox 클라이언트 인스턴스
  const [client] = useState(() =>
    createSandboxClient({
      errorScenario: sandboxState.errorScenario,
      mockDelay: sandboxState.mockDelay,
    })
  );

  // 클라이언트 설정 업데이트
  useEffect(() => {
    client.setErrorScenario(sandboxState.errorScenario);
  }, [client, sandboxState.errorScenario]);

  /**
   * Sandbox 모드 토글
   */
  const toggleSandbox = useCallback(() => {
    setSandboxState((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }));

    toast.info(
      sandboxState.enabled
        ? "Sandbox 모드가 비활성화되었습니다"
        : "Sandbox 모드가 활성화되었습니다"
    );
  }, [sandboxState.enabled]);

  /**
   * 테스트 사용자 설정
   */
  const setTestUser = useCallback((userKey: string) => {
    const user = getSandboxUser(userKey);
    if (user) {
      setSandboxState((prev) => ({
        ...prev,
        currentUser: user,
      }));
      toast.success(`테스트 사용자 설정: ${user.plan} 플랜`);
    } else {
      toast.error("테스트 사용자를 찾을 수 없습니다");
    }
  }, []);

  /**
   * 에러 시나리오 설정
   */
  const setErrorScenario = useCallback((scenario: ErrorScenario) => {
    setSandboxState((prev) => ({
      ...prev,
      errorScenario: scenario,
    }));

    if (scenario !== ErrorScenario.NONE) {
      toast.warning(`에러 시나리오 활성화: ${scenario}`);
    } else {
      toast.info("에러 시나리오 비활성화");
    }
  }, []);

  /**
   * Mock 지연 설정
   */
  const setMockDelay = useCallback((delay: number) => {
    setSandboxState((prev) => ({
      ...prev,
      mockDelay: delay,
    }));
  }, []);

  /**
   * 구독 정보 조회
   */
  const {
    data: subscription,
    isLoading: subscriptionLoading,
    error: subscriptionError,
    refetch: refetchSubscription,
  } = useQuery({
    queryKey: [
      "minu-sandbox-subscription",
      sandboxState.currentUser?.email,
    ],
    queryFn: async () => {
      if (!sandboxState.currentUser) {
        throw new Error("테스트 사용자가 설정되지 않았습니다");
      }
      const response = await client.getSubscription(
        "find",
        sandboxState.currentUser
      );
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || "구독 정보 조회 실패");
      }
      return response.data;
    },
    enabled: sandboxState.enabled && !!sandboxState.currentUser,
  });

  /**
   * 사용자 프로필 조회
   */
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["minu-sandbox-profile", sandboxState.currentUser?.email],
    queryFn: async () => {
      if (!sandboxState.currentUser) {
        throw new Error("테스트 사용자가 설정되지 않았습니다");
      }
      const response = await client.getUserProfile(sandboxState.currentUser);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || "프로필 조회 실패");
      }
      return response.data;
    },
    enabled: sandboxState.enabled && !!sandboxState.currentUser,
  });

  /**
   * 세션 목록 조회
   */
  const {
    data: sessions,
    isLoading: sessionsLoading,
    error: sessionsError,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ["minu-sandbox-sessions", sandboxState.currentUser?.email],
    queryFn: async () => {
      const response = await client.getSessions();
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || "세션 조회 실패");
      }
      return response.data;
    },
    enabled: sandboxState.enabled && !!sandboxState.currentUser,
  });

  /**
   * Audit Log 조회
   */
  const {
    data: auditLogs,
    isLoading: auditLogsLoading,
    error: auditLogsError,
    refetch: refetchAuditLogs,
  } = useQuery({
    queryKey: ["minu-sandbox-audit-logs", sandboxState.currentUser?.email],
    queryFn: async () => {
      const response = await client.getAuditLogs();
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || "Audit Log 조회 실패");
      }
      return response.data;
    },
    enabled: sandboxState.enabled && !!sandboxState.currentUser,
  });

  /**
   * MCP 상태 조회
   */
  const {
    data: mcpStatus,
    isLoading: mcpStatusLoading,
    error: mcpStatusError,
    refetch: refetchMCPStatus,
  } = useQuery({
    queryKey: ["minu-sandbox-mcp-status"],
    queryFn: async () => {
      const response = await client.getMCPStatus();
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || "MCP 상태 조회 실패");
      }
      return response.data;
    },
    enabled: sandboxState.enabled,
    refetchInterval: 30000, // 30초마다 자동 갱신
  });

  /**
   * OAuth 토큰 교환
   */
  const exchangeToken = useMutation({
    mutationFn: async ({
      code,
      codeVerifier,
    }: {
      code: string;
      codeVerifier: string;
    }) => {
      const response = await client.exchangeCodeForToken(code, codeVerifier);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || "토큰 교환 실패");
      }
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("토큰 교환 성공");
      client.setAccessToken(data.access_token);
    },
    onError: (error) => {
      toast.error(`토큰 교환 실패: ${error.message}`);
    },
  });

  /**
   * 토큰 갱신
   */
  const refreshToken = useMutation({
    mutationFn: async (refreshToken: string) => {
      const response = await client.refreshToken(refreshToken);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || "토큰 갱신 실패");
      }
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("토큰 갱신 성공");
      client.setAccessToken(data.access_token);
    },
    onError: (error) => {
      toast.error(`토큰 갱신 실패: ${error.message}`);
    },
  });

  /**
   * 토큰 폐기
   */
  const revokeToken = useMutation({
    mutationFn: async (token: string) => {
      const response = await client.revokeToken(token);
      if (!response.success) {
        throw new Error(response.error?.message || "토큰 폐기 실패");
      }
    },
    onSuccess: () => {
      toast.success("토큰 폐기 성공");
      client.setAccessToken(undefined);
    },
    onError: (error) => {
      toast.error(`토큰 폐기 실패: ${error.message}`);
    },
  });

  /**
   * 모든 쿼리 새로고침
   */
  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["minu-sandbox-"] });
    toast.info("Sandbox 데이터를 새로고침합니다");
  }, [queryClient]);

  /**
   * Sandbox 초기화
   */
  const reset = useCallback(() => {
    setSandboxState({
      enabled: isSandboxEnabled(),
      currentUser: null,
      errorScenario: ErrorScenario.NONE,
      mockDelay: SANDBOX_CONFIG.mockDelay ?? 500,
    });
    client.setErrorScenario(ErrorScenario.NONE);
    queryClient.clear();
    toast.info("Sandbox가 초기화되었습니다");
  }, [client, queryClient]);

  /**
   * 사용 가능한 테스트 사용자 목록
   */
  const availableUsers = useMemo(() => {
    return Object.keys(SANDBOX_USERS);
  }, []);

  /**
   * OAuth 인가 URL 생성
   */
  const getAuthorizationUrl = useCallback(
    (state: string, codeChallenge: string) => {
      return client.getAuthorizationUrl(state, codeChallenge);
    },
    [client]
  );

  return {
    // 상태
    isEnabled: sandboxState.enabled,
    currentUser: sandboxState.currentUser,
    errorScenario: sandboxState.errorScenario,
    mockDelay: sandboxState.mockDelay,

    // 데이터
    subscription,
    profile,
    sessions,
    auditLogs,
    mcpStatus,

    // 로딩 상태
    isLoading:
      subscriptionLoading ||
      profileLoading ||
      sessionsLoading ||
      auditLogsLoading ||
      mcpStatusLoading,
    subscriptionLoading,
    profileLoading,
    sessionsLoading,
    auditLogsLoading,
    mcpStatusLoading,

    // 에러
    error:
      subscriptionError ||
      profileError ||
      sessionsError ||
      auditLogsError ||
      mcpStatusError,
    subscriptionError,
    profileError,
    sessionsError,
    auditLogsError,
    mcpStatusError,

    // 액션
    toggleSandbox,
    setTestUser,
    setErrorScenario,
    setMockDelay,
    exchangeToken: exchangeToken.mutate,
    refreshToken: refreshToken.mutate,
    revokeToken: revokeToken.mutate,
    refreshAll,
    reset,
    getAuthorizationUrl,

    // 새로고침
    refetchSubscription,
    refetchProfile,
    refetchSessions,
    refetchAuditLogs,
    refetchMCPStatus,

    // 유틸리티
    availableUsers,
    client,
  };
}

/**
 * Sandbox 정보 표시용 훅
 */
export function useSandboxInfo() {
  const sandbox = useMinuSandbox();

  const info = useMemo(
    () => ({
      enabled: sandbox.isEnabled,
      user: sandbox.currentUser
        ? {
            email: sandbox.currentUser.email,
            plan: sandbox.currentUser.plan,
            status: sandbox.currentUser.status,
          }
        : null,
      errorScenario: sandbox.errorScenario,
      config: {
        baseUrl: SANDBOX_CONFIG.baseUrl,
        clientId: SANDBOX_CONFIG.clientId,
        mockDelay: sandbox.mockDelay,
      },
    }),
    [sandbox]
  );

  return info;
}

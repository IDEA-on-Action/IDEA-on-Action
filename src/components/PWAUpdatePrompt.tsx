import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { devLog } from "@/lib/errors";

export function PWAUpdatePrompt() {
  const [showReload, setShowReload] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      devLog("SW Registered:", r);
    },
    onRegisterError(error) {
      devLog("SW registration error", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowReload(true);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
    setShowReload(false);
  };

  const handleClose = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
    setShowReload(false);
  };

  if (offlineReady) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
        <div className="glass-card p-4 border border-green-500/20 shadow-lg rounded-lg bg-green-50 dark:bg-green-950/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <RefreshCw className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100">
                오프라인 모드 준비 완료
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                이제 인터넷 연결 없이도 앱을 사용할 수 있습니다.
              </p>
              <Button
                onClick={handleClose}
                variant="ghost"
                size="sm"
                className="mt-2"
              >
                확인
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!showReload) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="glass-card p-4 border border-primary/20 shadow-lg rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">새 버전 사용 가능</h3>
            <p className="text-sm text-muted-foreground mt-1">
              새로운 콘텐츠를 사용하려면 페이지를 새로고침하세요.
            </p>
            <div className="flex gap-2 mt-3">
              <Button onClick={handleUpdate} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                새로고침
              </Button>
              <Button onClick={handleClose} variant="ghost" size="sm">
                나중에
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

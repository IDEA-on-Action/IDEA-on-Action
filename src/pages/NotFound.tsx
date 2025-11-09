import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { devError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    devError(new Error("404 Error"), { 
      operation: "404 페이지 접근", 
      route: location.pathname 
    });
  }, [location.pathname]);

  return (
    <PageLayout>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-primary">404</h1>
            <h2 className="text-2xl font-semibold text-foreground">페이지를 찾을 수 없습니다</h2>
            <p className="text-muted-foreground">
              요청하신 페이지가 존재하지 않거나 이동되었습니다.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                홈으로 돌아가기
              </Link>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
            >
              이전 페이지
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default NotFound;

import { Menu, User as UserIcon, ShoppingCart } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useCartStore } from "@/stores/cartStore";
import { Badge } from "@/components/ui/badge";
import logoSymbol from "@/assets/logo-symbol.png";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";
  const { user, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { openCart, getTotalItems } = useCartStore();
  const cartItemCount = getTotalItems();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-gray-200 dark:border-gray-700">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoSymbol} alt="IDEA on Action Logo" className="h-10 w-10" />
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight">IDEA on Action</span>
            <span className="text-xs text-muted-foreground">생각과행동</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/services" className="text-foreground/80 hover:text-foreground transition-colors">
            서비스
          </Link>
          {isHomePage ? (
            <>
              <a href="#features" className="text-foreground/80 hover:text-foreground transition-colors">
                기술
              </a>
              <a href="#about" className="text-foreground/80 hover:text-foreground transition-colors">
                회사소개
              </a>
              <a href="#contact" className="text-foreground/80 hover:text-foreground transition-colors">
                문의
              </a>
            </>
          ) : (
            <>
              <Link to="/#features" className="text-foreground/80 hover:text-foreground transition-colors">
                기술
              </Link>
              <Link to="/#about" className="text-foreground/80 hover:text-foreground transition-colors">
                회사소개
              </Link>
              <Link to="/#contact" className="text-foreground/80 hover:text-foreground transition-colors">
                문의
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* 장바구니 버튼 */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={openCart}
            aria-label="장바구니"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </Badge>
            )}
          </Button>

          <ThemeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarFallback className="bg-gradient-primary text-white">
                      {user.email?.[0]?.toUpperCase() || <UserIcon className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  프로필
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate('/admin/services')}>
                    관리자
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={signOut}>
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="default"
              className="hidden md:inline-flex bg-gradient-primary hover:opacity-90"
              onClick={() => navigate('/login')}
            >
              로그인
            </Button>
          )}

          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </nav>
    </header>
  );
};

export default Header;

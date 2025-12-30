import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation("common");

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="언어 전환 / Change Language">
          <Languages className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">언어 전환 / Change Language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => changeLanguage("ko")}
          className={i18n.language === "ko" ? "bg-accent" : ""}
        >
          {t("language.ko")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLanguage("en")}
          className={i18n.language === "en" ? "bg-accent" : ""}
        >
          {t("language.en")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

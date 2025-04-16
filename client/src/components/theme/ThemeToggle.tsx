import { Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

// This component is now just a placeholder that doesn't do anything
// Since we're only using dark mode now
export function ThemeToggle() {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 cursor-default"
      disabled
    >
      <Moon className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Dark mode</span>
    </Button>
  );
}

"use client"

import * as React from "react"
import { Moon, Sun, Landmark } from "lucide-react" // Landmark might be unused now
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

export function ThemeToggleButton({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  const { theme, setTheme } = useTheme()

  return (
    <div className={className} {...props}>
      <Button 
        variant="outline" 
        size="icon" 
        className="h-9 w-9"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
      >
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  )
}

export function MobileThemeToggleButton() {
  const { setTheme, theme } = useTheme()
   return (
    <div className="w-full">
      <p className="text-sm text-muted-foreground px-2 mb-2">Theme</p>
      <Button
        variant="ghost"
        className="w-full justify-start text-base py-3"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? (
          <><Sun className="mr-2 h-4 w-4" /> Switch to Light Mode</>
        ) : (
          <><Moon className="mr-2 h-4 w-4" /> Switch to Dark Mode</>
        )}
      </Button>
    </div>
  );
}

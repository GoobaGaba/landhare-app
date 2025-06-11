"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggleButton({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  const { setTheme, theme } = useTheme()

  return (
    <div className={className} {...props}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function MobileThemeToggleButton() {
  const { setTheme, theme } = useTheme()
   return (
    <div className="p-2">
      <p className="text-sm text-muted-foreground px-2 mb-1">Theme</p>
      <Button
        variant={theme === "light" ? "secondary" : "ghost"}
        className="w-full justify-start"
        onClick={() => setTheme("light")}
      >
        <Sun className="mr-2 h-4 w-4" /> Light
      </Button>
      <Button
        variant={theme === "dark" ? "secondary" : "ghost"}
        className="w-full justify-start mt-1"
        onClick={() => setTheme("dark")}
      >
        <Moon className="mr-2 h-4 w-4" /> Dark
      </Button>
       <Button
        variant={theme === "system" ? "secondary" : "ghost"}
        className="w-full justify-start mt-1"
        onClick={() => setTheme("system")}
      >
        {/* Using a generic icon for system or reusing Sun as placeholder */}
        <Sun className="mr-2 h-4 w-4" /> System
      </Button>
    </div>
  );
}

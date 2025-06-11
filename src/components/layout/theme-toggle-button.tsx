
"use client"

import * as React from "react"
import { Moon, Sun, Landmark } from "lucide-react" // Added Laptop
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
  const { setTheme } = useTheme()

  return (
    <div className={className} {...props}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuSeparator/>
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="mr-2 h-4 w-4" /> Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="mr-2 h-4 w-4" /> Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Landmark className="mr-2 h-4 w-4" /> System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function MobileThemeToggleButton() {
  const { setTheme, theme } = useTheme()
   return (
    <div className="w-full">
      <p className="text-sm text-muted-foreground px-2 mb-2">Theme</p>
      <Button
        variant={theme === "light" ? "secondary" : "ghost"}
        className="w-full justify-start text-base py-3"
        onClick={() => setTheme("light")}
      >
        <Sun className="mr-2 h-4 w-4" /> Light
      </Button>
      <Button
        variant={theme === "dark" ? "secondary" : "ghost"}
        className="w-full justify-start mt-1 text-base py-3"
        onClick={() => setTheme("dark")}
      >
        <Moon className="mr-2 h-4 w-4" /> Dark
      </Button>
       <Button
        variant={theme === "system" ? "secondary" : "ghost"}
        className="w-full justify-start mt-1 text-base py-3"
        onClick={() => setTheme("system")}
      >
        <Landmark className="mr-2 h-4 w-4" /> System
      </Button>
    </div>
  );
}

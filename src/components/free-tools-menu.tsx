"use client";

import { ChevronDown, ImageIcon, Search, Wrench } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The three tools that work with no account and no store connection. They
 * are public pages of this app, so they belong in the top menu next to the
 * workspace destinations - a signed-in user checking a competitor should not
 * have to remember a URL.
 */
export const FREE_TOOLS = [
  {
    description: "Score, keyword ranks and next steps for any store link, in every market, with a link to share",
    href: "/aso-check",
    icon: Search,
    label: "ASO check-up",
  },
  {
    description: "Popularity, difficulty and opportunity for up to five keywords",
    href: "/keyword-check",
    icon: Wrench,
    label: "Keyword check",
  },
  {
    description: "Store-ready screenshots at exact device sizes, in the browser",
    href: "/editor",
    icon: ImageIcon,
    label: "Screenshot editor",
  },
] as const;

export function FreeToolsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Wrench className="h-3.5 w-3.5" />
          Free tools
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[320px]">
        <DropdownMenuLabel>Free, no store connection needed</DropdownMenuLabel>
        {FREE_TOOLS.map((tool) => (
          <DropdownMenuItem key={tool.href} asChild>
            <Link href={tool.href} className="items-start gap-2.5">
              <tool.icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex flex-col">
                <span>{tool.label}</span>
                <span className="text-muted-foreground text-xs">
                  {tool.description}
                </span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

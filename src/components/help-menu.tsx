"use client";

import {
  BookOpen,
  CircleHelp,
  ExternalLink,
  Mail,
  MessageCircleQuestion,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DOCS_URL,
  FAQ_URL,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
  WEBSITE_URL,
} from "@/lib/external-links";

/** Sidebar "Help" entry — documentation, FAQ and support contact on appboard.dev. */
export function HelpMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-muted-foreground transition-colors hover:bg-[#2a2a2a] hover:text-foreground"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center">
            <CircleHelp className="h-5 w-5" />
          </div>
          <span className="text-sm">Help</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel>Help &amp; support</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a href={DOCS_URL} rel="noreferrer" target="_blank">
            <BookOpen className="h-4 w-4" />
            Documentation
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={FAQ_URL} rel="noreferrer" target="_blank">
            <MessageCircleQuestion className="h-4 w-4" />
            FAQ
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={SUPPORT_MAILTO}>
            <Mail className="h-4 w-4" />
            <span className="flex flex-col">
              <span>Contact support</span>
              <span className="text-xs text-muted-foreground">
                {SUPPORT_EMAIL}
              </span>
            </span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={WEBSITE_URL} rel="noreferrer" target="_blank">
            <ExternalLink className="h-4 w-4" />
            appboard.dev
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { ArrowLeft, Compass } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-6">
			<div className="flex max-w-md flex-col items-center text-center">
				<div className="relative mb-8">
					<div className="absolute -inset-4 rounded-full bg-primary/5 blur-2xl" />
					<div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-border/50 bg-card shadow-lg">
						<Compass className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
					</div>
				</div>

				<p className="mb-2 font-mono text-sm tracking-widest text-muted-foreground">
					404
				</p>
				<h1 className="mb-3 text-2xl font-bold tracking-tight">
					Page not found
				</h1>
				<p className="mb-8 text-sm leading-relaxed text-muted-foreground">
					The page you&apos;re looking for doesn&apos;t exist or has been moved.
				</p>

				<Button asChild>
					<Link href="/">
						<ArrowLeft className="h-4 w-4" />
						Back to home
					</Link>
				</Button>
			</div>
		</div>
	);
}

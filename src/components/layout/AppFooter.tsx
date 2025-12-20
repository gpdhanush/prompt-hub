import { ENV_CONFIG } from "@/lib/config";

export function AppFooter() {
  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="flex h-12 items-center justify-center px-6">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Naethra EMS. All rights reserved. | Version {ENV_CONFIG.APP_VERSION}
        </p>
      </div>
    </footer>
  );
}


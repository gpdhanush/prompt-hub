import { Suspense, ReactNode } from 'react';

interface LazyRouteProps {
  children: ReactNode;
}

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

export function LazyRoute({ children }: LazyRouteProps) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}


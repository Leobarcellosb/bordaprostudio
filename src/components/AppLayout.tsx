import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileNav />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-8 lg:px-14">
          <div className="max-w-6xl w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

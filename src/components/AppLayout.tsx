import { useLocation, Link } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { TrialBanner } from "./TrialBanner";
import { TrialEndQuiz } from "./TrialEndQuiz";
import { SupportFloat } from "./SupportFloat";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileNav />
        <TrialBanner />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-8 lg:px-14">
          <div className="max-w-6xl w-full mx-auto">
            {/* key={pathname} força React a remontar o subtree em cada
                navegação, disparando o keyframe .route-content. */}
            <div key={pathname} className="route-content">
              {children}
            </div>
            <footer className="mt-10 pt-6 border-t border-border/30 text-center text-xs text-muted-foreground">
              <Link to="/politica-de-privacidade" className="hover:text-foreground hover:underline">
                Política de privacidade
              </Link>
            </footer>
          </div>
        </main>
      </div>
      <SupportFloat />
      <TrialEndQuiz />
    </div>
  );
};

import { GlobalSearch } from "./global-search";
import { NotificationBell } from "./notification-bell";

export function AppTopbar() {
  return (
    <div className="hidden md:flex items-center justify-between h-14 px-8 border-b border-border bg-background">
      <GlobalSearch />
      <NotificationBell />
    </div>
  );
}

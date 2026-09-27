// "use client";

// import { useState } from "react";
// import {
//   BarChart3,
//   FileText,
//   Edit,
//   ChevronLeft,
//   ChevronRight,
//   Menu,
//   X
// } from "lucide-react";
// import Link from "next/link";

// export function EditorSidebar({ activeView, onViewChange, collapsed, onToggleCollapse }) {
//   const [mobileOpen, setMobileOpen] = useState(false);

//   const navigationItems = [
//     { id: 'overview', icon: BarChart3, label: 'Overview', href: '/editor' },
//     { id: 'posts', icon: FileText, label: 'Posts', href: '/editor' },
//     { id: 'editor', icon: Edit, label: 'Editor', href: '/editor' },
//   ];

//   const toggleMobile = () => setMobileOpen(!mobileOpen);

//   return (
//     <>
//       {/* Desktop Sidebar */}
//       <div
//         className={`
//           hidden md:flex flex-col bg-[hsl(var(--card))] border-r border-[hsl(var(--border))]
//           transition-all duration-300 ease-in-out
//           ${collapsed ? "w-16" : "w-64"}
//         `}
//       >
//         {/* Header */}
//         <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
//           {!collapsed && (
//             <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
//               Editor Dashboard
//             </h2>
//           )}
//           <button
//             onClick={onToggleCollapse}
//             className="p-1 rounded-md hover:bg-[hsl(var(--accent))] transition-colors"
//           >
//             {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
//           </button>
//         </div>

//         {/* Navigation */}
//         <nav className="flex-1 p-4">
//           <ul className="space-y-2">
//             {navigationItems.map((item) => {
//               const Icon = item.icon;
//               const isActive = activeView === item.id;

//               return (
//                 <li key={item.id}>
//                   <Link
//                     href={item.href}
//                     onClick={() => onViewChange(item.id)}
//                     className={`
//                       flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
//                       ${isActive
//                         ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
//                         : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
//                       }
//                     `}
//                   >
//                     <Icon className="w-4 h-4 flex-shrink-0" />
//                     {!collapsed && <span>{item.label}</span>}
//                   </Link>
//                 </li>
//               );
//             })}
//           </ul>
//         </nav>

//         {/* Footer */}
//         <div className="p-4 border-t border-[hsl(var(--border))]">
//           {!collapsed && (
//             <div className="text-xs text-[hsl(var(--muted-foreground))]">
//               Editor Dashboard v1.0
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Mobile Sidebar */}
//       <div className={`md:hidden fixed inset-0 z-50 ${mobileOpen ? "block" : "hidden"}`}>
//         <div className="fixed inset-0 bg-black bg-opacity-50" onClick={toggleMobile} />
//         <div className="fixed left-0 top-0 h-full w-64 bg-[hsl(var(--card))] border-r border-[hsl(var(--border))]">
//           <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
//             <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
//               Editor Dashboard
//             </h2>
//             <button onClick={toggleMobile} className="p-1 rounded-md hover:bg-[hsl(var(--accent))]">
//               <X className="w-4 h-4" />
//             </button>
//           </div>

//           <nav className="p-4">
//             <ul className="space-y-2">
//               {navigationItems.map((item) => {
//                 const Icon = item.icon;
//                 const isActive = activeView === item.id;

//                 return (
//                   <li key={item.id}>
//                     <Link
//                       href={item.href}
//                       onClick={() => {
//                         onViewChange(item.id);
//                         toggleMobile();
//                       }}
//                       className={`
//                         flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
//                         ${isActive
//                           ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
//                           : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
//                         }
//                       `}
//                     >
//                       <Icon className="w-4 h-4 flex-shrink-0" />
//                       <span>{item.label}</span>
//                     </Link>
//                   </li>
//                 );
//               })}
//             </ul>
//           </nav>
//         </div>
//       </div>

//       {/* Mobile Header */}
//       <div className="md:hidden flex items-center justify-between p-4 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))]">
//         <button onClick={toggleMobile} className="p-2 rounded-md hover:bg-[hsl(var(--accent))]">
//           <Menu className="w-5 h-5" />
//         </button>
//         <h1 className="text-lg font-semibold text-[hsl(var(--foreground))]">
//           Editor Dashboard
//         </h1>
//         <div className="w-9" />
//       </div>
//     </>
//   );
// }

"use client";

import { useState } from "react";
import {
  BarChart3,
  FileText,
  Edit,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  House,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function EditorSidebar({
  activeView,
  onViewChange,
  collapsed,
  onToggleCollapse,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const lang = pathname?.split("/")[1] || "en";

  const navigationItems = [
    { id: "overview", icon: BarChart3, label: "Overview", href: "/editor" },
    { id: "posts", icon: FileText, label: "Posts", href: "/editor" },
    { id: "editor", icon: Edit, label: "Editor", href: "/editor" },
  ];

  const toggleMobile = () => setMobileOpen(!mobileOpen);

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={`
          hidden md:flex flex-col justify-between 
          bg-primary-navy border-r border-primary-text-inverse/10 text-primary-text-inverse
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-16" : "w-64"}
          h-screen fixed left-0 top-0 z-40
        `}
      >
        {/* Sidebar content wrapper */}
        <div className="flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-primary-text-inverse/10 p-4">
            {!collapsed && (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-accent">
                  FootballBank
                </p>
                <p className="text-sm font-medium text-primary-text-inverse/60">
                  Editor console
                </p>
              </div>
            )}
            <button
              onClick={onToggleCollapse}
              className="p-1 text-primary-text-inverse/50 transition-colors hover:text-primary-accent"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1.5">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;

                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => onViewChange(item.id)}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                        ${
                          isActive
                            ? "bg-primary-action text-primary-text-inverse shadow-lg shadow-primary-action/20"
                            : "text-primary-text-inverse/65 hover:bg-primary-text-inverse/10 hover:text-primary-text-inverse"
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Footer - pinned at bottom */}
        <div className="border-t border-primary-text-inverse/10 p-2">
          <Link
            href={`/${lang}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-primary-text-inverse/65 transition hover:bg-primary-text-inverse/10 hover:text-primary-text-inverse"
            aria-label="Home"
            title="Home"
          >
            <House className="size-5 shrink-0" />
            {!collapsed && <span>Home</span>}
          </Link>
          {!collapsed && (
            <div className="mt-2 px-3 text-[10px] uppercase tracking-[0.16em] text-primary-text-inverse/35">
              Content workspace
            </div>
          )}
        </div>
      </div>

      {/* Mobile Toggle Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleMobile}
          className="rounded-full border border-divider bg-primary-card p-2 text-primary-text shadow-sm"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={toggleMobile}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full z-50 md:hidden
          bg-primary-navy border-r border-primary-text-inverse/10 text-primary-text-inverse
          transition-all duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          w-64 flex flex-col justify-between
        `}
      >
        <div>
          <div className="flex items-center justify-between border-b border-primary-text-inverse/10 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-accent">
                FootballBank
              </p>
              <p className="text-sm text-primary-text-inverse/60">
                Editor console
              </p>
            </div>
            <button
              onClick={toggleMobile}
              className="rounded-md p-1 text-primary-text-inverse/60 hover:bg-primary-text-inverse/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-4 flex-1 overflow-y-auto">
            <ul className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;

                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        onViewChange(item.id);
                        toggleMobile();
                      }}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                        ${
                          isActive
                            ? "bg-primary-action text-primary-text-inverse shadow-lg shadow-primary-action/20"
                            : "text-primary-text-inverse/65 hover:bg-primary-text-inverse/10 hover:text-primary-text-inverse"
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="border-t border-primary-text-inverse/10 p-2">
          <Link
            href={`/${lang}`}
            onClick={toggleMobile}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-primary-text-inverse/65 hover:bg-primary-text-inverse/10 hover:text-primary-text-inverse"
          >
            <House className="size-5" />
            Home
          </Link>
        </div>
      </div>
    </>
  );
}

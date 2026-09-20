"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DashboardView } from "@/components/admin/views/DashboardView";
import PlayersView from "@/components/admin/views/PlayersView";
import SubmissionsView from "@/components/admin/views/SubmissionsView";
import AdminBlogView from "@/components/admin/views/AdminBlogView";
import { SettingsView } from "@/components/admin/views/SettingsView";
import UsersView from "@/components/admin/views/UsersView";
import AgentView from "@/components/admin/views/AgentView";
import ResumeRequestsView from "@/components/admin/views/ResumeRequestsView";
import { useAuth } from "@/context/NewAuthContext";
import { useToast } from "@/hooks/use-toast";
import SplashScreen from "@/components/SplashScreen";

const AdminDashboard = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const { role, isAuthenticated, loading: isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [refreshPulse, setRefreshPulse] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && pathname) {
      if (!isAuthenticated) {
        router.replace(`/auth/login?redirect=${pathname}`);
        return;
      }

      if (role) {
        const isAdminUser = role === "admin";
        if (!isAdminUser) {
          toast({
            title: "Access Denied",
            description: "You do not have permission to access this page.",
            variant: "destructive",
          });
          router.replace("/");
          return;
        } else {
          setCheckedAuth(true);
        }
      }
    }
  }, [isAuthenticated, isLoading, role, pathname, router, toast]);

  // useEffect(() => {
  //   if (!checkedAuth) return undefined;

  //   const refresh = () => setRefreshPulse((pulse) => pulse + 1);
  //   const interval = setInterval(() => {
  //     if (document.visibilityState === "visible") refresh();
  //   }, 30000);

  //   window.addEventListener("focus", refresh);
  //   document.addEventListener("visibilitychange", refresh);

  //   return () => {
  //     clearInterval(interval);
  //     window.removeEventListener("focus", refresh);
  //     document.removeEventListener("visibilitychange", refresh);
  //   };
  // }, [checkedAuth]);

  useEffect(() => {
    if (!checkedAuth) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        setRefreshPulse((pulse) => pulse + 1);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [checkedAuth]);

  if (isLoading || !checkedAuth) {
    return <SplashScreen />; // or return null
  }

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardView refreshPulse={refreshPulse} />;
      case "players":
        return <PlayersView refreshPulse={refreshPulse} />;
      case "users":
        return <UsersView refreshPulse={refreshPulse} />;
      case "subscriptions":
        return <DashboardView />;
      case "submissions":
        return <SubmissionsView refreshPulse={refreshPulse} />;
      case "resume-requests":
        return <ResumeRequestsView refreshPulse={refreshPulse} />;
      case "shop":
        return <DashboardView />;
      case "blog":
        return <AdminBlogView refreshPulse={refreshPulse} />;
      case "agent":
        return <AgentView />;
      case "settings":
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  const getViewTitle = () => {
    const titles = {
      dashboard: {
        title: "Dashboard",
        subtitle: "Overview of your platform metrics",
      },
      players: {
        title: "Players",
        subtitle: "Manage football players and profiles",
      },
      users: { title: "Users", subtitle: "Manage users and profiles" },
      subscriptions: {
        title: "Subscriptions",
        subtitle: "Manage user subscriptions and billing",
      },
      submissions: {
        title: "Submissions",
        subtitle: "Review and moderate player submissions",
      },
      "resume-requests": {
        title: "Resume Requests",
        subtitle: "Review registered user requests for player information",
      },
      shop: { title: "Shop", subtitle: "Manage products and inventory" },
      blog: { title: "Blog", subtitle: "Create and manage blog content" },
      agent: {
        title: "Agent Management",
        subtitle: "Manage agent profile and information",
      },
      settings: { title: "Settings", subtitle: "Configure system preferences" },
    };
    return (
      titles[activeView] || {
        title: "Dashboard",
        subtitle: "Overview of your platform metrics",
      }
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-primary-bg text-primary-text">
      <AdminSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Desktop */}
      <div
        className={`
          hidden flex-1 flex-col transition-all duration-300 ease-in-out md:flex
          ${collapsed ? "ml-16" : "ml-64"}
        `}
      >
        <AdminHeader
          title={getViewTitle().title}
          subtitle={getViewTitle().subtitle}
        />
        <main className="flex-1 overflow-auto p-5 lg:p-8">{renderView()}</main>
      </div>

      {/* Mobile */}
      <div className="flex md:hidden flex-col w-full h-screen overflow-hidden">
        <AdminHeader
          title={getViewTitle().title}
          subtitle={getViewTitle().subtitle}
        />
        <main className="flex-1 overflow-auto p-4">{renderView()}</main>
      </div>
    </div>
  );
};

export default AdminDashboard;

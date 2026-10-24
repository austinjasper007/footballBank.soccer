"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { EditorSidebar } from "@/components/editor/EditorSidebar";
import { EditorHeader } from "@/components/editor/EditorHeader";
import EditorOverview from "@/components/editor/views/EditorOverview";
import EditorPosts from "@/components/editor/views/EditorPosts";
import EditorEditor from "@/components/editor/views/EditorEditor";
import { useAuth } from "@/context/NewAuthContext";
import { useToast } from "@/hooks/use-toast";
import SplashScreen from "@/components/SplashScreen";

const EditorDashboard = () => {
  const [activeView, setActiveView] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const { role, isAuthenticated, loading: isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [checkedAuth, setCheckedAuth] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && pathname) {
      if (!isAuthenticated) {
        router.replace(`/auth/login?redirect=${pathname}`);
        return;
      }

      if (role) {
        const isEditorUser = role === "editor" || role === "admin";
        if (!isEditorUser) {
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

  if (isLoading || !checkedAuth) {
    return <SplashScreen />;
  }

  const handleNavigateToEditor = (post = null) => {
    setEditingPost(post);
    setActiveView("editor");
  };

  const handleEditorSave = () => {
    setEditingPost(null);
    setActiveView("posts");
  };

  const handleEditorCancel = () => {
    setEditingPost(null);
    setActiveView("posts");
  };

  const renderView = () => {
    switch (activeView) {
      case "overview":
        return (
          <EditorOverview
            onNavigateToEditor={handleNavigateToEditor}
            onNavigateToPosts={() => setActiveView("posts")}
          />
        );
      case "posts":
        return <EditorPosts onNavigateToEditor={handleNavigateToEditor} />;
      case "editor":
        return (
          <EditorEditor
            editingPost={editingPost}
            onSave={handleEditorSave}
            onCancel={handleEditorCancel}
          />
        );
      case "shop":
        return (
          <EditorOverview
            onNavigateToEditor={handleNavigateToEditor}
            onNavigateToPosts={() => setActiveView("posts")}
          />
        );
      default:
        return <EditorOverview />;
    }
  };

  const getViewTitle = () => {
    const titles = {
      overview: {
        title: "Editor Dashboard",
        subtitle: "Overview of your content and statistics",
      },
      posts: {
        title: "Blog Posts",
        subtitle: "Manage and organize your blog content",
      },
      editor: {
        title: editingPost ? "Edit Post" : "Create New Post",
        subtitle: editingPost
          ? "Update your blog post"
          : "Write and publish a new blog post",
      },
      shop: {
        title: "Shop",
        subtitle: "Manage products and inventory",
      },
    };
    return (
      titles[activeView] || {
        title: "Editor Dashboard",
        subtitle: "Overview of your content and statistics",
      }
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-primary-bg text-primary-text">
      {/* Sidebar - only visible on desktop */}
      <EditorSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Desktop */}
      <div
        className={`hidden md:flex flex-col flex-1 transition-all duration-300 ease-in-out ${
          collapsed ? "ml-16" : "ml-64"
        }`}
      >
        <EditorHeader
          title={getViewTitle().title}
          subtitle={getViewTitle().subtitle}
        />
        <main className="flex-1 overflow-auto p-5 lg:p-8">{renderView()}</main>
      </div>

      {/* Mobile */}
      <div className="flex md:hidden flex-col w-full h-screen overflow-hidden">
        <EditorHeader
          title={getViewTitle().title}
          subtitle={getViewTitle().subtitle}
        />
        <main className="flex-1 overflow-auto p-4">{renderView()}</main>
      </div>
    </div>
  );
};

export default EditorDashboard;

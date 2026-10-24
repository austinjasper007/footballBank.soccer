"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, FileText, Edit, TrendingUp } from "lucide-react";
import { getAllPosts } from "@/actions/adminActions";
import LoadingSplash from "@/components/ui/loading-splash";

export default function EditorOverview({ onNavigateToEditor, onNavigateToPosts }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const data = await getAllPosts();
      setPosts(data);
    } catch (error) {
      console.error("Failed to load posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const countStats = () => {
    const total = posts.length;
    const published = posts.filter(
      (post) => post.status === "Published",
    ).length;
    const drafts = posts.filter((post) => post.status === "Draft").length;
    const views = posts.reduce((sum, post) => sum + (post.views || 0), 0);

    return { total, published, drafts, views };
  };

  const getRecentPosts = () => {
    return [...posts]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  };

  const stats = countStats();
  const recentPosts = getRecentPosts();

  if (loading) {
    return <LoadingSplash message="Loading editor dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border border-divider bg-primary-card shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-7 items-center justify-center rounded-full bg-primary-action/10">
                <FileText className="size-4 text-primary-action" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary-muted">
                  Total Posts
                </p>
                <p className="font-heading text-xl font-semibold">
                  {stats.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-divider bg-primary-card shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-7 items-center justify-center rounded-full bg-primary-action/10">
                <TrendingUp className="size-4 text-primary-action" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary-muted">
                  Published
                </p>
                <p className="font-heading text-xl font-semibold">
                  {stats.published}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-divider bg-primary-card shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-7 items-center justify-center rounded-full bg-primary-accent/30">
                <Edit className="size-4 text-primary-navy" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary-muted">
                  Drafts
                </p>
                <p className="font-heading text-xl font-semibold">
                  {stats.drafts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-divider bg-primary-card shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <Eye className="size-7 text-primary-action" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary-muted">
                  Total Views
                </p>
                <p className="font-heading text-xl font-semibold">
                  {stats.views.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-divider bg-primary-card shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold mb-4">Recent Posts</h3>
            <div className="space-y-3">
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex flex-col items-start justify-between gap-2 rounded-lg border border-divider/70 bg-primary-bg p-3 transition-colors hover:bg-primary-action/5 lg:flex-row lg:items-center"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-sm truncate">
                      {post.title.length > 45 ? post.title.substring(0, 45) + "..." : post.title}
                    </h4>
                    <p className="text-xs text-primary-muted">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        post.status === "Published"
                          ? "bg-primary-action/10 text-primary-action"
                          : "bg-primary-accent/25 text-primary-navy"
                      }`}
                    >
                      {post.status}
                    </span>
                    <span className="text-xs text-primary-muted">
                      {post.views || 0} views
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-divider bg-primary-card shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => onNavigateToEditor && onNavigateToEditor()}
                className="w-full cursor-pointer rounded-lg border border-primary-action/20 bg-primary-action/5 p-3 text-left transition-colors hover:bg-primary-action/10"
              >
                <div className="flex items-center gap-3">
                  <Edit className="h-5 w-5 text-primary-action" />
                  <div>
                    <p className="font-medium text-primary-text">
                      Create New Post
                    </p>
                    <p className="text-sm text-primary-action">
                      Start writing a new blog post
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigateToPosts && onNavigateToPosts()}
                className="w-full cursor-pointer rounded-lg border border-divider bg-primary-bg p-3 text-left transition-colors hover:bg-primary-action/5"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary-action" />
                  <div>
                    <p className="font-medium text-primary-text">
                      Manage Posts
                    </p>
                    <p className="text-sm text-primary-muted">
                      View and edit existing posts
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

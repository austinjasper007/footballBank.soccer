"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, Eye } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { SearchBar } from "@/components/admin/SearchBar";
import { BlogPostDialog } from "@/components/admin/dialogs/BlogPostDialog";
import { DeleteConfirmationModal } from "@/components/admin/dialogs/DeleteConfirmationModal";
import LoadingSplash from "@/components/ui/loading-splash";

import { getAllPosts } from "@/actions/publicActions";
import { updatePost, deletePost, createPost } from "@/actions/adminActions";
import AdvancedTextEditor from "@/components/admin/AdvancedTextEditor";

const ITEMS_PER_PAGE = 5;

export default function BlogView() {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInlineEditor, setShowInlineEditor] = useState(false);
  const [newPostData, setNewPostData] = useState({
    title: "",
    summary: "",
    content: "",
    author: "Admin",
    category: "General",
    status: "Draft",
    featured: false,
    tags: [],
    imageUrl: []
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        const response = await getAllPosts();
        setPosts(response);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(query) ||
        (post.author || "").toLowerCase().includes(query) ||
        (post.summary || "").toLowerCase().includes(query)
    );
  }, [posts, searchQuery]);

  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPosts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPosts, currentPage]);

  const totalPages = Math.ceil(filteredPosts.length / ITEMS_PER_PAGE);

  const handleDeletePost = async (id) => {
    const post = posts.find(p => p.id === id);
    setPostToDelete(post);
    setDeleteDialogOpen(true);
  };

  const handleViewPost = (post) => {
    const postUrl = `/en/blog/${post.id}`;
    window.open(postUrl, '_blank');
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    
    try {
      setIsDeleting(true);
      await deletePost(postToDelete.id);
      toast({
        title: "Post Deleted",
        description: "The blog post has been removed successfully.",
      });
      const updated = await getAllPosts();
      setPosts(updated);
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete post.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setPostDialogOpen(true);
  };

  const handleAddOrUpdatePost = async (data) => {
    try {
      if (data.id) {
        await updatePost(data.id, data);
        toast({
          title: "Success",
          description: "Post updated successfully.",
        });
      } else {
        await createPost(data);
        toast({
          title: "Success",
          description: "New post created successfully.",
        });
      }
      
      const updated = await getAllPosts();
      setPosts(updated);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save post.",
        variant: "destructive",
      });
    }
  };

  const handleCreateNewPost = () => {
    setNewPostData({
      title: "",
      summary: "",
      content: "",
      author: "Admin",
      category: "General",
      status: "Draft",
      featured: false,
      tags: [],
      imageUrl: ""
    });
    setShowInlineEditor(true);
  };

  const handleSaveNewPost = async () => {
    if (!newPostData.title || !newPostData.content) {
      toast({
        title: "Missing Fields",
        description: "Please fill in title and content.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await createPost(newPostData);
      toast({
        title: "Success",
        description: "New post created successfully.",
      });
      const updated = await getAllPosts();
      setPosts(updated);
      setShowInlineEditor(false);
      setNewPostData({
        title: "",
        summary: "",
        content: "",
        author: "Admin",
        category: "General",
        status: "Draft",
        featured: false,
        tags: [],
        imageUrl: []
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const countStats = () => {
    const total = posts.length;
    const published = posts.filter((p) => p.featured).length;
    const drafts = posts.filter((p) => !p.featured).length;
    const views = posts.reduce((acc, p) => acc + (p.views || 0), 0);
    return { total, published, drafts, views };
  };

  const { total, published, drafts, views } = countStats();

  if (isLoading) {
    return <LoadingSplash message="Loading blog posts..." />;
  }

  return (
    <div className="space-y-6">
      {/* Blog Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      </div>

      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search posts..."
            className="w-full sm:w-80"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={() => setPostDialogOpen(true)} 
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Quick Post</span>
            <span className="sm:hidden">Quick Post</span>
          </Button>
          <Button 
            onClick={handleCreateNewPost} 
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Inline Editor</span>
            <span className="sm:hidden">Inline Editor</span>
          </Button>
        </div>
      </div>

      {/* Inline Editor */}
      {showInlineEditor && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Create New Post</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowInlineEditor(false)}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveNewPost} 
                    disabled={isSaving}
                    className="w-full sm:w-auto"
                  >
                    {isSaving ? 'Saving...' : 'Save Post'}
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title *</label>
                    <input
                      type="text"
                      value={newPostData.title}
                      onChange={(e) => setNewPostData({ ...newPostData, title: e.target.value })}
                      placeholder="Enter post title"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Summary</label>
                    <textarea
                      value={newPostData.summary}
                      onChange={(e) => setNewPostData({ ...newPostData, summary: e.target.value })}
                      placeholder="Brief description"
                      rows={3}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Author</label>
                    <select
                      value={newPostData.author}
                      onChange={(e) => setNewPostData({ ...newPostData, author: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Editor">Editor</option>
                      <option value="Guest Writer">Guest Writer</option>
                    </select>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <AdvancedTextEditor
                    content={newPostData.content}
                    onChange={(content) => setNewPostData({ ...newPostData, content })}
                    placeholder="Start writing your blog post here..."
                    className="min-h-75 sm:min-h-100"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blog Posts Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Title</th>
                  <th className="text-left p-4 font-medium">Summary</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium">Views</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPosts.map((post) => (
                  <tr key={post.id} className="border-t hover:bg-muted/40">
                    <td className="p-4 font-medium">{post.title}</td>
                    <td className="p-4 text-muted-foreground line-clamp-2 max-w-75">
                      {post.summary || post.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                    </td>
                    <td className="p-4">
                      <Badge
                        className={
                          post.featured
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-yellow-500 hover:bg-yellow-600"
                        }
                      >
                        {post.featured ? "Published" : "Draft"}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {post.views || 0}
                    </td>
                    <td className="p-4">
                      {/* Mobile Layout */}
                      <div className="block sm:hidden">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPost(post)}
                            className="flex-1 text-primary-action hover:text-primary-action-hover"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            <span className="text-xs hidden lg:block">View</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPost(post)}
                            className="flex-1"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            <span className="text-xs hidden lg:block">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePost(post.id)}
                            className="flex-1"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            <span className="text-xs hidden lg:block">Delete</span>
                          </Button>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPost(post)}
                          className="text-primary-action hover:text-primary-action-hover"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPost(post)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href="#"
                  isActive={i + 1 === currentPage}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Blog Post Dialog */}
      <BlogPostDialog
        open={postDialogOpen}
        onOpenChange={(open) => {
          setPostDialogOpen(open);
          if (!open) setEditingPost(null);
        }}
        post={editingPost || undefined}
        onSave={handleAddOrUpdatePost}
      />

      <DeleteConfirmationModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDeletePost}
        title="Delete Blog Post"
        description="This will permanently remove the blog post from the system."
        itemName={postToDelete ? postToDelete.title : ''}
        isLoading={isDeleting}
      />
    </div>
  );
}

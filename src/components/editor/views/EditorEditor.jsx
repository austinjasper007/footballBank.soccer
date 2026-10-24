"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import AdvancedTextEditor from "@/components/admin/AdvancedTextEditor";
import { createPost, updatePost, getAllPosts } from "@/actions/adminActions";
import { useAuth } from "@/context/NewAuthContext";
import { uploadFileWithProgress } from "@/lib/uploadWithProgress";
import { deleteFirebaseStorageFile } from "@/lib/firebaseStorageCleanup";

export default function EditorEditor({ editingPost, onSave, onCancel }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingStorageDeletes, setPendingStorageDeletes] = useState([]);
  const [postData, setPostData] = useState({
    title: "",
    summary: "",
    content: "",
    author: user?.firstName ? `${user.firstName} ${user.lastName}` : "Editor",
    category: "General",
    status: "Draft",
    featured: false,
    tags: [],
    imageUrl: [],
  });

  useEffect(() => {
    setPendingStorageDeletes([]);
    if (editingPost) {
      setPostData({
        id: editingPost.id,
        title: editingPost.title || "",
        summary: editingPost.summary || "",
        content: editingPost.content || "",
        author:
          editingPost.author ||
          (user?.firstName ? `${user.firstName} ${user.lastName}` : "Editor"),
        category: editingPost.category || "General",
        status: editingPost.status || "Draft",
        featured: editingPost.featured || false,
        tags: editingPost.tags || [],
        imageUrl: Array.isArray(editingPost.imageUrl)
          ? editingPost.imageUrl
          : editingPost.imageUrl
            ? [editingPost.imageUrl]
            : [],
      });
    } else {
      setPostData({
        title: "",
        summary: "",
        content: "",
        author: user?.firstName
          ? `${user.firstName} ${user.lastName}`
          : "Editor",
        category: "General",
        status: "Draft",
        featured: false,
        tags: [],
        imageUrl: [],
      });
    }
  }, [editingPost, user]);

  const handleSave = async () => {
    if (!postData.title || !postData.content) {
      toast({
        title: "Missing Fields",
        description: "Please fill in title and content.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (postData.id) {
        const updatedPost = await updatePost(postData.id, postData);
        if (!updatedPost?.id) throw new Error("Failed to update post");
      } else {
        const createdPost = await createPost(postData);
        if (!createdPost?.id) throw new Error("Failed to create post");
      }

      const deletionResults = await Promise.allSettled(
        [...new Set(pendingStorageDeletes)].map(deleteFirebaseStorageFile),
      );
      const failedDeletes = deletionResults.filter(
        (deletion) => deletion.status === "rejected",
      ).length;
      toast({
        title: failedDeletes ? "Post saved with a warning" : "Success",
        description: failedDeletes
          ? `Post saved, but ${failedDeletes} media file(s) could not be deleted from storage.`
          : postData.id
            ? "Post updated successfully."
            : "New post created successfully.",
        variant: failedDeletes ? "destructive" : "default",
      });

      if (onSave) {
        onSave();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save post.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = (content) => {
    setPostData({ ...postData, content });
  };

  const handleTagAdd = (tag) => {
    if (tag && !postData.tags.includes(tag)) {
      setPostData({ ...postData, tags: [...postData.tags, tag] });
    }
  };

  const handleTagRemove = (tagToRemove) => {
    setPostData({
      ...postData,
      tags: postData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        // Create folder name using post title and current date
        const postName = postData.title || "untitled-post";
        const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
        const folderName = `${postName.replace(/[^a-zA-Z0-9]/g, "-")}-${currentDate}`;
        const path = `posts/${folderName}`;

        const url = await uploadFileWithProgress(path, file, (progress) => {
          setUploadProgress(progress);
        });

        return url;
      } catch (error) {
        console.error("Upload failed:", error);
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive",
        });
        return null;
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(Boolean);

      if (successfulUploads.length > 0) {
        setPostData({
          ...postData,
          imageUrl: [...postData.imageUrl, ...successfulUploads],
        });
        toast({
          title: "Upload Successful",
          description: `${successfulUploads.length} image(s) uploaded successfully.`,
        });
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleImageRemove = (imageToRemove) => {
    setPendingStorageDeletes((previous) =>
      previous.includes(imageToRemove)
        ? previous
        : [...previous, imageToRemove],
    );
    setPostData((previous) => ({
      ...previous,
      imageUrl: previous.imageUrl.filter((image) => image !== imageToRemove),
    }));
  };

  return (
    <div className="min-h-full space-y-7">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-divider pb-5 sm:flex-row sm:items-end sm:justify-end">
        
        {/* <div>
          <h2 className="text-2xl font-bold">
            {editingPost ? "Edit Post" : "Create New Post"}
          </h2>
          <p className="text-primary-muted">
            {editingPost ? "Update your blog post" : "Write and publish a new blog post"}
          </p>
        </div> */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="action" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : editingPost ? "Update Post" : "Save Post"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.8fr)] lg:gap-14">
        {/* Sidebar */}
        <div className="space-y-8">
          {/* Post Settings */}
          <section className="space-y-5">
            <div className="border-b border-divider pb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-action">
                01
              </p>
              <h3 className="mt-1 font-heading text-xl font-semibold">
                Post settings
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={postData.title}
                  onChange={(e) =>
                    setPostData({ ...postData, title: e.target.value })
                  }
                  placeholder="Enter post title"
                />
              </div>

              <div>
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={postData.summary}
                  onChange={(e) =>
                    setPostData({ ...postData, summary: e.target.value })
                  }
                  placeholder="Brief description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={postData.author}
                  onChange={(e) =>
                    setPostData({ ...postData, author: e.target.value })
                  }
                  placeholder="Author name"
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={postData.category}
                  onValueChange={(value) =>
                    setPostData({ ...postData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Football">Football</SelectItem>
                    <SelectItem value="Training">Training</SelectItem>
                    <SelectItem value="Career">Career</SelectItem>
                    <SelectItem value="News">News</SelectItem>
                    <SelectItem value="Tips">Tips</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={postData.status}
                  onValueChange={(value) =>
                    setPostData({ ...postData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="imageUpload">Images</Label>
                <div className="space-y-2">
                  <Input
                    id="imageUpload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e.target.files)}
                    disabled={isUploading}
                    className="cursor-pointer"
                  />

                  {uploadProgress !== null && (
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary-bg-alt">
                      <div
                        className="h-2 rounded-full bg-primary-action transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}

                  {isUploading && (
                    <p className="text-sm text-primary-muted">
                      Uploading images...
                    </p>
                  )}
                </div>

                <div className="mt-2 space-y-2">
                  {postData.imageUrl.map((image, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 border-b border-divider/70 py-3"
                    >
                      <img
                        src={image}
                        alt={`Image ${index + 1}`}
                        className="aspect-video w-32 shrink-0 border border-divider object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <span className="flex-1 truncate text-sm text-primary-muted">
                        {image}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleImageRemove(image)}
                        aria-label={`Delete post image ${index + 1}`}
                        title="Delete image"
                        className="shrink-0 text-accent-red hover:border-accent-red hover:bg-accent-red/10 hover:text-accent-red"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={postData.featured}
                  onChange={(e) =>
                    setPostData({ ...postData, featured: e.target.checked })
                  }
                  className="rounded"
                />
                <Label htmlFor="featured">Featured Post</Label>
              </div>
            </div>
          </section>

          {/* Tags */}
          <section className="space-y-5">
            <div className="border-b border-divider pb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-action">
                02
              </p>
              <h3 className="mt-1 font-heading text-xl font-semibold">Tags</h3>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleTagAdd(e.target.value);
                      e.target.value = "";
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    const input = e.target.previousElementSibling;
                    handleTagAdd(input.value);
                    input.value = "";
                  }}
                >
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {postData.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleTagRemove(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Editor */}
        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between border-b border-divider pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-action">
                03
              </p>
              <h3 className="mt-1 font-heading text-xl font-semibold">
                Article content
              </h3>
            </div>
            <span className="text-xs text-primary-muted">Rich text editor</span>
          </div>
          <div className="min-h-150 bg-primary-card/60 py-1">
            <AdvancedTextEditor
              content={postData.content}
              onChange={handleContentChange}
              placeholder="Start writing your blog post here..."
              className="h-full"
              showPreview={false}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

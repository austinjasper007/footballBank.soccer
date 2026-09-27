"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { createPost, updatePost } from "@/actions/adminActions";
import { uploadFileWithProgress } from "@/lib/uploadWithProgress";
import { deleteFirebaseStorageFile } from "@/lib/firebaseStorageCleanup";

const normalizeImages = (value) =>
  (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);

export function BlogPostDialog({ open, onOpenChange, post, onSave }) {
  const { toast } = useToast();

  const [uploadProgress, setUploadProgress] = useState(null);
  const [pendingStorageDeletes, setPendingStorageDeletes] = useState([]);

  const [formData, setFormData] = useState({
    ...post,
    title: post?.title || "",
    author: post?.author || "Admin",
    status: post?.status || "Draft",
    summary: post?.summary || "",
    content: post?.content || "",
    imageUrl: normalizeImages(post?.imageUrl),
    tags: post?.tags || [],
    featured: post?.featured || false,
    views: post?.views || 0,
  });

  const [tagsInput, setTagsInput] = useState(post?.tags?.join(", ") || "");

  // Add this effect to update formData and tagsInput when post or dialog opens
  useEffect(() => {
    setPendingStorageDeletes([]);
    setFormData({
      ...post,
      title: post?.title || "",
      author: post?.author || "Admin",
      status: post?.status || "Draft",
      summary: post?.summary || "",
      content: post?.content || "",
      imageUrl: normalizeImages(post?.imageUrl),
      tags: post?.tags || [],
      featured: post?.featured || false,
      views: post?.views || 0,
    });
    setTagsInput(post?.tags?.join(", ") || "");
  }, [post, open]);

  const handleSave = async () => {
    if (
      !formData.title ||
      !formData.summary ||
      !formData.content ||
      !tagsInput ||
      !formData.status ||
      !formData.author
    ) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const finalData = { ...formData, tags };

    try {
      if (post?.id) {
        const updatedPost = await updatePost(post.id, finalData);
        if (!updatedPost?.id) throw new Error("Failed to update post");
      } else {
        const createdPost = await createPost(finalData);
        if (!createdPost?.id) throw new Error("Failed to create post");
      }

      const deletionResults = await Promise.allSettled(
        [...new Set(pendingStorageDeletes)].map(deleteFirebaseStorageFile),
      );
      const failedDeletes = deletionResults.filter(
        (deletion) => deletion.status === "rejected",
      ).length;

      onSave({ ...finalData, id: post?.id });

      toast({
        title: failedDeletes ? "Post saved with a warning" : "Success",
        description: failedDeletes
          ? `Post saved, but ${failedDeletes} media file(s) could not be deleted from storage.`
          : post?.id
            ? "Post updated successfully."
            : "New post created.",
        variant: failedDeletes ? "destructive" : "default",
      });

      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save blog post.",
        variant: "default",
      });
    }
  };

  const handleImageRemove = (image) => {
    setPendingStorageDeletes((previous) =>
      previous.includes(image) ? previous : [...previous, image],
    );
    setFormData((previous) => ({
      ...previous,
      imageUrl: previous.imageUrl.filter((url) => url !== image),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {post ? "Edit Blog Post" : "Create New Blog Post"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="author">Author</Label>
              <Select
                value={formData.author}
                onValueChange={(value) =>
                  setFormData({ ...formData, author: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Author" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Editor">Editor</SelectItem>
                  <SelectItem value="Guest Writer">Guest Writer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Published">Published</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="image">Images</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const path = `posts/${formData.title || Date.now()}/featured/${file.name}`;
                  const url = await uploadFileWithProgress(path, file, (progress) => {
                    setUploadProgress(progress);
                  });
                  setFormData((prev) => ({
                    ...prev,
                    imageUrl: [...prev.imageUrl, url],
                  }));
                  setUploadProgress(null);
                }}
              />
              {uploadProgress !== null && (
                <div className="w-full h-2 bg-gray-200 rounded mt-2">
                  <div
                    className="bg-primary-action h-2 rounded transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              {formData.imageUrl.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {formData.imageUrl.map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="relative aspect-video overflow-hidden border border-divider bg-primary-surface"
                    >
                      <img
                        src={image}
                        alt={`Post image ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleImageRemove(image)}
                        aria-label={`Delete post image ${index + 1}`}
                        title="Delete image"
                        className="absolute top-2 right-2 inline-flex size-9 items-center justify-center bg-white/95 text-accent-red shadow hover:bg-white"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="summary">Summary *</Label>
            <Textarea
              id="summary"
              rows={3}
              value={formData.summary}
              onChange={(e) =>
                setFormData({ ...formData, summary: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              rows={10}
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Write your blog post here..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {post ? "Update Post" : "Create Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

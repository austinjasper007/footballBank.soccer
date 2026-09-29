"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Save, Search } from "lucide-react";
import { getHomepageHeroPlayers, saveHomepageHeroSettings } from "@/actions/adminActions";
import { getHomepageHeroConfig } from "@/actions/publicActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { deleteFirebaseStorageFile } from "@/lib/firebaseStorageCleanup";
import { uploadFileWithProgress } from "@/lib/uploadWithProgress";

function getAge(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }
  return age;
}

export default function HomepageHeroSettings() {
  const { toast } = useToast();
  const [players, setPlayers] = useState([]);
  const [heroSettings, setHeroSettings] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [localPreview, setLocalPreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getHomepageHeroPlayers(), getHomepageHeroConfig()])
      .then(([availablePlayers, config]) => {
        if (!active) return;
        setPlayers(availablePlayers);
        setHeroSettings(config);
        setSelectedPlayerId(config?.playerId || "");
      })
      .catch((error) => {
        console.error("Error loading homepage hero settings:", error);
        if (active) {
          toast({
            title: "Could not load hero settings",
            description: "Refresh the page and try again.",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => {
    if (!localPreview) return undefined;
    return () => URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const positions = [...new Set(players.map((player) => player.position).filter(Boolean))].sort();
  const filteredPlayers = players.filter((player) => {
    const name = `${player.firstName} ${player.lastName}`.toLowerCase();
    if (nameFilter && !name.includes(nameFilter.trim().toLowerCase())) return false;
    if (positionFilter !== "all" && player.position !== positionFilter) return false;
    if (ageFilter && getAge(player.dob) !== Number(ageFilter)) return false;
    return true;
  });
  const selectedPlayer = players.find((player) => player.id === selectedPlayerId);
  const playerOptions =
    selectedPlayer && !filteredPlayers.some((player) => player.id === selectedPlayerId)
      ? [selectedPlayer, ...filteredPlayers]
      : filteredPlayers;
  const playerChanged = selectedPlayerId !== (heroSettings?.playerId || "");
  const previewImage = localPreview || heroSettings?.imageUrl || "";
  const needsNewImage = playerChanged || !heroSettings?.imageUrl;

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      toast({
        title: "Invalid image",
        description: "Choose an image up to 8 MB.",
        variant: "destructive",
      });
      return;
    }
    setImageFile(file);
    setLocalPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!selectedPlayerId) {
      toast({ title: "Select a player", variant: "destructive" });
      return;
    }
    if (needsNewImage && !imageFile) {
      toast({
        title: "Select a player image",
        description: "Upload a new image when choosing a different player.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    let uploadedImageUrl = "";
    let saved = false;
    try {
      if (imageFile) {
        uploadedImageUrl = await uploadFileWithProgress(
          `homepage-hero/${selectedPlayerId}`,
          imageFile,
          setUploadProgress,
        );
      }
      const imageUrl = uploadedImageUrl || heroSettings?.imageUrl;
      const result = await saveHomepageHeroSettings({
        playerId: selectedPlayerId,
        imageUrl,
      });
      saved = true;

      setHeroSettings({
        playerId: result.playerId,
        imageUrl: result.imageUrl,
        player: selectedPlayer,
      });
      setImageFile(null);
      setLocalPreview("");

      let cleanupFailed = false;
      if (result.previousImageUrl && result.previousImageUrl !== result.imageUrl) {
        try {
          await deleteFirebaseStorageFile(result.previousImageUrl);
        } catch (error) {
          console.error("Could not remove previous homepage hero image:", error);
          cleanupFailed = true;
        }
      }

      toast({
        title: cleanupFailed ? "Hero updated with a warning" : "Hero updated",
        description: cleanupFailed
          ? "The new hero is live, but the previous image could not be removed from storage."
          : "The homepage hero now shows the selected player.",
        variant: cleanupFailed ? "destructive" : "default",
      });
    } catch (error) {
      if (uploadedImageUrl && !saved) {
        try {
          await deleteFirebaseStorageFile(uploadedImageUrl);
        } catch (cleanupError) {
          console.error("Could not clean up an unsaved homepage hero image:", cleanupError);
        }
      }
      toast({
        title: "Could not save homepage hero",
        description: error?.message || "Try again.",
        variant: "destructive",
      });
    } finally {
      setUploadProgress(null);
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImagePlus className="h-5 w-5" /> Homepage Hero Player
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="hero-player-name-filter">Filter by name</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary-muted" />
              <Input
                id="hero-player-name-filter"
                value={nameFilter}
                onChange={(event) => setNameFilter(event.target.value)}
                placeholder="Search players"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="hero-player-position-filter">Filter by position</Label>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger id="hero-player-position-filter" className="mt-1">
                <SelectValue placeholder="All positions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All positions</SelectItem>
                {positions.map((position) => (
                  <SelectItem key={position} value={position}>{position}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="hero-player-age-filter">Filter by age</Label>
            <Input
              id="hero-player-age-filter"
              type="number"
              min="0"
              max="100"
              value={ageFilter}
              onChange={(event) => setAgeFilter(event.target.value)}
              placeholder="Any age"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="hero-player-select">Player</Label>
          <Select
            value={selectedPlayerId || undefined}
            onValueChange={setSelectedPlayerId}
            disabled={isLoading || players.length === 0}
          >
            <SelectTrigger id="hero-player-select" className="mt-1">
              <SelectValue placeholder={isLoading ? "Loading players..." : "Select a player"} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {playerOptions.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.firstName} {player.lastName} · {player.position || "Position unavailable"}
                  {getAge(player.dob) != null ? ` · ${getAge(player.dob)}` : ""}
                </SelectItem>
              ))}
              {!playerOptions.length && (
                <SelectItem value="no-players" disabled>No players match these filters</SelectItem>
              )}
            </SelectContent>
          </Select>
          {selectedPlayer && (
            <p className="mt-2 text-sm text-primary-muted">
              Selected: <span className="font-medium text-primary-text">{selectedPlayer.firstName} {selectedPlayer.lastName}</span>
              {selectedPlayer.position ? ` · ${selectedPlayer.position}` : ""}
              {getAge(selectedPlayer.dob) != null ? ` · Age ${getAge(selectedPlayer.dob)}` : ""}
            </p>
          )}
        </div>

        <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-2">
            <Label htmlFor="hero-player-image">Player image</Label>
            <Input
              id="hero-player-image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageChange}
              disabled={isSaving}
            />
            <p className="text-xs text-primary-muted">PNG, JPG, or WebP · up to 8 MB</p>
            {uploadProgress != null && (
              <div className="h-2 overflow-hidden rounded bg-primary-surface" aria-label={`Upload ${uploadProgress}%`}>
                <div className="h-full bg-primary-action transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
          </div>
          <div className="relative flex aspect-4/5 items-center justify-center overflow-hidden bg-primary-navy">
            {previewImage ? (
              <img src={previewImage} alt="Homepage hero player preview" className="h-full w-full object-contain object-bottom" />
            ) : (
              <ImagePlus className="size-8 text-primary-text-inverse/40" />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
          <p className="text-xs text-primary-muted">
            Replacing the hero removes its previous image from storage after the new setting saves.
          </p>
          <Button type="button" onClick={handleSave} disabled={isLoading || isSaving || !selectedPlayerId || (needsNewImage && !imageFile)}>
            <Save className="mr-2 size-4" /> {isSaving ? "Saving..." : "Save Hero"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
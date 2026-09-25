"use client";

import { uploadFileWithProgress } from "@/lib/uploadWithProgress";
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
import {
  FeaturedToggle,
  PlayerOfTheWeekToggle,
} from "@/components/FeatureToggle";
import { createPlayer, updatePlayer } from "@/actions/adminActions";
import { countries } from "@/data/countries&code";
import { footballLeagues } from "@/data/footballLeagues";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { PhoneField } from "@/components/ui/PhoneField";
const normalizeLeagues = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value.split(",").map((league) => league.trim()).filter(Boolean);
  }
  return [];
};

/**
 * PlayerDialog component for adding or editing a football player.
 */
export function PlayerDialog({ open, onOpenChange, player, onSave }) {
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState({});
  const uploading = Object.values(uploadProgress).some((p) => p < 100);

  const [formData, setFormData] = useState({
    ...player,
    firstName: player?.firstName || "",
    lastName: player?.lastName || "",
    dob: player?.dob || "",
    country: player?.country || "",
    countryCode: player?.countryCode || "",
    position: player?.position || "",
    height: player?.height || "",
    weight: player?.weight || "",
    foot: player?.foot || "",
    email: player?.email || "",
    phone: player?.phone || "",
    phoneCountryCode: player?.phoneCountryCode || "US",
    cvUrl: player?.cvUrl || "",
    headshotUrl: player?.headshotUrl || "",
    // Legacy multi-photo gallery state retained for existing player records.
    imageUrl: player?.imageUrl || [],
    description: player?.description || "",
    videoPrimary: player?.videoPrimary || "",
    videoAdditional: player?.videoAdditional || [],
    featured: player?.featured || false,
    playerOfTheWeek: player?.playerOfTheWeek || false,
    contractStatus: player?.contractStatus || "",
    availableFrom: player?.availableFrom || "",
    preferredLeagues: normalizeLeagues(player?.preferredLeagues),
    stats: player?.stats || {
      career: { Appearances: "", Goals: "", Assists: "", Trophies: "" },
      season: { Appearances: "", Goals: "", Assists: "", Minutes: "" },
      international: { Caps: "", Goals: "", Tournaments: "" },
    },
    clubHistory: player?.clubHistory || [
      { clubName: "", startDate: "", endDate: "", position: "" },
    ],
  });

  useEffect(() => {
    setFormData({
      ...player,
      ...formDataDefaults(player),
    });
  }, [player, open]);

  const formDataDefaults = (player = {}) => ({
    firstName: player?.firstName || "",
    lastName: player?.lastName || "",
    dob: player?.dob || "",
    country: player?.country || "",
    countryCode: player?.countryCode || "",
    position: player?.position || "",
    height: player?.height || "",
    weight: player?.weight || "",
    foot: player?.foot || "",
    email: player?.email || "",
    phone: player?.phone || "",
    phoneCountryCode: player?.phoneCountryCode || "US",
    cvUrl: player?.cvUrl || "",
    headshotUrl: player?.headshotUrl || "",
    // Legacy multi-photo gallery state retained for existing player records.
    imageUrl: player?.imageUrl || [],
    description: player?.description || "",
    videoPrimary: player?.videoPrimary || "",
    videoAdditional: player?.videoAdditional || [],
    featured: player?.featured || false,
    playerOfTheWeek: player?.playerOfTheWeek || false,
    contractStatus: player?.contractStatus || "",
    availableFrom: player?.availableFrom || "",
    preferredLeagues: normalizeLeagues(player?.preferredLeagues),
    stats: player?.stats || {
      career: { Appearances: "", Goals: "", Assists: "", Trophies: "" },
      season: { Appearances: "", Goals: "", Assists: "", Minutes: "" },
      international: { Caps: "", Goals: "", Tournaments: "" },
    },
    clubHistory: player?.clubHistory || [
      { clubName: "", startDate: "", endDate: "", position: "" },
    ],
  });

  const updateClubHistory = (index, field, value) => {
    const updated = [...formData.clubHistory];
    updated[index][field] = value;
    setFormData({ ...formData, clubHistory: updated });
  };

  const handleSave = async () => {
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.position ||
      !formData.email
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields including email",
        variant: "destructive",
      });
      return;
    }
    try {
      const result = player?.id
        ? await updatePlayer(player.id, formData)
        : await createPlayer(formData);
      const savedId = player?.id || result?.id;
      onSave({ ...formData, id: savedId });
      onOpenChange(false);
      toast({ title: "Success", description: "Player saved successfully" });
    } catch (err) {
      toast({
        title: "Error",
        description: err?.message || "Failed to save player",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = (files) => {
    const toUpload = Array.from(files)
      .slice(0, 3)
      .filter((file) => {
        const ok =
          (file.type === "image/jpeg" || file.type === "image/png") &&
          file.size <= 2 * 1024 * 1024;
        if (!ok)
          toast({
            title: "Invalid file",
            description: "Only JPG/PNG ≤2MB",
            variant: "destructive",
          });
        return ok;
      });
    toUpload.forEach((file, i) => {
      const path = `players/${formData.email || Date.now()}/images/${file.name}`;
      uploadFileWithProgress(path, file, (p) =>
        setUploadProgress((prev) => ({ ...prev, [`img-${i}`]: p }))
      ).then((url) => {
        setFormData((prev) => ({
          ...prev,
          imageUrl: [
            ...prev.imageUrl.slice(0, i),
            url,
            ...prev.imageUrl.slice(i + 1),
          ],
        }));
      });
    });
  };

  const handleHeadshotUpload = (file) => {
    if (!file) return;
    const path = `players/${formData.email || Date.now()}/headshot/${file.name}`;
    uploadFileWithProgress(path, file, (p) =>
      setUploadProgress((prev) => ({ ...prev, headshot: p }))
    ).then((url) => setFormData((prev) => ({ ...prev, headshotUrl: url })));
  };

  const handleVideoPrimaryUpload = (file) => {
    const path = `players/${formData.email || Date.now()}/videoPrimary/${file.name}`;
    uploadFileWithProgress(path, file, (p) =>
      setUploadProgress((prev) => ({ ...prev, videoPrimary: p }))
    ).then((url) => setFormData((prev) => ({ ...prev, videoPrimary: url })));
  };

  const handleVideoAdditionalUpload = (files) => {
    Array.from(files)
      .slice(0, 3)
      .forEach((file, i) => {
        const path = `players/${formData.email || Date.now()}/videoAdditional/${file.name}`;
        uploadFileWithProgress(path, file, (p) =>
          setUploadProgress((prev) => ({ ...prev, [`vidadd-${i}`]: p }))
        ).then((url) =>
          setFormData((prev) => ({
            ...prev,
            videoAdditional: [
              ...prev.videoAdditional.slice(0, i),
              url,
              ...prev.videoAdditional.slice(i + 1),
            ],
          }))
        );
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{player ? "Edit Player" : "Add Player"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="First Name *"
            value={formData.firstName}
            onChange={(val) => setFormData({ ...formData, firstName: val })}
          />
          <InputField
            label="Last Name *"
            value={formData.lastName}
            onChange={(val) => setFormData({ ...formData, lastName: val })}
          />
          <InputField
            label="Date of Birth"
            type="date"
            value={formData.dob}
            onChange={(val) => setFormData({ ...formData, dob: val })}
          />
          {/* country select */}
          <div>
            <Label>Country *</Label>
            <Select
              value={formData.countryCode}
              onValueChange={(code) => {
                const country =
                  countries.find((c) => c.code === code)?.name || "";
                setFormData({ ...formData, countryCode: code, country });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Position *</Label>
            <Select
              value={formData.position}
              onValueChange={(val) =>
                setFormData({ ...formData, position: val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Goalkeeper">Goalkeeper</SelectItem>
                <SelectItem value="Defender">Defender</SelectItem>
                <SelectItem value="Midfielder">Midfielder</SelectItem>
                <SelectItem value="Forward">Forward</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-around col-span-1">
            <FeaturedToggle
              value={formData.featured}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, featured: val }))
              }
            />
            <PlayerOfTheWeekToggle
              value={formData.playerOfTheWeek}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, playerOfTheWeek: val }))
              }
            />
          </div>
          <InputField
            label="Height (cm)"
            value={formData.height}
            onChange={(val) => setFormData({ ...formData, height: val })}
          />
          <InputField
            label="Weight (kg)"
            value={formData.weight}
            onChange={(val) => setFormData({ ...formData, weight: val })}
          />
          <div>
            <Label>Preferred Foot</Label>
            <Select
              value={formData.foot}
              onValueChange={(val) => setFormData({ ...formData, foot: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select foot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Left">Left</SelectItem>
                <SelectItem value="Right">Right</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <InputField
            label="Email"
            type="email"
            value={formData.email}
            onChange={(val) => setFormData({ ...formData, email: val })}
          />
          <PhoneField
            countryCode={formData.phoneCountryCode}
            phone={formData.phone}
            onCountryCodeChange={(value) => setFormData({ ...formData, phoneCountryCode: value })}
            onPhoneChange={(value) => setFormData({ ...formData, phone: value })}
          />
          <div>
            <Label>Contract Status</Label>
            <Select
              value={formData.contractStatus}
              onValueChange={(value) => setFormData({ ...formData, contractStatus: value, availableFrom: value === "Unavailable" ? formData.availableFrom : "" })}
            >
              <SelectTrigger><SelectValue placeholder="Select contract status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <InputField
            label="Available From"
            type="month"
            value={formData.availableFrom}
            onChange={(val) => setFormData({ ...formData, availableFrom: val })}
            disabled={formData.contractStatus !== "Unavailable"}
          />
          <MultiSelect
            label="Preferred Leagues"
            placeholder="Select preferred leagues"
            options={footballLeagues}
            value={normalizeLeagues(formData.preferredLeagues)}
            onChange={(preferredLeagues) => setFormData({ ...formData, preferredLeagues })}
          />
        </div>

        {/* Stats */}
        <div className="mt-6">
          <Label className="font-semibold mb-2">Player Stats</Label>
          {Object.entries(formData.stats).map(([group, statSet]) => (
            <div
              key={group}
              className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <span className="col-span-full font-medium capitalize">
                {group}
              </span>
              {Object.entries(statSet).map(([stat, value]) => (
                <InputField
                  key={stat}
                  label={stat}
                  type="number"
                  value={value}
                  onChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      stats: {
                        ...prev.stats,
                        [group]: { ...prev.stats[group], [stat]: val },
                      },
                    }))
                  }
                />
              ))}
            </div>
          ))}
        </div>

        {/* Club History */}
        <div className="mt-6">
          <Label className="font-semibold mb-2">Club History</Label>
          {formData.clubHistory.map((club, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
              <InputField
                label="Club Name"
                value={club.clubName}
                onChange={(val) => updateClubHistory(i, "clubName", val)}
              />
              <InputField
                label="Start month"
                type="month"
                value={club.startDate}
                onChange={(val) => updateClubHistory(i, "startDate", val)}
              />
              <InputField
                label="End month"
                type="month"
                value={club.endDate}
                onChange={(val) => updateClubHistory(i, "endDate", val)}
              />
              <div>
                <Label>Position</Label>
                <Select
                  value={club.position}
                  onValueChange={(val) => updateClubHistory(i, "position", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Goalkeeper">Goalkeeper</SelectItem>
                    <SelectItem value="Defender">Defender</SelectItem>
                    <SelectItem value="Midfielder">Midfielder</SelectItem>
                    <SelectItem value="Forward">Forward</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            type="button"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                clubHistory: [
                  ...prev.clubHistory,
                  { clubName: "", startDate: "", endDate: "", position: "" },
                ],
              }))
            }
          >
            + Add Club
          </Button>
          {/* Player Bio or Description */}
          <div className="md:col-span-2 mt-6">
            <Label htmlFor="description">Player Bio</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>
        </div>

        {/* Upload Sections */}
        <div className="mt-6 space-y-4 md:mt-8">
          <Label>Upload Player Headshot</Label>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleHeadshotUpload(e.target.files?.[0])}
          />
          {uploadProgress.headshot != null && (
            <ProgressBar progress={uploadProgress.headshot} />
          )}

          {/* Legacy admin multi-photo gallery upload retained for existing records. */}
          {/*
          <Label>Upload Images (max 3)</Label>
          <Input
            type="file"
            accept="image/jpeg,image/png"
            multiple
            onChange={(e) => handleImageUpload(e.target.files)}
          />
          {[0, 1, 2].map(
            (i) =>
              uploadProgress[`img-${i}`] != null && (
                <ProgressBar
                  key={`img-${i}`}
                  progress={uploadProgress[`img-${i}`]}
                />
              )
          )}
              */}

          <Label>Upload Primary Video *</Label>
          <Input
            type="file"
            accept="video/*"
            onChange={(e) =>
              e.target.files?.[0] && handleVideoPrimaryUpload(e.target.files[0])
            }
          />
          {uploadProgress.videoPrimary != null && (
            <ProgressBar progress={uploadProgress.videoPrimary} />
          )}

          <Label>Upload Additional Videos (max 3)</Label>
          <Input
            type="file"
            accept="video/*"
            multiple
            onChange={(e) => handleVideoAdditionalUpload(e.target.files)}
          />
          {[0, 1, 2].map(
            (i) =>
              uploadProgress[`vidadd-${i}`] != null && (
                <ProgressBar
                  key={`vidadd-${i}`}
                  progress={uploadProgress[`vidadd-${i}`]}
                />
              )
          )}

        </div>

        <div className="flex justify-end gap-2 mt-8">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={uploading}
            title={
              uploading ? "Please wait for all files to finish uploading" : ""
            }
          >
            {uploading
              ? "Uploading..."
              : player
                ? "Update Player"
                : "Add Player"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// InputField helper
function InputField({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// Simple progress bar
function ProgressBar({ progress }) {
  return (
    <div className="w-full bg-gray-200 rounded h-2 mt-1">
      <div
        className="bg-primary-action h-2 rounded transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

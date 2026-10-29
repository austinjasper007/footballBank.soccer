"use client";

import { useEffect, useRef, useState } from "react";
import { deleteObject, ref } from "firebase/storage";
import { ChevronLeft, ChevronRight, Plus, Save, Trash2, UploadCloud } from "lucide-react";
import { saveMediaPlayerProfile } from "@/actions/mediaPortalActions";
import { storage } from "@/firebase/config";
import { uploadFileWithProgress } from "@/lib/uploadWithProgress";

const textInputClass = "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100";
const textAreaClass = "min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100";
const yesNo = ["", "Yes", "No", "Don’t know"];
const steps = [
  "Personal and player details",
  "Club and contract",
  "Season and statistics",
  "Injury and fitness",
  "Football history",
  "Representative football and trials",
  "Player photographs",
];
const draftKey = (playerId) => `media-player-profile-draft:${playerId}`;
const playerStorageFolder = (email) => email?.trim().toLowerCase();

function createProfile(player) {
  const saved = player.publication?.playerProfile || {};
  const savedPersonal = saved.personal || {};
  const savedPlayer = saved.player || {};
  const savedClub = saved.currentClub || {};
  const oldHistory = Array.isArray(player.clubHistory) ? player.clubHistory : [];
  const savedPhotos = saved.photos || {};
  return {
    personal: {
      fullName: [player.firstName, player.lastName].filter(Boolean).join(" "),
      dateOfBirth: player.dob || "",
      placeOfBirth: "",
      nationality: player.country || "",
      passportValid: "",
      passportExpiry: "",
      currentCityCountry: "",
      ...savedPersonal,
    },
    player: {
      heightCm: player.height || "",
      weightKg: player.weight || "",
      preferredFoot: player.foot || "",
      mainPosition: player.position || "",
      currentJerseyNumber: "",
      otherPositions: [],
      previousJerseyNumbers: [],
      ...savedPlayer,
      otherPositions: savedPlayer.otherPositions || [],
      previousJerseyNumbers: savedPlayer.previousJerseyNumbers || [],
    },
    currentClub: {
      officialName: player.currentClub || "",
      country: "",
      league: "",
      joinedDate: "",
      registered: "",
      contractType: "",
      writtenContract: "",
      contractStartDate: "",
      contractExpiryDate: "",
      hasContractCopy: "",
      extensionOption: "",
      releaseClause: "",
      transferAgreement: "",
      moneyOwed: "",
      ...savedClub,
    },
    season: {
      teamMatches: "",
      matchdaySquad: "",
      matchesPlayed: "",
      starts: "",
      substituteAppearances: "",
      completeMatches: "",
      totalMinutes: "",
      goals: "",
      assists: "",
      yellowCards: "",
      redCards: "",
      cleanSheets: "",
      ...(saved.season || {}),
    },
    officialStats: {
      passCompletion: "",
      tackles: "",
      tacklesWon: "",
      interceptions: "",
      clearances: "",
      blocks: "",
      ballRecoveries: "",
      progressivePasses: "",
      longPasses: "",
      longPassAccuracy: "",
      chancesCreated: "",
      keyPasses: "",
      other: "",
      ...(saved.officialStats || {}),
    },
    injury: {
      injury: "",
      injuryDate: "",
      returnToFullTraining: "",
      medicallyClearedDate: "",
      firstCompetitiveMatchAfter: "",
      trainingWithoutRestrictions: "",
      playingWithoutRestrictions: "",
      currentTreatment: "",
      medicalReportAvailable: "",
      ...(saved.injury || {}),
    },
    footballHistory: saved.footballHistory || oldHistory.map((club) => ({
      academyOrClub: club.clubName || "",
      country: "",
      joined: club.startDate || "",
      left: club.endDate || "",
      ageJoined: "",
      ageLeft: "",
      level: "",
      position: club.position || "",
      leagueCompetition: "",
      appearances: "",
      goalsAssists: "",
      achievements: "",
      reasonLeft: "",
      federationRegistered: "",
    })),
    representative: {
      nationalTeamCamps: "",
      representedTeams: "",
      ...(saved.representative || {}),
    },
    trials: saved.trials || [],
    overseas: {
      experience: "",
      ...(saved.overseas || {}),
    },
    photos: {
      professionalHeadshot: "",
      fullBody: "",
      action: [],
      currentClubKit: "",
      recentMatchesTraining: [],
      ...savedPhotos,
    },
  };
}

function setNestedValue(value, path, nextValue) {
  const result = structuredClone(value);
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((node, key) => node[key], result);
  target[last] = nextValue;
  return result;
}

function TextField({ label, value, onChange, hint, type = "text", step }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      <input
        type={type}
        step={step}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className={textInputClass}
        maxLength={1500}
      />
      {hint && <span className="mt-1 block text-[11px] leading-4 text-slate-400">{hint}</span>}
    </label>
  );
}

function SelectField({ label, value, onChange, options = yesNo }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)} className={textInputClass}>
        {options.map((option) => <option key={option || "blank"} value={option}>{option || "Select"}</option>)}
      </select>
    </label>
  );
}

function TextAreaField({ label, value, onChange, hint }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      <textarea
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className={textAreaClass}
        maxLength={2000}
      />
      {hint && <span className="mt-1 block text-[11px] leading-4 text-slate-400">{hint}</span>}
    </label>
  );
}

function FormSection({ title, description, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
      <div className="mb-4">
        <h4 className="font-semibold text-slate-900">{title}</h4>
        {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function PhotoField({ label, value, multiple, onUpload, onRemove, progress, removing }) {
  const count = multiple ? (value || []).length : value ? 1 : 0;
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3">
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
        <span>
          <span className="block text-xs font-semibold text-slate-700">{label}</span>
          <span className="mt-1 block text-[11px] text-slate-400">
            JPG, PNG, or WebP · up to 5 MB {multiple ? `· ${count} added` : ""}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
          <UploadCloud className="size-4" /> Add
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={multiple}
          className="sr-only"
          onChange={onUpload}
          disabled={Boolean(progress)}
        />
      </label>
      {progress ? <p className="mt-2 text-xs text-blue-700">{progress}</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(multiple ? value || [] : value ? [value] : []).map((url, index) => (
          <div key={`${url}-${index}`} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <img src={url} alt={`${label} preview ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(index, url)}
              disabled={Boolean(removing)}
              className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 px-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
              aria-label={`Delete ${label} ${index + 1}`}
            >
              <Trash2 className="size-3.5" /> {removing ? "Deleting…" : "Delete photo"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RepeatableGroup({ title, items, onAdd, onRemove, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h5 className="text-sm font-semibold text-slate-800">{title}</h5>
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
          <Plus className="size-3.5" /> Add
        </button>
      </div>
      {items.length ? items.map((item, index) => (
        <div key={index} className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-3 flex justify-end">
            <button type="button" onClick={() => onRemove(index)} className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
              <Trash2 className="size-3.5" /> Remove
            </button>
          </div>
          {children(item, index)}
        </div>
      )) : <p className="text-xs text-slate-400">No entries added.</p>}
    </div>
  );
}

export default function MediaPlayerProfileForm({ player, onSaved }) {
  const [profile, setProfile] = useState(() => createProfile(player));
  const profileRef = useRef(profile);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [photoProgress, setPhotoProgress] = useState({});
  const revisionRef = useRef(0);
  const formRef = useRef(null);

  useEffect(() => {
    const initialProfile = createProfile(player);
    profileRef.current = initialProfile;
    setProfile(initialProfile);
    setDraftReady(false);
    setStep(0);
    revisionRef.current = 0;
    setMessage("");
    try {
      const savedDraft = localStorage.getItem(draftKey(player.id));
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed?.version === 1 && parsed.profile && typeof parsed.profile === "object") {
          profileRef.current = parsed.profile;
          setProfile(parsed.profile);
          setDraftStatus("Restored saved draft from this device");
        }
      } else {
        setDraftStatus("");
      }
    } catch (error) {
      setDraftStatus("Could not restore the saved draft");
      setMessage(`Saved draft could not be restored: ${error.message}`);
    } finally {
      setDraftReady(true);
    }
  }, [player.id]);

  function persistDraft(nextProfile) {
    try {
      localStorage.setItem(draftKey(player.id), JSON.stringify({ version: 1, profile: nextProfile }));
      setDraftStatus("Draft saved on this device");
    } catch (error) {
      setDraftStatus("Draft could not be saved");
      setMessage(`Draft could not be saved on this device: ${error.message}`);
    }
  }

  function commitProfile(nextProfile) {
    profileRef.current = nextProfile;
    setProfile(nextProfile);
    revisionRef.current += 1;
    if (draftReady) persistDraft(nextProfile);
  }

  const update = (path, value) => {
    commitProfile(setNestedValue(profileRef.current, path, value));
  };

  async function uploadPhotos(event, path, multiple, limit) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const emailFolder = playerStorageFolder(player.email);
    if (!emailFolder) {
      setMessage("This player record does not have an email address, so photos cannot be stored in the player folder.");
      return;
    }
    const currentValue = path.split(".").reduce((value, key) => value[key], profileRef.current);
    const currentCount = multiple ? (currentValue || []).length : currentValue ? 1 : 0;
    const accepted = files.filter((file) => {
      const valid = ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 5 * 1024 * 1024;
      if (!valid) setMessage(`${file.name}: select a JPG, PNG, or WebP image no larger than 5 MB.`);
      return valid;
    }).slice(0, Math.max(0, limit - currentCount));
    if (!accepted.length) {
      if (files.length && currentCount >= limit) {
        setMessage("Delete the existing photo before adding a replacement.");
      }
      return;
    }
    if (accepted.length < files.length) {
      setMessage(`Only ${Math.max(0, limit - currentCount)} more photo${limit - currentCount === 1 ? "" : "s"} can be added to this group.`);
    }

    setPhotoProgress((current) => ({ ...current, [path]: "Uploading images…" }));
    try {
      const uploaded = await Promise.all(accepted.map((file) =>
        uploadFileWithProgress(
          `players/${emailFolder}/media-portal/${path.replace(".", "-")}`,
          file,
          () => {},
        ),
      ));
      const existing = path.split(".").reduce((value, key) => value[key], profileRef.current);
      commitProfile(setNestedValue(profileRef.current, path, multiple ? [...(existing || []), ...uploaded].slice(0, limit) : uploaded[0]));
      setMessage("Player photo upload completed.");
    } catch (error) {
      setMessage(`Photo upload failed: ${error.message}`);
    } finally {
      setPhotoProgress((current) => ({ ...current, [path]: "" }));
    }
  }

  async function removePhoto(path, multiple, index, url) {
    setPhotoProgress((current) => ({ ...current, [path]: "Removing photo…" }));
    try {
      const fileRef = ref(storage, url);
      const emailFolder = playerStorageFolder(player.email);
      if (!emailFolder) throw new Error("This player record does not have an email address.");
      const managedFolder = `players/${emailFolder}/media-portal/`;
      if (
        fileRef.bucket !== storage.app.options.storageBucket
        || !fileRef.fullPath.startsWith(managedFolder)
      ) {
        throw new Error("This photo is outside the profile-managed Firebase folder and was not deleted.");
      }
      try {
        await deleteObject(fileRef);
      } catch (error) {
        if (error.code !== "storage/object-not-found") throw error;
      }
      const currentValue = path.split(".").reduce((value, key) => value[key], profileRef.current);
      commitProfile(setNestedValue(
        profileRef.current,
        path,
        multiple ? currentValue.filter((_, itemIndex) => itemIndex !== index) : "",
      ));
      setMessage("Photo deleted from Firebase Storage and removed from the profile.");
    } catch (error) {
      setMessage(`Photo deletion failed: ${error.message}`);
    } finally {
      setPhotoProgress((current) => ({ ...current, [path]: "" }));
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const submittedRevision = revisionRef.current;
    try {
      const saved = await saveMediaPlayerProfile(player.id, profileRef.current);
      let successMessage = "Player profile saved. It will appear on the private media profile.";
      if (revisionRef.current === submittedRevision) {
        profileRef.current = saved;
        setProfile(saved);
        try {
          localStorage.removeItem(draftKey(player.id));
          setDraftStatus("Saved to the player profile");
        } catch (error) {
          setDraftStatus("Saved to the player profile; local draft cleanup failed");
          successMessage = `Profile saved, but the local draft could not be cleared: ${error.message}`;
        }
      } else {
        successMessage = "The submitted version was saved. Newer edits remain in the local draft; save again to publish them.";
      }
      setMessage(successMessage);
      try {
        await onSaved();
      } catch (error) {
        setMessage(`${successMessage} The player list could not be refreshed: ${error.message}`);
      }
    } catch (error) {
      setMessage(error.message || "Could not save the player profile.");
    } finally {
      setBusy(false);
    }
  }

  function text(path, label, options = {}) {
    const rawValue = path.split(".").reduce((node, key) => node?.[key], profile);
    const value = Array.isArray(rawValue) ? rawValue.join(", ") : rawValue;
    return (
      <TextField
        key={path}
        label={label}
        value={value}
        type={options.type}
        hint={options.hint}
        step={options.step}
        onChange={(next) => update(
          path,
          ["player.otherPositions", "player.previousJerseyNumbers"].includes(path)
            ? next.split(",").filter((item) => item.length > 0)
            : next,
        )}
      />
    );
  }

  function area(path, label, hint) {
    return (
      <TextAreaField
        key={path}
        label={label}
        value={path.split(".").reduce((node, key) => node?.[key], profile)}
        hint={hint}
        onChange={(next) => update(path, next)}
      />
    );
  }

  function select(path, label, options = yesNo) {
    return (
      <SelectField
        key={path}
        label={label}
        value={path.split(".").reduce((node, key) => node?.[key], profile)}
        options={options}
        onChange={(next) => update(path, next)}
      />
    );
  }

  function photo(path, label, multiple = false, limit = 1) {
    return (
      <PhotoField
        key={path}
        label={label}
        value={path.split(".").reduce((node, key) => node?.[key], profile)}
        multiple={multiple}
        progress={photoProgress[path]}
        removing={photoProgress[path]?.startsWith("Removing")}
        onUpload={(event) => uploadPhotos(event, path, multiple, limit)}
        onRemove={(index, url) => removePhoto(path, multiple, index, url)}
      />
    );
  }

  function changeStep(nextStep) {
    setStep(Math.max(0, Math.min(steps.length - 1, nextStep)));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!draftReady) {
    return <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Restoring saved player-profile draft…</p>;
  }

  return (
    <form ref={formRef} onSubmit={saveProfile} className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-950">Private player profile and publication information</p>
          <p className="mt-1 text-xs leading-5 text-amber-900/80">
            Enter only information confirmed by the player. Leave unknown statistics and contract details blank; this data is shown only through active private media links. Email and phone are never included in this profile.
          </p>
          <p aria-live="polite" className="mt-2 text-xs font-medium text-amber-900/80">{draftStatus}</p>
        </div>
        <button type="submit" disabled={busy || Object.values(photoProgress).some(Boolean)} className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
          <Save className="size-4" /> {busy ? "Saving…" : "Save player profile"}
        </button>
      </div>

      <section aria-label="Profile form progress" className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {step + 1} of {steps.length}</p>
            <h3 className="mt-1 truncate text-base font-semibold text-slate-900 sm:text-lg">{steps[step]}</h3>
          </div>
          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{Math.round(((step + 1) / steps.length) * 100)}%</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </section>

      {step === 0 && <>
      <FormSection title="Personal information">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {text("personal.fullName", "Full passport name")}
          {text("personal.dateOfBirth", "Date of birth", { type: "date" })}
          {text("personal.placeOfBirth", "Place of birth")}
          {text("personal.nationality", "Nationality")}
          {select("personal.passportValid", "Valid international passport")}
          {text("personal.passportExpiry", "Passport expiry date", { type: "date" })}
          {text("personal.currentCityCountry", "Current city and country")}
        </div>
      </FormSection>

      <FormSection title="Player information">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {text("player.heightCm", "Height (cm)")}
          {text("player.weightKg", "Weight (kg)")}
          {text("player.preferredFoot", "Preferred foot")}
          {text("player.mainPosition", "Main position")}
          {text("player.currentJerseyNumber", "Current jersey number")}
          {text("player.otherPositions", "Other positions", { hint: "Separate multiple positions with commas, e.g. Right Back, Defensive Midfield." })}
          {text("player.previousJerseyNumbers", "Previous jersey numbers")}
        </div>
      </FormSection>
      </>}

      {step === 1 && <>
      <FormSection title="Current club and contract">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {text("currentClub.officialName", "Official club name")}
          {text("currentClub.country", "Club country")}
          {text("currentClub.league", "League or division")}
          {text("currentClub.joinedDate", "Date joined", { type: "date" })}
          {select("currentClub.registered", "Registered with club/federation")}
          {text("currentClub.contractType", "Professional or amateur")}
          {select("currentClub.writtenContract", "Written contract signed")}
          {text("currentClub.contractStartDate", "Contract start date", { type: "date" })}
          {text("currentClub.contractExpiryDate", "Contract expiry date", { type: "date" })}
          {select("currentClub.hasContractCopy", "Player has contract copy")}
          {area("currentClub.extensionOption", "Club extension option", "Is there any option for the club to extend the contract? If yes, explain the option and its terms.")}
          {area("currentClub.releaseClause", "Release clause", "Is there a release clause? If yes, state the amount and currency.")}
          {area("currentClub.transferAgreement", "Transfer, loan, or release agreement")}
          {area("currentClub.moneyOwed", "Outstanding salary, money, or allowances")}
        </div>
      </FormSection>
      </>}

      {step === 2 && <>
      <FormSection title="Current season" description="Record figures only when confirmed from official club or competition records.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {text("season.teamMatches", "Team league matches", { type: "number", step: 1 })}
          {text("season.matchdaySquad", "Player matchday squads", { type: "number", step: 1 })}
          {text("season.matchesPlayed", "Matches played", { type: "number", step: 1 })}
          {text("season.starts", "Starts", { type: "number", step: 1 })}
          {text("season.substituteAppearances", "Substitute appearances", { type: "number", step: 1 })}
          {text("season.completeMatches", "Complete 90-minute matches", { type: "number", step: 1 })}
          {text("season.totalMinutes", "Total minutes", { type: "number", step: 1 })}
          {text("season.goals", "Goals", { type: "number", step: 1 })}
          {text("season.assists", "Assists", { type: "number", step: 1 })}
          {text("season.yellowCards", "Yellow cards", { type: "number", step: 1 })}
          {text("season.redCards", "Red cards", { type: "number", step: 1 })}
          {text("season.cleanSheets", "Clean sheets in appearances", { type: "number", step: 1 })}
        </div>
      </FormSection>

      <FormSection title="Official playing statistics" description="Do not estimate. Leave fields blank if the club, league, or verified platform has not supplied the statistic.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {text("officialStats.passCompletion", "Pass completion %", { type: "number", step: "any" })}
          {text("officialStats.tackles", "Tackles", { type: "number", step: 1 })}
          {text("officialStats.tacklesWon", "Tackles won", { type: "number", step: 1 })}
          {text("officialStats.interceptions", "Interceptions", { type: "number", step: 1 })}
          {text("officialStats.clearances", "Clearances", { type: "number", step: 1 })}
          {text("officialStats.blocks", "Blocks", { type: "number", step: 1 })}
          {text("officialStats.ballRecoveries", "Ball recoveries", { type: "number", step: 1 })}
          {text("officialStats.progressivePasses", "Progressive passes", { type: "number", step: 1 })}
          {text("officialStats.longPasses", "Long passes", { type: "number", step: 1 })}
          {text("officialStats.longPassAccuracy", "Long-pass accuracy", { type: "number", step: "any" })}
          {text("officialStats.chancesCreated", "Chances created", { type: "number", step: 1 })}
          {text("officialStats.keyPasses", "Key passes", { type: "number", step: 1 })}
          {area("officialStats.other", "Other verified statistics")}
        </div>
      </FormSection>
      </>}

      {step === 3 && <>
      <FormSection title="Injury and current fitness">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {text("injury.injury", "Injury")}
          {text("injury.injuryDate", "Injury date", { type: "date" })}
          {text("injury.returnToFullTraining", "Date returned to full team training", { type: "date" })}
          {text("injury.medicallyClearedDate", "Medical clearance date", { type: "date" })}
          {text("injury.firstCompetitiveMatchAfter", "Date of first competitive match after injury", { type: "date" })}
          {select("injury.trainingWithoutRestrictions", "Training without restrictions")}
          {select("injury.playingWithoutRestrictions", "Playing without restrictions")}
          {select("injury.currentTreatment", "Receiving current treatment")}
          {select("injury.medicalReportAvailable", "Medical report/clearance available")}
        </div>
      </FormSection>
      </>}

      {step === 4 && <>
      <FormSection title="Football history" description="Add every academy and club, starting with the first. Keep appearances and achievements blank if not verified.">
        <RepeatableGroup
          title="Academies and clubs"
          items={profile.footballHistory}
          onAdd={() => update("footballHistory", [...profile.footballHistory, {}])}
          onRemove={(index) => update("footballHistory", profile.footballHistory.filter((_, itemIndex) => itemIndex !== index))}
        >
          {(entry, index) => {
            const field = (key, label) => (
              <TextField
                key={key}
                label={label}
                value={entry[key]}
                type={key === "joined" || key === "left" ? "date" : key === "ageJoined" || key === "ageLeft" || key === "appearances" ? "number" : "text"}
                step={key === "ageJoined" || key === "ageLeft" || key === "appearances" ? 1 : undefined}
                onChange={(value) => update(`footballHistory.${index}.${key}`, value)}
              />
            );
            return (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {field("academyOrClub", "Academy or club")}
                {field("country", "Country")}
                {field("joined", "Date joined")}
                {field("left", "Date left")}
                {field("ageJoined", "Age when joined")}
                {field("ageLeft", "Age when left")}
                {field("level", "Amateur or professional")}
                {field("position", "Position played")}
                {field("leagueCompetition", "League or competition")}
                {field("appearances", "Appearances")}
                {field("goalsAssists", "Goals and assists")}
                {field("federationRegistered", "Federation registered")}
                <div className="sm:col-span-2">{area(`footballHistory.${index}.achievements`, "Trophies, promotions, and achievements")}</div>
                <div className="sm:col-span-2">{area(`footballHistory.${index}.reasonLeft`, "Reason for leaving")}</div>
              </div>
            );
          }}
        </RepeatableGroup>
      </FormSection>
      </>}

      {step === 5 && <>
      <FormSection title="National and representative football">
        <div className="grid gap-4 lg:grid-cols-2">
          {area("representative.nationalTeamCamps", "National-team camps and invitations", "Include age level, team, date, and details.")}
          {area("representative.representedTeams", "State, country, school, academy, or representative teams")}
        </div>
      </FormSection>

      <FormSection title="Trials and international experience">
        <RepeatableGroup
          title="Professional-club trials"
          items={profile.trials}
          onAdd={() => update("trials", [...profile.trials, {}])}
          onRemove={(index) => update("trials", profile.trials.filter((_, itemIndex) => itemIndex !== index))}
        >
          {(entry, index) => {
            const field = (key, label) => (
              <TextField
                key={key}
                label={label}
                value={entry[key]}
                type={key === "date" ? "date" : "text"}
                onChange={(value) => update(`trials.${index}.${key}`, value)}
              />
            );
            return (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {field("club", "Club")}
                {field("country", "Country")}
                {field("date", "Trial date")}
                {field("duration", "Trial duration")}
                <div className="sm:col-span-2 lg:col-span-4">{area(`trials.${index}.outcome`, "Outcome")}</div>
              </div>
            );
          }}
        </RepeatableGroup>
        <div className="mt-5">
          {area("overseas.experience", "Previous residence or football outside Nigeria", "Include country, dates, club, and relevant details.")}
        </div>
      </FormSection>
      </>}

      {step === 6 && <>
      <FormSection title="Player photographs">
        <div className="grid gap-3 sm:grid-cols-2">
          {photo("photos.professionalHeadshot", "Recent professional headshot")}
          {photo("photos.fullBody", "Recent full-body photo")}
          {photo("photos.action", "Competitive action photos", true, 5)}
          {photo("photos.currentClubKit", "Photo in current club kit")}
          {photo("photos.recentMatchesTraining", "Recent match or training photos", true, 10)}
        </div>
      </FormSection>
      </>}

      {message && <p role="status" className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" disabled={step === 0} onClick={() => changeStep(step - 1)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">
          <ChevronLeft className="size-4" /> Previous
        </button>
        {step < steps.length - 1 ? (
          <button type="button" onClick={() => changeStep(step + 1)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 sm:w-auto">
            Next <ChevronRight className="size-4" />
          </button>
        ) : (
          <button type="submit" disabled={busy || Object.values(photoProgress).some(Boolean)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
            <Save className="size-4" /> {busy ? "Saving…" : "Save player profile"}
          </button>
        )}
      </div>
    </form>
  );
}

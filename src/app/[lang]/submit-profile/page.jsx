"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/NewAuthContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { uploadFileWithProgress } from "@/lib/uploadWithProgress";
import { createSubmission } from "@/actions/protectedAction";
import { getUserById } from "@/actions/adminActions";
import { countries } from "@/data/countries&code";
import { footballLeagues } from "@/data/footballLeagues";
import Link from "next/link";
import { getCountryCallingCode } from "libphonenumber-js";
import { PhoneField } from "@/components/ui/PhoneField";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { getClientDictionary } from "@/lib/client-dictionaries";

export default function PlayerSubmissionForm() {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loading: isAuthLoading } = useAuth();
  const SUBSCRIPTIONS_DISABLED = true;
  const lang = pathname?.split("/")[1] || "en";
  const [dict, setDict] = useState(null);
  const t = dict?.submitProfilePage;
  const a = dict?.auth;

  useEffect(() => {
    getClientDictionary(lang).then(setDict);
  }, [lang]);

  const [loading, setLoading] = useState(true);
  const [submittingUser, setSubmittingUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    country: "",
    countryCode: "",
    currentClub: "",
    position: "",
    foot: "",
    height: "",
    weight: "",
    email: "",
    phone: "",
    phoneCountryCode: "US",
    description: "",
    contractStatus: "",
    availableFrom: "",
    preferredLeagues: [],
    stats: {
      career: { Appearances: "", Goals: "", Assists: "", Trophies: "" },
      season: { Appearances: "", Goals: "", Assists: "", Minutes: "" },
      international: { Caps: "", Goals: "", Tournaments: "" },
    },
    clubHistory: [{ clubName: "", startDate: "", endDate: "", position: "", isCurrent: true }],
    featured: false,
    playerOfTheWeek: false,
    headshotUrl: "",
    // Legacy multi-photo gallery state retained for older submissions and records.
    imageUrl: [],
    videoPrimary: "",
    videoAdditional: [],
  });

  const uploading = Object.values(uploadProgress).some(
    (p) => p != null && p < 100
  );

  // ✅ Subscription check
  const checkSubscription = async () => {
    if (SUBSCRIPTIONS_DISABLED) {
      return true;
    }

    /*
    Subscription validation is intentionally disabled.
    try {
      const res = await fetch("/api/subscriptions/check");
      const data = await res.json();

      if (!data.subscription) return false;
      if (data.subscription.usedSubmissions >= data.subscription.maxSubmissions)
        return false;

      setSubscription(data.subscription);
      return true;
    } catch (err) {
      console.error("Error checking subscription:", err);
      return false;
    }
    */
  };

  // ✅ Auth + subscription gate
  useEffect(() => {
    const init = async () => {
      if (isAuthLoading) return; // Wait for auth

      const lang = pathname.split("/")[1] || "en";

      if (!isAuthenticated) {
        router.replace(
          `/${lang}/auth/login?redirect=${encodeURIComponent(pathname)}`
        );
        return;
      }

      const valid = await checkSubscription();
      if (!valid) {
        return;
      }

      // Auth + sub okay → fetch user
      const u = await getUserById(user.id);
      const submissionStatusResponse = await fetch("/api/profile/submission-status", { credentials: "include" });
      const submissionStatus = submissionStatusResponse.ok ? await submissionStatusResponse.json() : { canSubmit: true };
      if (submissionStatus.canSubmit === false) {
        router.replace(`/${lang}/${u?.role === "player" ? "player-profile" : "profile"}`);
        return;
      }
      setSubmittingUser(u);
      const registeredCountry = u?.address?.country || "";
      const registeredCountryCode = countries.find(
        (country) => country.name.toLowerCase() === registeredCountry.toLowerCase(),
      )?.code || u?.phoneCountryCode || "US";
      const registeredDialCode = `+${getCountryCallingCode(registeredCountryCode)}`;
      const registeredPhone = u?.phone?.startsWith(registeredDialCode)
        ? u.phone.slice(registeredDialCode.length)
        : u?.phone || "";
      setFormData((previous) => ({
        ...previous,
        firstName: u?.firstName || previous.firstName,
        lastName: u?.lastName || previous.lastName,
        email: u?.email || previous.email,
        country: registeredCountry || previous.country,
        countryCode: registeredCountryCode || previous.countryCode,
        phone: registeredPhone || previous.phone,
        phoneCountryCode: registeredCountryCode || previous.phoneCountryCode,
        address: u?.address || previous.address,
        shippingAddress: u?.shippingAddress || previous.shippingAddress,
      }));
      setLoading(false);
    };

    init();
  }, [isAuthLoading, isAuthenticated, pathname, router, user]);

  // ✅ Loading screen before checks complete
  if (loading) {
    return (
      <div className="min-h-screen bg-primary-bg flex items-center justify-center">
        <div className="text-center">
          {/* <RefreshCw className="w-8 h-8 animate-spin text-accent-red mx-auto mb-4" /> */}
          <p className="text-primary-muted">Checking your access...</p>
          <p className="text-primary-muted">
            Please wait while we verify your subscription.
          </p>
        </div>
      </div>
    );
  }

  // ✅ Validation + steps logic
  const validateStep = () => {
    const errs = [];
    if (step === 1) {
      [
        "firstName",
        "lastName",
        "dob",
        "country",
        "position",
        "height",
        "weight",
        "foot",
        "email",
        "phone",
      ].forEach((k) => !formData[k] && errs.push(k));
      if (submittingUser?.email && formData.email.trim().toLowerCase() !== submittingUser.email.trim().toLowerCase()) {
        errs.push("emailMatch");
      }
    }
    if (step === 3) {
      if (!formData.headshotUrl) errs.push("headshotUrl");
    }
    setErrors(errs);
    return errs.length === 0;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(step + 1);
      return;
    }
    toast({
      title: t?.completeFieldsTitle || "Complete the required fields",
      description: t?.completeFieldsDescription || "Check the highlighted information before continuing.",
      variant: "destructive",
    });
  };
  const prevStep = () => setStep(step - 1);

  const updateClubHistory = (index, field, value) => {
    setFormData((previous) => ({
      ...previous,
      ...(previous.clubHistory[index]?.isCurrent && field === "clubName"
        ? { currentClub: value }
        : {}),
      clubHistory: previous.clubHistory.map((club, clubIndex) =>
        clubIndex === index ? { ...club, [field]: value } : club,
      ),
    }));
  };

  const submitForm = async () => {
    if (!formData.headshotUrl) {
      toast({
        title: t?.headshotRequiredTitle || "Headshot required",
        description: t?.headshotRequiredDescription || "Please upload a player headshot before submitting.",
        variant: "destructive",
      });
      return;
    }
    if (uploading) {
      toast({
        title: t?.uploadInProgressTitle || "Upload in progress",
        description: t?.uploadInProgressDescription || "Please wait for all uploads to finish before submitting.",
        variant: "destructive",
      });
      return;
    }
    const valid = await checkSubscription();
    if (valid) {
      try {
        await createSubmission({
          ...formData,
          phone: `+${getCountryCallingCode(formData.phoneCountryCode)}${formData.phone}`.replace(/\s+/g, ""),
          submittedAt: new Date(),
        });
        setSubmitted(true);
        setStep(4);
        toast({
          title: t?.successTitle || "Success",
          description: t?.successDescription || "Profile submitted successfully.",
        });
      } catch (error) {
        console.error("Submission error:", error);
        toast({
          title: t?.errorTitle || "Error",
          description: error?.message || (t?.errorDescription || "Failed to submit profile."),
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: t?.errorTitle || "Error",
        description: t?.subscriptionRequired || "You need an active subscription to submit your profile.",
        variant: "destructive",
      });
    }
  };

  // ✅ Form content (unchanged except gating)
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Step indicators */}
      <div className="mb-8 -mx-1 overflow-x-auto px-1 pb-2" aria-label="Profile submission progress">
        <div className="flex min-w-max items-center justify-center gap-3 sm:w-full sm:gap-4">
          {[t?.stepDetails || "Details", t?.stepStats || "Stats & Career", t?.stepMedia || "Media", t?.stepComplete || "Complete"].map((l, i) => (
            <div key={l} className="flex shrink-0 items-center gap-3 sm:gap-4">
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors sm:size-9 ${
                step > i + 1
                  ? "border-primary-action bg-primary-action text-primary-text-inverse"
                  : step === i + 1
                    ? "border-primary-action bg-primary-action text-primary-text-inverse"
                    : "border-divider bg-primary-card text-primary-muted"
              }`}
            >
              {step > i + 1 ? "✓" : i + 1}
            </div>
            <span
              className={`text-xs font-medium sm:text-sm ${step >= i + 1 ? "text-primary-text" : "text-primary-muted"}`}
            >
              {l}
            </span>
            {i < 3 && (
              <div
                className={`h-px w-8 sm:w-12 ${step > i + 1 ? "bg-primary-action" : "bg-divider"}`}
                aria-hidden="true"
              />
            )}
            </div>
          ))}
        </div>
      </div>

      {/* === STEP 1 === */}
      {step === 1 && (
        <div className="rounded-xl bg-primary-card p-5 shadow-sm sm:p-8">
          <h2 className="mb-6 text-xl font-semibold">{t?.step1Title || "Personal & Availability"}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { label: a?.firstName || "First Name", field: "firstName" },
              { label: a?.lastName || "Last Name", field: "lastName" },
              { label: t?.dateOfBirth || "Date of Birth", field: "dob", type: "date" },
              { label: a?.email || "Email", field: "email", type: "email" },
            ].map(({ label, field, type }) => (
              <InputField
                key={field}
                label={label}
                value={formData[field]}
                type={type}
                onChange={(val) => setFormData({ ...formData, [field]: val })}
              />
            ))}
            <PhoneField
              countryCode={formData.phoneCountryCode}
              phone={formData.phone}
              onCountryCodeChange={(value) => setFormData({ ...formData, phoneCountryCode: value })}
              onPhoneChange={(value) => setFormData({ ...formData, phone: value })}
            />
            <div>
              <Label>{a?.country || "Country"} *</Label>
              <Select
                value={formData.countryCode}
                onValueChange={(code) => {
                  const country =
                    countries.find((c) => c.code === code)?.name || "";
                  setFormData({ ...formData, countryCode: code, country });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t?.selectCountry || "Select country"} />
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
              <Label>{t?.position || "Position"} *</Label>
              <Select
                value={formData.position}
                onValueChange={(val) =>
                  setFormData({ ...formData, position: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t?.selectPosition || "Select position"} />
                </SelectTrigger>
                <SelectContent>
                  {["Goalkeeper", "Defender", "Midfielder", "Forward"].map(
                    (opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t?.preferredFoot || "Preferred Foot"} *</Label>
              <Select
                value={formData.foot}
                onValueChange={(val) => setFormData({ ...formData, foot: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t?.selectFoot || "Select foot"} />
                </SelectTrigger>
                <SelectContent>
                  {["Left", "Right", "Both"].map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <InputField
              label={t?.heightCm || "Height (cm)"}
              type="number"
              value={formData.height}
              onChange={(val) => setFormData({ ...formData, height: val })}
            />
            <InputField
              label={t?.weightKg || "Weight (kg)"}
              type="number"
              value={formData.weight}
              onChange={(val) => setFormData({ ...formData, weight: val })}
            />
            <div>
              <Label>{t?.contractStatus || "Contract Status"}</Label>
              <Select
                value={formData.contractStatus}
                onValueChange={(val) => setFormData({ ...formData, contractStatus: val, availableFrom: val === "Unavailable" ? formData.availableFrom : "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t?.selectContractStatus || "Select contract status"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">{t?.available || "Available"}</SelectItem>
                  <SelectItem value="Unavailable">{t?.unavailable || "Unavailable"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.contractStatus === "Unavailable" && (
              <InputField
                label={t?.availableFrom || "Available From"}
                type="month"
                value={formData.availableFrom}
                onChange={(val) =>
                  setFormData({ ...formData, availableFrom: val })
                }
              />
            )}
            <MultiSelect
              label={t?.preferredLeagues || "Preferred Leagues"}
              placeholder={t?.selectPreferredLeague || "Select preferred leagues"}
              options={footballLeagues}
              value={formData.preferredLeagues}
              onChange={(preferredLeagues) =>
                setFormData({ ...formData, preferredLeagues })
              }
            />
            <div className="md:col-span-2">
              <Label>{t?.bio || "Bio"}</Label>
              <Textarea
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={nextStep}>{t?.next || "Next"}</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-xl border border-divider bg-primary-card p-5 shadow-sm sm:p-8">
          <h2 className="mb-2 text-xl font-semibold">{t?.step2Title || "Stats & career history"}</h2>
          <p className="mb-6 text-sm text-primary-muted">{t?.step2Subtitle || "Optional information. You can leave these fields blank and continue."}</p>
          <div className="space-y-8">
            {Object.entries(formData.stats).map(([group, statSet]) => (
              <div key={group}>
                <h3 className="mb-3 font-heading text-lg font-semibold capitalize">{group} {t?.statistics || "statistics"}</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(statSet).map(([stat, value]) => (
                    <InputField key={`${group}-${stat}`} label={stat} type="number" value={value} onChange={(nextValue) => setFormData((previous) => ({ ...previous, stats: { ...previous.stats, [group]: { ...previous.stats[group], [stat]: nextValue } } }))} />
                  ))}
                </div>
              </div>
            ))}
            <div>
              <div className="mb-3 flex items-end justify-between gap-4"><div><h3 className="font-heading text-lg font-semibold">{t?.clubHistory || "Club history"}</h3><p className="text-sm text-primary-muted">{t?.clubHistorySubtitle || "Add your current club and previous clubs with playing periods."}</p></div><Button type="button" variant="outline" onClick={() => setFormData((previous) => ({ ...previous, clubHistory: [...previous.clubHistory, { clubName: "", startDate: "", endDate: "", position: "", isCurrent: false }] }))}>{t?.addClub || "+ Add club"}</Button></div>
              <div className="space-y-4">{formData.clubHistory.map((club, index) => {
                if (club.isCurrent && formData.contractStatus !== "Unavailable") return null;
                return <div key={index} className="grid gap-4 border-t border-divider pt-4 sm:grid-cols-2 lg:grid-cols-4"><InputField label={club.isCurrent ? (t?.currentClub || "Current club") : (t?.clubName || "Club name")} value={club.clubName} onChange={(value) => updateClubHistory(index, "clubName", value)} /><InputField label={t?.startMonth || "Start month"} type="month" value={club.startDate} onChange={(value) => updateClubHistory(index, "startDate", value)} /><InputField label={t?.endMonth || "End month"} type="month" value={club.endDate} onChange={(value) => updateClubHistory(index, "endDate", value)} /><div><Label>{t?.position || "Position"}</Label><Select value={club.position} onValueChange={(value) => updateClubHistory(index, "position", value)}><SelectTrigger><SelectValue placeholder={t?.selectPosition || "Select position"} /></SelectTrigger><SelectContent>{["Goalkeeper", "Defender", "Midfielder", "Forward"].map((position) => <SelectItem key={position} value={position}>{position}</SelectItem>)}</SelectContent></Select></div></div>;
              })}</div>
            </div>
          </div>
          <div className="mt-8 flex justify-between"><Button variant="outline" onClick={prevStep}>{t?.back || "Back"}</Button><Button onClick={nextStep}>{t?.continueToMedia || "Continue to media"}</Button></div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-xl border border-divider bg-primary-card p-5 shadow-sm sm:p-8">
          <h2 className="mb-2 text-xl font-semibold">{t?.step3Title || "Media uploads"}</h2>
          <p className="mb-6 text-sm text-primary-muted">{t?.step3Subtitle || "Upload one clear headshot for your player card, then add the videos clubs should review."}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>{t?.playerHeadshot || "Player headshot *"}</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const ref = `players/${formData.email}/headshot/${file.name}`;
                  uploadFileWithProgress(ref, file, (p) => {
                    setUploadProgress((prev) => ({ ...prev, headshot: p }));
                  }).then((url) =>
                    setFormData((prev) => ({ ...prev, headshotUrl: url }))
                  );
                }}
              />
              {uploadProgress.headshot != null && <ProgressBar progress={uploadProgress.headshot} />}
              {formData.headshotUrl && <p className="mt-2 text-xs text-primary-muted">{t?.headshotUploaded || "Headshot uploaded successfully."}</p>}

              {/* Legacy multi-photo registration flow retained for historical submissions. */}
              {/*
              <Label>Upload Photos (max 3)</Label>
              <Input type="file" accept="image/*" multiple onChange={...} />
              */}
            </div>

            <div className="md:col-span-2">
              <Label>{t?.primaryVideo || "Primary Video"}</Label>
              <Input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const path = `players/${formData.email}/videoPrimary/${file.name}`;
                  uploadFileWithProgress(path, file, (p) => {
                    setUploadProgress((prev) => ({ ...prev, videoPrimary: p }));
                  }).then((url) =>
                    setFormData((prev) => ({ ...prev, videoPrimary: url }))
                  );
                }}
              />
              {uploadProgress.videoPrimary != null && (
                <ProgressBar progress={uploadProgress.videoPrimary} />
              )}
            </div>

            <div className="md:col-span-2">
              <Label>{t?.additionalVideos || "Additional Videos (max 3)"}</Label>
              <Input
                type="file"
                accept="video/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []).slice(0, 3);
                  const uploaders = files.map((file, i) => {
                    const path = `players/${formData.email}/videoAdditional/${file.name}`;
                    return uploadFileWithProgress(path, file, (p) => {
                      setUploadProgress((prev) => ({
                        ...prev,
                        [`vid-${i}`]: p,
                      }));
                    });
                  });
                  Promise.all(uploaders).then((urls) =>
                    setFormData((prev) => ({ ...prev, videoAdditional: urls }))
                  );
                }}
              />
              {[0, 1, 2].map(
                (i) =>
                  uploadProgress[`vid-${i}`] != null && (
                    <ProgressBar
                      key={i}
                      progress={uploadProgress[`vid-${i}`]}
                    />
                  )
              )}
            </div>

          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={prevStep}>
              {t?.back || "Back"}
            </Button>
            <Button onClick={submitForm} disabled={uploading || !formData.headshotUrl}>{t?.submit || "Submit"}</Button>
          </div>
        </div>
      )}

      {step === 4 && submitted && (
        <div className="bg-white shadow rounded-xl border border-divider p-8 text-center">
          <div className="text-3xl text-accent-green mb-4">
            <i className="fa-solid fa-check-circle"></i>
          </div>
          <h2 className="text-2xl font-bold mb-2">{t?.submittedTitle || "Submitted Successfully"}</h2>
          <p className="text-primary-muted mb-4">
            {t?.submittedSubtitle || "Our team will contact you shortly."}
          </p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => window.location.reload()}>
            {t?.submitAnother || "Submit Another"}
          </Button>
          <Link href="/">
            {t?.goToHome || "Go to Home"}
          </Link>
          </div>
          
        </div>
      )}
    </section>
  );
}

// Progress bar component
function ProgressBar({ progress }) {
  return (
    <div className="w-full h-2 bg-gray-200 rounded mt-2 overflow-hidden">
      <div
        className="bg-primary-action h-full transition-all duration-300"
        style={{ width: `${Math.round(progress)}%` }}
      />
    </div>
  );
}

// Reusable input field
function InputField({ label, value, onChange, type = "text", disabled = false }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

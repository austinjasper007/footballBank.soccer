"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { FaSpinner } from "react-icons/fa";
import "aos/dist/aos.css";
import { handleContactSubmit } from "@/actions/emailActions";
import { FaSquareXTwitter } from "react-icons/fa6";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define EmailError if not imported from elsewhere
class EmailError extends Error {
  constructor(error) {
    super(error);
    this.name = "EmailError";
    this.error = error;
  }
}

export default function ContactClient({ lang = "en", dict }) {
  const { toast } = useToast();
  const [status, setStatus] = useState("idle");

  /**
   * Handles the contact form submission, sends form data via emailActions,
   * displays toast notifications based on the result, and resets the form.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submit event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");

    const formData = new FormData(e.currentTarget);
    try {
      const result = await handleContactSubmit(formData);

      if (result.success) {
        toast({
          title: dict?.contact?.success || "Message Sent",
          description:
            dict?.contact?.success ||
            "We have received your message and will respond shortly.",
        });
        setStatus("success");
        e.target.reset();
      } else {
        setStatus("error");
        if (result.error instanceof Error) {
          throw result.error;
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: error.name,
          description: error.message,
        });
      } else if (error instanceof EmailError) {
        toast({
          title: error.name,
          description: error.error,
        });
      }
    } finally {
      setStatus("idle");
    }
  };

  return (
    <main className="bg-primary-surface text-primary-text">
      <section className="bg-primary-navy px-5 py-10 text-primary-text-inverse sm:px-10 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-7xl">
        <p className="eyebrow">Start a conversation</p>
        <h1 className="mt-6 max-w-3xl font-heading text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
          {dict?.contact?.title || "Contact Us"}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-primary-text-inverse/70 sm:text-lg">
          {dict?.contact?.subtitle || "Get in touch with our team"}
        </p>
        </div>
      </section>

      <section className="py-8 sm:py-10 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-12">
          <div
            className="flex flex-col"
            data-aos="fade-down"
          >
            {[
              {
                title: dict?.contact?.companyName || "FootballBank International",
                icon: "fa-building",
                color: "red",
                text: "FootballBank International",
                subtitle: dict?.contact?.officialName || "Sports Management & Football Business",
              },
              {
                title: dict?.contact?.email || "Email",
                icon: "fa-envelope",
                color: "red",
                text: "contact@footballbank.soccer",
                subtitle:
                  dict?.contact?.ourInboxOpen || "Our inbox is always open",
                isClickable: true,
                type: "email"
              },
              {
                title: dict?.contact?.phone || "Phone",
                icon: "fa-phone",
                color: "red",
                text: "+1 (862) 340-2213",
                subtitle: dict?.contact?.callUs || "Call us anytime",
                isClickable: true,
                type: "phone"
              },
              // {
              //   title: dict?.contact?.globalBranches || "Global Branches",
              //   icon: "fa-globe",
              //   color: "red",
              //   text: "Africa, US, UK, Europe, Asia, South America",
              //   subtitle:
              //     dict?.contact?.weOperateWorldwide || "We operate worldwide",
              // },
            ].map(({ title, icon, text, subtitle, isClickable, type }) => (
              <div
                key={title}
                className="flex items-start gap-4 border-b border-divider py-6 first:border-t"
                data-aos="fade-left"
                data-aos-delay="300"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-action/10">
                  <i
                    className={`fa-solid ${icon} text-xl text-primary-action`}
                  />
                </div>
                <div>
                  <h3 className=" font-semibold text-xl mb-2">{title}</h3>
                  <p className="text-primary-muted mb-1">{subtitle}</p>
                  {isClickable ? (
                    type === "email" ? (
                      <a 
                        href={`mailto:${text}`}
                        className="cursor-pointer text-sm font-medium text-primary-action transition-colors hover:text-primary-action-hover hover:underline"
                      >
                        {text}
                      </a>
                    ) : type === "phone" ? (
                      <a 
                        href={`tel:${text.replace(/[^\d+]/g, '')}`}
                        className="cursor-pointer text-sm font-medium text-primary-action transition-colors hover:text-primary-action-hover hover:underline"
                      >
                        {text}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-primary-action">
                        {text}
                      </p>
                    )
                  ) : (
                    <p className="text-sm font-medium text-primary-action">
                      {text}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div
            className="h-fit bg-primary-card px-5 py-8 shadow-xl sm:px-8 sm:py-10"
            data-aos="flip-left"
          >
            <h2 className=" font-bold text-2xl md:text-3xl mb-8">
              {dict?.contact?.send || "Send Us a Message"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6 ">
              <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {dict?.contact?.name || "Full Name"}
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full border border-divider bg-primary-surface px-4 py-3 outline-none transition-colors focus:border-primary-action focus:ring-2 focus:ring-primary-action/20"
                    placeholder={
                      dict?.contact?.namePlaceholder || "Your full name"
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {dict?.contact?.email || "Email Address"}
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full border border-divider bg-primary-surface px-4 py-3 outline-none transition-colors focus:border-primary-action focus:ring-2 focus:ring-primary-action/20"
                    placeholder={
                      dict?.contact?.emailPlaceholder || "your@email.com"
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {dict?.contact?.subject || "Subject"}
                </label>

                <Select
                  name="subject"
                  className="w-full bg-primary-card border border-divider rounded-lg px-4 py-3"
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        dict?.contact?.selectSubject || "Select a subject"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Player Representation">
                      {dict?.contact?.playerRepresentation ||
                        "Player Representation"}
                    </SelectItem>
                    <SelectItem value="Club Recruitment">
                      {dict?.contact?.clubRecruitment || "Club Recruitment"}
                    </SelectItem>
                    <SelectItem value="Request a Player">
                      {dict?.contact?.requestAPlayer || "Request a Player"}
                    </SelectItem>
                    <SelectItem value="Club Partnership">
                      {dict?.contact?.clubPartnership || "Club Partnership"}
                    </SelectItem>
                    <SelectItem value="Talent / Scouting">
                      {dict?.contact?.talentScouting || "Talent / Scouting"}
                    </SelectItem>
                    <SelectItem value="Media & Business">
                      {dict?.contact?.mediaBusiness || "Media & Business"}
                    </SelectItem>
                    <SelectItem value="General Enquiry">
                      {dict?.contact?.generalEnquiry || "General Enquiry"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {dict?.contact?.message || "Message"}
                </label>
                <textarea
                  name="message"
                  required
                  rows={6}
                    className="w-full resize-none border border-divider bg-primary-surface px-4 py-3 outline-none transition-colors focus:border-primary-action focus:ring-2 focus:ring-primary-action/20"
                  placeholder={
                    dict?.contact?.messagePlaceholder ||
                    "Tell us about your goals, experience, and how we can help you..."
                  }
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-primary-action px-8 py-4 font-semibold text-primary-text-inverse transition-colors hover:bg-primary-action-hover"
              >
                {status === "loading" ? (
                  <div className="flex items-center justify-center">
                    <FaSpinner className="animate-spin mr-2" />
                    {dict?.contact?.sending || "Sending..."}
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <i className="fa-solid fa-paper-plane mr-2" />
                    {dict?.contact?.send || "Send Enquiry"}
                  </div>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-5xl px-5 text-center sm:px-10">
          <p className="eyebrow justify-center">Stay connected</p>
          <h2 className="mt-5 font-heading text-3xl font-semibold sm:text-4xl">
            {dict?.contact?.followJourney || "Follow Our Journey"}
          </h2>
          <p className="text-primary-muted text-base md:text-lg mb-12">
            {dict?.contact?.connectSocialMedia ||
              "Connect with us on social media to stay up to date with global football talent and opportunities."}
          </p>
          <div className="grid grid-cols-5 gap-2 sm:gap-4 md:gap-6">
            {[
              {
                name: "Instagram",
                icon: "instagram",
                color: "#E4405F",
                href: "https://www.instagram.com/footballbankinternational?stkn=MXRiZXU1dTBnaWg4cA%3D%3D&utm_source=qr",
                handle: "@FootballBank.soccer",
              },
              {
                name: "YouTube",
                icon: "youtube",
                color: "#FF0000",
                href: "http://www.youtube.com/@footballbankInternational",
                handle: "footballbankinternational",
              },
              {
                name: "Facebook",
                icon: "facebook",
                color: "#1877F2",
                href: "https://www.facebook.com/profile.php?id=61580081775450",
                handle: "footballbankinternational",
              },
              {
                name: "X",
                icon: "FaSquareXTwitter",
                color: "#000000",
                href: "https://x.com/footballbankhq?s=21&t=Ihzjw_SrtnHA4qE0nkgFfg",
                handle: "@footballbankinternational",
              },
              {
                name: "TikTok",
                icon: "tiktok",
                color: "#000000",
                href: "https://www.tiktok.com/@footbalbankinternational?_r=1&_t=ZP-99tgLyghVhm",
                handle: "@footbalbankinternational",
              },
            ].map(({ name, icon, color, handle, href }) => (
              <Link
                href={href}
                target="_blank"
                key={name}
                className="flex flex-col items-center justify-center border border-transparent bg-transparent p-1 transition-colors hover:border-primary-action hover:bg-primary-action/5 sm:border-divider sm:bg-primary-card sm:p-5"
              >
                {icon === "FaSquareXTwitter" ? (
                  <FaSquareXTwitter className="text-2xl sm:mb-4 sm:text-3xl" style={{ color }} />
                ) : (
                  <i
                    className={`fa-brands fa-${icon} text-2xl sm:mb-4 sm:text-3xl`}
                    style={{ color }}
                  />
                )}
                <p className="hidden font-medium sm:block">{name}</p>
                <p className="hidden text-sm text-primary-muted sm:block">{handle}</p>
                
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

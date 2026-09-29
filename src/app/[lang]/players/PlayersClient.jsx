"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { countryList } from "@/lib/variousCountryListFormats";
import "aos/dist/aos.css";
import { getAllPlayers } from "@/actions/publicActions";
import { ArrowUpRight, Play } from "lucide-react";
import Link from "next/link";

export default function PlayersClient({ lang, dict }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [selectedAge, setSelectedAge] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const perPage = 6;

  const getPlayerAge = (player) => {
    if (!player?.dob) return null;
    const birthDate = new Date(player.dob);
    if (Number.isNaN(birthDate.getTime())) return null;
    const diff = new Date() - birthDate;
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };

  const normalizeStatus = (value) => {
    if (!value) return "available";
    const normalized = value.toLowerCase();
    if (normalized.includes("trial") || normalized.includes("trialist"))
      return "trial";
    if (normalized.includes("loan")) return "loan";
    if (
      normalized.includes("unavailable") ||
      normalized.includes("not available")
    )
      return "unavailable";
    if (
      normalized.includes("free") ||
      normalized.includes("available") ||
      normalized.includes("open")
    )
      return "available";
    if (normalized.includes("contract")) return "contracted";
    return normalized;
  };

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const data = await getAllPlayers();
        setPlayers(data);
      } catch (err) {
        console.error("Failed to fetch players:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  const filteredPlayers = players.filter((p) => {
    const fullName = `${p.firstName} ${p.lastName}`;
    const age = getPlayerAge(p);
    const status = normalizeStatus(p.contractStatus || "Available");
    const query = search.trim().toLowerCase();
    const matchesSearch = !query
      ? true
      : [fullName, p.country, p.position, p.email].some((value) =>
          (value || "").toLowerCase().includes(query),
        );
    const matchesCountry = selectedCountry
      ? (p.country || "").toLowerCase() === selectedCountry
      : true;
    const matchesPosition = selectedPosition
      ? (p.position || "").toLowerCase() === selectedPosition
      : true;
    const matchesAge = selectedAge
      ? (() => {
          if (age === null) return false;
          switch (selectedAge) {
            case "u18":
              return age < 18;
            case "18-21":
              return age >= 18 && age <= 21;
            case "22-25":
              return age >= 22 && age <= 25;
            case "26-30":
              return age >= 26 && age <= 30;
            case "31plus":
              return age > 30;
            default:
              return true;
          }
        })()
      : true;
    const matchesStatus = selectedStatus ? status === selectedStatus : true;
    return (
      matchesSearch &&
      matchesCountry &&
      matchesPosition &&
      matchesAge &&
      matchesStatus
    );
  });

  const totalPages = Math.ceil(filteredPlayers.length / perPage);
  const paginatedPlayers = filteredPlayers.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <>
      <main className="relative z-10 min-h-screen w-full bg-primary-surface text-primary-text">
        <div className="mx-auto max-w-7xl bg-white px-5 sm:px-10 lg:px-12">
          {/* Page title */}
          <section className="border-b border-divider py-8 sm:py-10">
            <p className="eyebrow">The player collection</p>
            <h1 className="mt-5 max-w-3xl font-heading text-3xl md:text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              {dict?.players?.title || "Find the profile. See the potential."}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-primary-muted">
              {dict?.players?.subtitle ||
                "Explore player footage and football profiles. Request the full profile through FootballBank International"}
            </p>
          </section>

          {/* Filters */}
          <section className="border-b border-divider/80 py-4 lg:mb-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-md border border-divider bg-white px-2.5 py-2 text-sm text-primary-text outline-none transition-colors focus:border-primary-action focus:ring-2 focus:ring-primary-action/20"
              >
                <option value="">Country</option>
                {countryList.map((country) => (
                  <option key={country} value={country.toLowerCase()}>
                    {country}
                  </option>
                ))}
              </select>

              <select
                value={selectedPosition}
                onChange={(e) => {
                  setSelectedPosition(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-md border border-divider bg-white px-2.5 py-2 text-sm text-primary-text outline-none transition-colors focus:border-primary-action focus:ring-2 focus:ring-primary-action/20"
              >
                <option value="">Position</option>
                <option value="forward">Forward</option>
                <option value="goalkeeper">Goalkeeper</option>
                <option value="defender">Defender</option>
                <option value="midfielder">Midfielder</option>
                <option value="winger">Winger</option>
              </select>

              <select
                value={selectedAge}
                onChange={(e) => {
                  setSelectedAge(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-md border border-divider bg-white px-2.5 py-2 text-sm text-primary-text outline-none transition-colors focus:border-primary-action focus:ring-2 focus:ring-primary-action/20"
              >
                <option value="">Age</option>
                <option value="u18">Under 18</option>
                <option value="18-21">18 - 21</option>
                <option value="22-25">22 - 25</option>
                <option value="26-30">26 - 30</option>
                <option value="31plus">31+</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-md border border-divider bg-white px-2.5 py-2 text-sm text-primary-text outline-none transition-colors focus:border-primary-action focus:ring-2 focus:ring-primary-action/20"
              >
                <option value="">Status</option>
                <option value="available">Available</option>
                <option value="trial">Trial</option>
                <option value="loan">Loan</option>
                <option value="contracted">Contracted</option>
                <option value="unavailable">Unavailable</option>
              </select>

              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search players"
                  className="w-full rounded-md border border-divider bg-white px-3 py-3 pl-11 text-sm text-primary-text outline-none placeholder:text-primary-muted transition-colors focus:border-primary-action focus:ring-2 focus:ring-primary-action/20"
                />
                <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-primary-muted" />
              </div>
            </div>
          </section>

          {/* Main content */}
          <section className="bg-[#f5f7f8] py-5 sm:py-8">
            <div className="w-full">
              {loading ? (
                <div className="text-center text-primary-muted">
                  Loading players...
                </div>
              ) : paginatedPlayers.length === 0 ? (
                <div className="text-center text-primary-muted">
                  No players found.
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                    {paginatedPlayers.map((player) => {
                      const fullName = `${player.firstName} ${player.lastName}`;
                      const playerAge = getPlayerAge(player);
                      return (
                        <article
                          key={player.id}
                          className="group overflow-hidden rounded-xl border border-divider bg-white shadow-sm transition-shadow hover:shadow-md"
                        >
                          <div className="relative">
                            <Link href={`/${lang}/players/${player.id}`}>
                              <Image
                                src={
                                  player.headshotUrl ||
                                  player.imageUrl?.[0] ||
                                  "/logo/logo3.svg"
                                }
                                alt={fullName}
                                width={600}
                                height={800}
                                loading="lazy"
                                className="h-52 w-full rounded-t-xl bg-slate-100 object-cover sm:h-56 lg:h-60"
                              />
                              <span className="absolute top-4 left-4 rounded-sm bg-primary-navy/90 px-2.5 py-1 text-[0.6rem] tracking-[0.18em] text-primary-text-inverse uppercase">
                                {player.position}
                              </span>
                              <span className="absolute right-4 bottom-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary-text shadow-sm transition-transform group-hover:-translate-y-1">
                                <ArrowUpRight className="h-4 w-4" />
                              </span>
                            </Link>
                          </div>

                          <div className="px-5 py-4">
                            <p className="text-[0.6rem] tracking-[0.18em] text-primary-muted uppercase">
                              {player.country}
                            </p>
                            <h3 className="mt-2 font-heading text-xl text-primary-text">
                              {player.firstName} {player.lastName}
                            </h3>

                            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-divider pt-4 text-[0.7rem] text-primary-muted">
                              <span>Age: {playerAge ?? "N/A"}</span>
                              {player.foot && <span>Foot: {player.foot}</span>}
                            </div>
                            <p className="mt-3 text-[0.72rem] text-primary-muted">
                              {player.contractStatus || "Available"}
                            </p>
                            <div className="mt-4 flex items-center justify-between border-t border-divider pt-3">
                              <Link
                                href={`/${lang}/players/${player.id}`}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-action hover:underline"
                              >
                                {dict.homepage.featuredPlayers.viewProfile}{" "}
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </Link>
                              <Link
                                href={`/${lang}/players/${player.id}?tab=media#media`}
                                className="inline-flex items-center gap-1.5 text-sm text-primary-text hover:text-primary-action"
                              >
                                <Play className="size-3.5" /> Watch highlights
                              </Link>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  <Pagination className="my-12 w-full">
                    <PaginationContent className="gap-2">
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          className="border border-divider bg-primary-card text-primary-text hover:border-primary-action hover:bg-primary-action hover:text-primary-text-inverse transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage((prev) => Math.max(prev - 1, 1));
                          }}
                        />
                      </PaginationItem>

                      {pageNumbers.map((num) => (
                        <PaginationItem key={num}>
                          <PaginationLink
                            href="#"
                            isActive={currentPage === num}
                            className={`${
                              currentPage === num
                                ? "bg-primary-action text-primary-text-inverse border-primary-action shadow-lg"
                                : "bg-primary-card border border-divider text-primary-text hover:bg-primary-action hover:text-primary-text-inverse hover:border-primary-action"
                            } transition-all duration-300 font-semibold`}
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(num);
                            }}
                          >
                            {num}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          className="border border-divider bg-primary-card text-primary-text hover:border-primary-action hover:bg-primary-action hover:text-primary-text-inverse transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage((prev) =>
                              Math.min(prev + 1, totalPages),
                            );
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </section>

          {/* Animation styles */}
          <style jsx global>{`
            @keyframes dropdown {
              from {
                opacity: 0;
                transform: translateY(-20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .animate-dropdown {
              animation: dropdown 0.6s ease-out forwards;
            }
          `}</style>
        </div>
      </main>
    </>
  );
}

import Link from "next/link";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import CookieSettings from "@/components/CookieSettings";
import { getClientDictionary } from "@/lib/client-dictionaries";
import { FaSquareXTwitter } from "react-icons/fa6";

export default function Footer({ lang = "en" }) {
  const [dict, setDict] = useState(null);

  useEffect(() => {
    getClientDictionary(lang).then(setDict);
  }, [lang]);

  if (!dict) return null;
  return (
    <footer className="bg-primary-navy max-w-full px-4 lg:px-12 pt-10  pb-8 border-t border-white/10">
      <div className=" mx-auto px-4 max-w-8xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="mb-4 flex flex-col">
              <Link
                href={`/${lang}`}
                className="inline-flex items-center gap-3 text-white"
              >
                <Image
                  src="/logo/logo3.png"
                  alt="FootballBank International"
                  width={48}
                  height={48}
                  className="size-12 object-contain"
                />
                <div className="flex flex-col">
                  <span className="font-heading text-2xl font-semibold tracking-tight">
                    FootballBank
                  </span>
                  <h3 className="text-[8px] md:text-[10px] tracking-[0.15em] text-primary-accent">
                    INTERNATIONAL
                  </h3>
                </div>
              </Link>
              {/* <div>
                <span className="text-primary-muted text-[12px]">
                  {" "}
                  {dict.footer.poweredBy}{" "}
                </span>{" "}
                <span className="text-gray-400 font-bold text-sm inline-block cursor-pointer">
                  Dojoglo&Fam
                </span>
              </div> */}
            </div>
            <p className="text-gray-400 mb-6">{dict.footer.description}</p>

            <div className="flex space-x-4">
              {/** SOCIAL MEDIA LINKS */}
              {/* <Link
                href="https://x.com/footballbankhq?s=21&t=Ihzjw_SrtnHA4qE0nkgFfg"
                className="text-gray-400 hover:text-primary-action transition-colors cursor-pointer"
              >
                <i className="fa-brands fa-twitter text-xl" />
              </Link>
              <Link
                href="https://www.instagram.com/footballbank.soccer"
                className="text-gray-400 hover:text-primary-action transition-colors cursor-pointer"
              >
                <i className="fa-brands fa-instagram text-xl" />
              </Link>
              <Link
                href="https://www.facebook.com/profile.php?id=61580081775450"
                className="text-gray-400 hover:text-primary-action transition-colors cursor-pointer"
              >
                <i className="fa-brands fa-facebook-f text-xl" />
              </Link>
              <Link
                href="http://www.youtube.com/@footballbank.soccer"
                className="text-gray-400 hover:text-primary-action transition-colors cursor-pointer"
              >
                <i className="fa-brands fa-youtube text-xl" />
              </Link>
              <Link
                href="http://www.tiktok.com/@footballbank.soccer"
                className="text-gray-400 hover:text-primary-action transition-colors cursor-pointer"
              >
                <i className="fa-brands fa-tiktok text-xl" />
              </Link> */}

 
                
                
                  <a
                    href="https://x.com/footballbankhq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 bg-white border border-divider text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    <FaSquareXTwitter className="w-5 h-5 text-black" />
                  </a>
                  <a
                    href="https://www.facebook.com/profile.php?id=61580081775450"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 bg-blue-800 text-white rounded-full flex items-center justify-center hover:bg-blue-900 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.instagram.com/footballbankinternational?stkn=MXRiZXU1dTBnaWg4cA%3D%3D&utm_source=qr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 bg-linear-to-br from-purple-500 via-pink-500 to-orange-400 text-white rounded-full flex items-center justify-center hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 transition-all"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                  <a
                    href="http://www.youtube.com/@footballbankInternational"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>

                  <a
                    href="https://www.tiktok.com/@footbalbankinternational?_r=1&_t=ZP-99tgLyghVhm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                  </a>
         
            </div>
          </div>

          <div>
            <h3 className=" font-semibold text-lg mb-4 text-white">
              {dict.footer.quickLinks}
            </h3>
            <ul className="flex flex-col space-y-2">
              {[
                {
                  title: dict.footer.aboutUs || "About",
                  href: `/${lang}/about`,
                },
                { title: dict.footer.players, href: `/${lang}/players` },
                {
                  title: dict.navigation.clubsAndScouts || "Clubs & Partners",
                  href: `/${lang}/clubs-scouts`,
                },
                {
                  title: dict.navigation.representation || "Representation",
                  href: `/${lang}/agent`,
                },
                { title: dict.footer.contact, href: `/${lang}/contact` },
              ].map((link) => (
                <Link
                  data-aos="fade-up"
                  href={link.href}
                  key={link.title}
                  className="text-gray-400 hover:text-primary-action transition-colors cursor-pointer"
                >
                  {link.title}
                </Link>
              ))}
            </ul>
          </div>

          <div>
            <h3 className=" font-semibold text-lg mb-4 text-white">
              {dict.footer.resources}
            </h3>
            <ul className="flex flex-col space-y-2">
              {[
                { title: "Football Blog", href: `/${lang}/blog` },
                {
                  title: dict.footer.submitProfile,
                  href: `/${lang}/submit-profile`,
                },
                { title: "Request a Player", href: `/${lang}/contact` },
                {
                  title: dict.footer.privacyPolicy,
                  href: `/${lang}/privacy-policy`,
                },
                {
                  title: dict.footer.termsOfService,
                  href: `/${lang}/terms-of-service`,
                },
              ].map((link) => (
                <Link
                  data-aos="fade-up"
                  href={link.href}
                  key={link.title}
                  className="text-gray-400 hover:text-primary-action transition-colors cursor-pointer"
                >
                  {link.title}
                </Link>
              ))}
            </ul>
          </div>

          <div>
            <h3 className=" font-semibold text-lg mb-4 text-white">
              {dict.footer.contact}
            </h3>
            <ul className="flex flex-col space-y-2">
              <li className="text-gray-400">
                <a
                  href="mailto:contact@footballbank.soccer"
                  className="hover:text-primary-action transition-colors"
                >
                  contact@footballbank.soccer
                </a>
              </li>
              <li className="text-gray-400">
                <a
                  href="tel:+18623402213"
                  className="hover:text-primary-action transition-colors"
                >
                  +1 (862) 340-2213
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="container mx-auto px-6 text-center mb-6">
          <div className="flex items-center justify-center gap-2 md:gap-12">
            {/* <div className="opacity-80 hover:opacity-100 transition-opacity duration-300 bg-white rounded-lg p-2"> */}
            <img
              src="/partners/crown-fc-nigeria-logo.png"
              alt="Crown FC"
              className="h-6 md:h-10 object-contain"
            />
            {/* </div> */}

            {/* <div className="opacity-80 hover:opacity-100 transition-opacity duration-300 bg-white rounded-lg p-2"> */}
            <img
              src="/partners/Concacaf_logo.svg"
              alt="CONCACAF"
              className="h-6 md:h-10 object-contain"
            />
            {/* </div> */}

            {/* <div className="opacity-80 hover:opacity-100 transition-opacity duration-300 bg-white rounded-lg p-2"> */}
            <img
              src="/partners/fifa.png"
              alt="FIFA"
              className="h-6 md:h-10 object-contain rounded-full"
            />
            {/* </div> */}

            {/* <div className="opacity-80 hover:opacity-100 transition-opacity duration-300 rounded-xl overflow-hidden"> */}
            <img
              src="/partners/future-hero-football-academy.jpg"
              alt="Future Hero Football Academy"
              className="h-6 md:h-10 object-contain rounded-full"
            />
            {/* </div> */}

            {/* <div className="opacity-80 hover:opacity-100 transition-opacity duration-300 bg-white/5 rounded-lg p-2"> */}
            <img
              src="/partners/unknow.jpg"
              alt="Unknown Partner"
              className="h-6 md:h-10 object-contain "
            />
            {/* </div> */}
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-primary-muted text-sm">
            © {new Date().getFullYear()} FootballBank.{" "}
            {dict.footer.allRightsReserved}
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0 text-sm">
            <Link
              href={`/${lang}/privacy-policy`}
              className="text-gray-400 hover:text-primary-action transition-colors cursor-pointer"
            >
              {dict.footer.privacy}
            </Link>
            <Link
              href={`/${lang}/terms-of-service`}
              className="text-gray-400 hover:text-primary-action transition-colors cursor-pointer"
            >
              {dict.footer.terms}
            </Link>
            <CookieSettings
              trigger={
                <span className="text-gray-400 hover:text-primary-action transition-colors cursor-pointer">
                  {dict.footer.cookies}
                </span>
              }
            />
          </div>
        </div>
      </div>
    </footer>
  );
}

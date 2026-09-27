import { useAuth } from "@/context/NewAuthContext";
import { ChevronDownIcon,Home, User, LayoutDashboard, PenSquare, LogOut } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FaUser } from "react-icons/fa";


export function UserHeader({ slug, href, lang = "en" }) {
  const { role, isAuthenticated, user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const isAdmin = role === "admin";
  const isPlayer = role === "player";
  const isEditor = role === "editor";

  if (!isAuthenticated || !user) return null;

  const toggleDropdown = () => setOpen((prev) => !prev);
  const closeDropdown = () => setOpen(false);

  const getDashboardLink = () => {
    if (isAdmin) return `/${lang}/admin`;
    if (isPlayer) return `/${lang}/player-profile`;
    if (isEditor) return `/${lang}/editor`;
    return `/${lang}/profile`;
  };

  const getDashboardLabel = () => {
    if (isAdmin) return "Admin Dashboard";
    if (isPlayer) return "Player Profile";
    if (isEditor) return "Editor Dashboard";
    return "My Profile";
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={toggleDropdown}
        className="focus:outline-none flex items-center gap-2"
        aria-label="User menu"
      >
        <FaUser size={20} className="text-light-primary-muted"/>
        <ChevronDownIcon className="w-4 h-4 text-light-primary-muted" />
      </button>

      {open && (
  <div
    className="origin-top-right absolute -right-5 md:-right-10 mt-3 md:mt-6 w-42 md:w-52 rounded-2xl bg-white shadow-lg ring-1 ring-gray-200 z-50 overflow-hidden"
    onMouseLeave={closeDropdown}
  >
    <div className="py-1.5">
      <Link
        href="/"
        className="group flex items-center gap-3 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
        onClick={closeDropdown}
      >
        <Home className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
        Home
      </Link>

      <Link
        href={getDashboardLink()}
        className="group flex items-center gap-3 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
        onClick={closeDropdown}
      >
        <User className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
        My Profile
      </Link>

      {isAdmin && (
        <Link
          href="/admin"
          className="group flex items-center gap-3 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
          onClick={closeDropdown}
        >
          <LayoutDashboard className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
          Admin Dashboard
        </Link>
      )}

      {/* Admins can also access the Editor Dashboard — shown once, not duplicated */}
      {(isEditor || isAdmin) && (
        <Link
          href="/editor"
          className="group flex items-center gap-3 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
          onClick={closeDropdown}
        >
          <PenSquare className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
          Editor Dashboard
        </Link>
      )}
    </div>

    <div className="border-t border-gray-100 py-1.5">
      <button
        onClick={async () => {
          closeDropdown();
          await logout(true);
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </div>
  </div>
)}
    </div>
  );
}

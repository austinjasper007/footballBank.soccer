"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchBar } from "@/components/admin/SearchBar";
import { PlayerDialog } from "@/components/admin/dialogs/PlayerDialog";
import { DeleteConfirmationModal } from "@/components/admin/dialogs/DeleteConfirmationModal";
import { useToast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import {
  getAllPlayers,
  createPlayer,
  updatePlayer,
  deletePlayer,
} from "@/actions/adminActions";
import { calculateAge } from "@/utils/dateHelper";
import { countries } from "@/data/countries&code";
import LoadingSplash from "@/components/ui/loading-splash";

const ITEMS_PER_PAGE = 5;

// Utility function to truncate text to 100 characters for mobile
const truncateText = (text, maxLength = 100) => {
  if (!text || typeof text !== "string") return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
};

export default function PlayersView({ refreshPulse = 0 }) {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [playerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // useEffect(() => {
  //   const fetchPlayers = async () => {
  //     try {
  //       setIsLoading(true);
  //       const response = await getAllPlayers();
  //       setPlayers(response);
  //     } catch (error) {
  //       console.error("Error fetching players:", error);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };
  //   if(!editingPlayer || !playerDialogOpen) {
  //     fetchPlayers();
  //   }
  // }, [refreshPulse]);

  useEffect(() => {
    if (playerDialogOpen) return;

    const fetchPlayers = async () => {
      try {
        setIsLoading(true);

        const response = await getAllPlayers();

        setPlayers(response);
      } catch (error) {
        console.error("Error fetching players:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Never refresh the list while the player form is open
  
    fetchPlayers();
    
  }, [refreshPulse, playerDialogOpen]);

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const search = searchQuery.toLowerCase();
      const firstName = player.firstName?.toLowerCase() || "";
      const lastName = player.lastName?.toLowerCase() || "";
      const country = player.country?.toLowerCase() || "";
      const position = player.position?.toLowerCase() || "";

      return (
        (firstName.includes(search) ||
          lastName.includes(search) ||
          country.includes(search)) &&
        (countryFilter === "all" ||
          country.includes(countryFilter.toLowerCase())) &&
        (positionFilter === "all" || position === positionFilter.toLowerCase())
      );
    });
  }, [players, searchQuery, countryFilter, positionFilter]);

  const paginatedPlayers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPlayers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPlayers, currentPage]);

  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE);

  const handleDeletePlayer = async (id) => {
    const player = players.find((p) => p.id === id);
    setPlayerToDelete(player);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePlayer = async () => {
    if (!playerToDelete) return;

    try {
      setIsDeleting(true);
      await deletePlayer(playerToDelete.id);
      toast({
        title: "Player Deleted",
        description: "The player has been removed successfully.",
      });
      const updated = await getAllPlayers();
      setPlayers(updated);
      setDeleteDialogOpen(false);
      setPlayerToDelete(null);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete player.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditPlayer = (player) => {
    setEditingPlayer(player);
    setPlayerDialogOpen(true);
  };

  const handleAddOrUpdatePlayer = async (data) => {
    const savedPlayer = data.id
      ? await updatePlayer(data.id, data)
      : await createPlayer(data);
    const updated = await getAllPlayers();
    setPlayers(updated);

    setPlayerDialogOpen(false);
    setEditingPlayer(null);

    toast({
      title: "Success",
      description: savedPlayer?.id ? "Player saved successfully." : "Player saved, but the response was incomplete.",
    });
  };

  if (isLoading) {
    return <LoadingSplash message="Loading players..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search players..."
            className="w-full sm:w-72"
          />
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Positions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              <SelectItem value="goalkeeper">Goalkeeper</SelectItem>
              <SelectItem value="defender">Defender</SelectItem>
              <SelectItem value="midfielder">Midfielder</SelectItem>
              <SelectItem value="forward">Forward</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setPlayerDialogOpen(true)} variant="action">
          <Plus className="h-4 w-4 mr-2" />
          Add Player
        </Button>
      </div>

      <Card className="overflow-hidden border border-divider bg-primary-card shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary-bg-alt">
                <tr>
                  <th className="p-4 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-primary-muted">
                    Player
                  </th>
                  <th className="p-4 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-primary-muted">
                    Position
                  </th>
                  <th className="p-4 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-primary-muted">
                    Email
                  </th>
                  <th className="p-4 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-primary-muted">
                    Country
                  </th>
                  <th className="p-4 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-primary-muted">
                    Status
                  </th>
                  <th className="p-4 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-primary-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedPlayers.map((player) => {
                  const fullName = `${player.firstName} ${player.lastName}`;
                  return (
                    <tr
                      key={player.id}
                      className="border-t border-divider/70 transition-colors hover:bg-primary-action/5"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Image
                            src={
                              player.headshotUrl ||
                              player.imageUrl?.[0] ||
                              "/logo/logo3.svg"
                            }
                            alt={`${player.firstName} ${player.lastName}`}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <p
                              className="font-medium"
                              title={`${player.firstName} ${player.lastName}`}
                            >
                              <span className="hidden sm:inline">
                                {player.firstName} {player.lastName}
                              </span>
                              <span className="sm:hidden">
                                {truncateText(
                                  `${player.firstName} ${player.lastName}`,
                                  100,
                                )}
                              </span>
                            </p>
                            <p className="text-sm text-primary-muted">
                              Age {calculateAge(player.dob)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">{player.position}</td>
                      <td className="p-4" title={player.email}>
                        <span className="hidden sm:inline">{player.email}</span>
                        <span className="sm:hidden">
                          {truncateText(player.email, 100)}
                        </span>
                      </td>
                      <td className="p-4">{player.country}</td>
                      <td className="p-4">
                        <Badge
                          variant={player.featured ? "default" : "secondary"}
                          className={
                            player.featured
                              ? "bg-green-500 hover:bg-green-600"
                              : ""
                          }
                        >
                          {player.featured ? "Featured" : "Normal"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {/* Mobile Layout */}
                        <div className="block sm:hidden">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPlayer(player)}
                              title={`Edit ${fullName}`}
                              className="flex-1 hover:border-primary-action hover:bg-primary-action/10 hover:text-primary-action"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              <span className="text-xs">Edit</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePlayer(player.id)}
                              title={`Delete ${fullName}`}
                              className="flex-1 hover:border-accent-red hover:bg-accent-red/10 hover:text-accent-red"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              <span className="text-xs">Delete</span>
                            </Button>
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden sm:flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPlayer(player)}
                            title={`Edit ${fullName}`}
                            className="hover:border-primary-action hover:bg-primary-action/10 hover:text-primary-action"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePlayer(player.id)}
                            title={`Delete ${fullName}`}
                            className="hover:border-accent-red hover:bg-accent-red/10 hover:text-accent-red"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={`page-${i + 1}`}>
                <PaginationLink
                  href="#"
                  isActive={i + 1 === currentPage}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <PlayerDialog
        open={playerDialogOpen}
        onOpenChange={(open) => {
          setPlayerDialogOpen(open);
          if (!open) setEditingPlayer(null);
        }}
        player={editingPlayer || undefined}
        onSave={handleAddOrUpdatePlayer}
      />

      <DeleteConfirmationModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDeletePlayer}
        title="Delete Player"
        description="This will permanently remove the player from the system."
        itemName={
          playerToDelete
            ? `${playerToDelete.firstName} ${playerToDelete.lastName}`
            : ""
        }
        isLoading={isDeleting}
      />
    </div>
  );
}

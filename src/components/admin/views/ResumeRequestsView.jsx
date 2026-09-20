"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clock, Eye, Trash2, X } from "lucide-react";
import {
  getAllResumeRequests,
  approveResumeRequest,
  rejectResumeRequest,
  deleteResumeRequest,
} from "@/actions/resumeRequestActions";
import { useToast } from "@/hooks/use-toast";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import LoadingSplash from "@/components/ui/loading-splash";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ResumeRequestsView({ refreshPulse = 0 }) {
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [activeStatus, setActiveStatus] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  useBodyScrollLock(selected !== null);

  const refresh = async () => setRequests(await getAllResumeRequests());
  useEffect(() => {
    if(selected) return;
    refresh()
      .catch(() =>
        toast({
          title: "Error",
          description: "Could not load resume requests.",
          variant: "destructive",
        }),
      )
      .finally(() => setLoading(false));
  }, [refreshPulse, toast, selected]);

  const filtered = useMemo(
    () =>
      requests.filter((request) => {
        const searchable =
          `${request.requester?.firstName} ${request.requester?.lastName} ${request.requester?.email} ${request.player?.firstName} ${request.player?.lastName}`.toLowerCase();
        return (
          request.status === activeStatus &&
          searchable.includes(search.toLowerCase())
        );
      }),
    [requests, activeStatus, search],
  );

  const decide = async (request, decision) => {
    try {
      if (decision === "approve") await approveResumeRequest(request.id);
      else await rejectResumeRequest(request.id);
      toast({
        title: decision === "approve" ? "Request approved" : "Request rejected",
        description: "The requester has been notified by email.",
      });
      await refresh();
      setSelected(null);
    } catch (error) {
      toast({
        title: "Action failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const remove = async (request) => {
    try {
      await deleteResumeRequest(request.id);
      await refresh();
      toast({
        title: "Request deleted",
        description: "The resume request was removed.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) return <LoadingSplash message="Loading resume requests..." />;
  const counts = Object.fromEntries(
    ["PENDING", "APPROVED", "REJECTED"].map((status) => [
      status,
      requests.filter((request) => request.status === status).length,
    ]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search requester or player..."
          className="h-10 w-full rounded-md border border-divider bg-primary-card px-3 text-sm outline-none focus:border-primary-action md:w-80"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {["PENDING", "APPROVED", "REJECTED"].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setActiveStatus(status)}
            className={`cursor-pointer inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${activeStatus === status ? "border-primary-action bg-primary-action text-primary-text-inverse" : "border-divider bg-primary-card"}`}
          >
            {status === "PENDING" ? (
              <Clock className="size-4" />
            ) : status === "APPROVED" ? (
              <Check className="size-4" />
            ) : (
              <X className="size-4" />
            )}
            {status.charAt(0) + status.slice(1).toLowerCase()} ({counts[status]}
            )
          </button>
        ))}
      </div>
      <div className="overflow-x-auto border border-divider bg-primary-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-divider bg-primary-bg text-xs uppercase tracking-wide text-primary-muted">
            <tr>
              <th className="px-4 py-3">Requester</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Player requested</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((request) => (
              <tr
                key={request.id}
                className="border-b border-divider last:border-0"
              >
                <td className="px-4 py-4 font-medium">
                  {request.requester?.firstName} {request.requester?.lastName}
                </td>
                <td className="px-4 py-4">{request.requester?.email}</td>
                <td className="px-4 py-4">
                  {request.player?.firstName} {request.player?.lastName}
                  <span className="block text-xs text-primary-muted">
                    {request.player?.position}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <Badge
                    variant={
                      request.status === "REJECTED"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {request.status}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelected(request)}
                    >
                      <Eye className="size-4" />
                    </Button>
                    {request.status === "PENDING" && (
                      <>
                        <Button
                          variant="action"
                          size="sm"
                          onClick={() => decide(request, "approve")}
                        >
                          <Check className="size-4" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => decide(request, "reject")}
                        >
                          <X className="size-4" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => remove(request)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-primary-muted">
            No resume requests found.
          </p>
        )}
      </div>
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary-navy/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg border border-divider bg-primary-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading text-2xl font-semibold">
                  Request details
                </h3>
                <p className="mt-1 text-sm text-primary-muted">
                  {selected.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close details"
              >
                <X className="size-5" />
              </button>
            </div>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-primary-muted">Requester</dt>
                <dd className="font-semibold">
                  {selected.requester?.firstName} {selected.requester?.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-primary-muted">Email</dt>
                <dd className="break-all font-semibold">
                  {selected.requester?.email}
                </dd>
              </div>
              <div>
                <dt className="text-primary-muted">Phone</dt>
                <dd className="font-semibold">
                  {selected.requester?.phone || "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-primary-muted">Account role</dt>
                <dd>{selected.requester?.role || "user"}</dd>
              </div>
              <div>
                <dt className="text-primary-muted">Verified</dt>
                <dd>{selected.requester?.isVerified ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-primary-muted">Player</dt>
                <dd>
                  {selected.player?.firstName} {selected.player?.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-primary-muted">Position</dt>
                <dd>{selected.player?.position || "-"}</dd>
              </div>
            </dl>
            <div className="mt-5 border-t border-divider pt-4 text-sm">
              <p className="text-primary-muted">Request reason</p>
              <p className="mt-1 whitespace-pre-wrap">{selected.reason}</p>
            </div>
            {selected.requester?.address && (
              <div className="mt-5 border-t border-divider pt-4 text-sm">
                <p className="text-primary-muted">Registered address</p>
                <p>
                  {selected.requester.address.street},{" "}
                  {selected.requester.address.city},{" "}
                  {selected.requester.address.state}{" "}
                  {selected.requester.address.postalCode},{" "}
                  {selected.requester.address.country}
                </p>
              </div>
            )}
            {selected.status === "PENDING" && (
              <div className="mt-6 flex justify-end gap-2 border-t border-divider pt-4">
                <Button
                  variant="destructive"
                  onClick={() => decide(selected, "reject")}
                >
                  Reject
                </Button>
                <Button
                  variant="action"
                  onClick={() => decide(selected, "approve")}
                >
                  Approve
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

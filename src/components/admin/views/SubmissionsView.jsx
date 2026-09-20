"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X, Clock, Eye, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/admin/SearchBar";
import { SubmissionDetailDialog } from "@/components/admin/dialogs/SubmissionDetailDialog";
import { DeleteConfirmationModal } from "@/components/admin/dialogs/DeleteConfirmationModal";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  approveSubmission,
  getAllSubmissions,
  getSubmissionsById,
  rejectSubmission,
  deleteSubmission,
} from "@/actions/adminActions";
import { calculateAge, formatFullDate } from "@/utils/dateHelper";
import LoadingSplash from "@/components/ui/loading-splash";

export default function SubmissionsView({ refreshPulse = 0 }) {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    if (detailDialogOpen) return;
    if (selectedSubmission) return;
    const fetchSubmissions = async () => {
      try {
        setIsLoading(true);
        const response = await getAllSubmissions();
        setSubmissions(response);
      } catch (error) {
        console.error("Error fetching submissions:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubmissions();
  }, [refreshPulse, detailDialogOpen, selectedSubmission]);

  const filtered = useMemo(() => {
    const list = Array.isArray(submissions) ? submissions : [];
    return list.filter((s) =>
      [s.firstName, s.lastName, s.country, s.position, s.email].some((field) =>
        field?.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    );
  }, [submissions, searchQuery]);

  const handleApprove = useCallback(
    async (id) => {
      try {
        const data = await approveSubmission(id);
        if (!data) throw new Error("Submission not found or approval failed");

        toast({ title: "Approved", description: "Submission approved." });

        const updated = await getAllSubmissions();
        setSubmissions(updated);
      } catch (error) {
        toast({
          title: "Error",
          description: "An error occurred while approving the submission.",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const handleReject = useCallback(
    async (id) => {
      try {
        const data = await rejectSubmission(id, "Incomplete Submission");

        toast({ title: "Rejected", description: data.rejectionReason });

        const updated = await getAllSubmissions();
        setSubmissions(updated);
      } catch (error) {
        toast({
          title: "Error",
          description: "An error occurred while rejecting the submission.",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const handleDeleteSubmission = useCallback(
    async (id) => {
      const submission = submissions.find((s) => s.id === id);
      setSubmissionToDelete(submission);
      setDeleteDialogOpen(true);
    },
    [submissions],
  );

  const confirmDeleteSubmission = useCallback(async () => {
    if (!submissionToDelete) return;

    try {
      setIsDeleting(true);
      await deleteSubmission(submissionToDelete.id);
      toast({
        title: "Submission Deleted",
        description: "The submission has been removed successfully.",
      });
      const updated = await getAllSubmissions();
      setSubmissions(updated);
      setDeleteDialogOpen(false);
      setSubmissionToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete submission.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }, [submissionToDelete, toast]);

  const handleViewDetails = async (id) => {
    const data = await getSubmissionsById(id);
    setSelectedSubmission(data);
    setDetailDialogOpen(true);
  };

  const pending = filtered.filter((s) => s.status === "PENDING");
  const approved = filtered.filter((s) => s.status === "APPROVED");
  const rejected = filtered.filter((s) => s.status === "REJECTED");

  if (isLoading) {
    return <LoadingSplash message="Loading submissions..." />;
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <Check className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const renderTable = (data) => {
    if (data.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No submissions found</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((submission) => (
              <TableRow key={submission.id}>
                <TableCell className="font-medium">
                  {submission.firstName} {submission.lastName}
                </TableCell>
                <TableCell>{submission.email}</TableCell>
                <TableCell>{submission.country}</TableCell>
                <TableCell>{submission.position}</TableCell>
                <TableCell>{calculateAge(submission.dob)}</TableCell>
                <TableCell>{getStatusBadge(submission.status)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatFullDate(submission.submittedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(submission.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {submission.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-500 hover:bg-green-600"
                          onClick={() => handleApprove(submission.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(submission.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteSubmission(submission.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {submission.status !== "PENDING" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteSubmission(submission.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search submissions..."
          className="w-96"
        />
      </div>

      <Card className="border-0 shadow-sm">
        {/* <CardHeader>
          <CardTitle>All Submissions</CardTitle>
        </CardHeader> */}
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">
                <Clock className="h-4 w-4 mr-2" />
                Pending ({pending.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                <Check className="h-4 w-4 mr-2" />
                Approved ({approved.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                <X className="h-4 w-4 mr-2" />
                Rejected ({rejected.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {renderTable(pending)}
            </TabsContent>

            <TabsContent value="approved" className="mt-4">
              {renderTable(approved)}
            </TabsContent>

            <TabsContent value="rejected" className="mt-4">
              {renderTable(rejected)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <SubmissionDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        submission={selectedSubmission}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <DeleteConfirmationModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDeleteSubmission}
        title="Delete Submission"
        description="This will permanently remove the submission from the system."
        itemName={
          submissionToDelete
            ? `${submissionToDelete.firstName} ${submissionToDelete.lastName}`
            : ""
        }
        isLoading={isDeleting}
      />
    </div>
  );
}

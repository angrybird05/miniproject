import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/utils/api";
import { useAuth } from "@/utils/auth";

const PAGE_SIZE = 4;

export default function RecordsPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    setError("");
    api
      .attendanceRecords(token, { q: query || undefined, date: date || undefined, page, pageSize: PAGE_SIZE })
      .then((result) => {
        if (!mounted) return;
        setRows(result.data || []);
        setTotal(result.total || 0);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || "Failed to load attendance records");
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [token, query, date, page]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentRows = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Records"
        description="Search and filter historical attendance entries across the institution."
      />

      <Card className="border-0">
        <CardContent className="space-y-6 p-6">
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Search by name or student ID"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
            <Input
              type="date"
              className="md:max-w-xs"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-slate-500">
                    Loading records...
                  </TableCell>
                </TableRow>
              ) : currentRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-slate-500">
                    No records found.
                  </TableCell>
                </TableRow>
              ) : currentRows.map((record) => (
                <TableRow key={record.id ?? `${record.studentId}-${record.date}-${record.time}`}>
                  <TableCell>{record.name}</TableCell>
                  <TableCell>{record.studentId}</TableCell>
                  <TableCell>{record.classCode || "—"}</TableCell>
                  <TableCell>{record.date}</TableCell>
                  <TableCell>{record.time}</TableCell>
                  <TableCell>
                    <Badge
                      tone={
                        record.status === "Present"
                          ? "emerald"
                          : record.status === "Late"
                            ? "amber"
                            : "rose"
                      }
                    >
                      {record.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {currentRows.length} of {total} records
            </p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                Previous
              </Button>
              <Button variant="outline" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

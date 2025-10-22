"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Database, MessageSquare } from "lucide-react";

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  total_savings: number;
  upload_id: string | null;
  record_count: number | null;
}

interface StorageStats {
  totalSessions: number;
  totalRecords: number;
  totalSavings: number;
}

export default function ChatsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadChats();
  }, []);

  async function loadChats() {
    try {
      const res = await fetch("/api/chats/list");
      if (!res.ok) throw new Error("Failed to load chats");
      const data = await res.json();
      setSessions(data.sessions || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chats");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  }

  function toggleSelectAll() {
    if (selected.size === sessions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sessions.map((s) => s.id)));
    }
  }

  async function handleDelete() {
    if (selected.size === 0) return;

    const count = selected.size;
    if (
      !confirm(
        `Delete ${count} ${
          count === 1 ? "chat" : "chats"
        }? This will remove all messages and data. This cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch("/api/chats/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIds: Array.from(selected) }),
      });

      if (!res.ok) throw new Error("Failed to delete chats");

      setSessions(sessions.filter((s) => !selected.has(s.id)));
      setSelected(new Set());
      await loadChats();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete chats");
    } finally {
      setDeleting(false);
    }
  }

  function openChat(sessionId: string) {
    router.push(`/?session=${sessionId}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">Loading chats...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Chat History
          </h1>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="w-full sm:w-auto"
          >
            ← Back to Chat
          </Button>
        </div>

        {/* Storage Stats */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-8 h-8 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">
                      {stats.totalSessions}
                    </div>
                    <div className="text-sm text-gray-600">Total Chats</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Database className="w-8 h-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">
                      {stats.totalRecords.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Work Orders</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center text-2xl">
                    💰
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      ${stats.totalSavings.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Total Savings</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Actions Bar */}
        {sessions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 sm:p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  selected.size === sessions.length && sessions.length > 0
                }
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-gray-700">
                {selected.size > 0 ? `${selected.size} selected` : "Select all"}
              </span>
            </div>

            {selected.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? "Deleting..." : `Delete ${selected.size}`}
              </Button>
            )}
          </div>
        )}

        {/* Chat List */}
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No chat history yet</p>
              <p className="text-sm text-gray-400">
                Upload a CSV file to start your first analysis
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">All Chats</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-12 px-4 py-3"></th>
                      <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-700">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 hidden sm:table-cell">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 hidden md:table-cell">
                        Records
                      </th>
                      <th className="px-4 py-3 text-left text-xs sm:text-sm font-medium text-gray-700 hidden lg:table-cell">
                        Savings
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sessions.map((session) => (
                      <tr
                        key={session.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => openChat(session.id)}
                      >
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selected.has(session.id)}
                            onCheckedChange={() => toggleSelect(session.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {session.title}
                          </div>
                          <div className="text-xs text-gray-500 sm:hidden">
                            {new Date(session.updated_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                          {new Date(session.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                          {session.record_count?.toLocaleString() || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                          {session.total_savings > 0
                            ? `$${session.total_savings.toLocaleString()}`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

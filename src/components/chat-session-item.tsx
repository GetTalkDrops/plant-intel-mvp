"use client";

import { useState } from "react";
import { MoreHorizontal, Edit2, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ChatSession = {
  id: number;
  user_id: string;
  title: string;
  upload_id: number | null;
  total_savings: number;
  created_at: string;
  updated_at: string;
};

interface ChatSessionItemProps {
  session: ChatSession;
  onClick: () => void;
  onUpdate: () => void; // Callback to refresh the session list
  isActive?: boolean; // Whether this is the currently active chat
}

export function ChatSessionItem({
  session,
  onClick,
  onUpdate,
  isActive = false,
}: ChatSessionItemProps) {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(session.title);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRename = async () => {
    if (!newTitle.trim() || newTitle === session.title) {
      setIsRenameDialogOpen(false);
      return;
    }

    setIsRenaming(true);
    try {
      const response = await fetch("/api/chats/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          title: newTitle.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename chat");
      }

      setIsRenameDialogOpen(false);
      onUpdate(); // Refresh the session list
    } catch (error) {
      console.error("Error renaming chat:", error);
      alert("Failed to rename chat. Please try again.");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${session.title}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch("/api/chats/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionIds: [session.id],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete chat");
      }

      onUpdate(); // Refresh the session list
    } catch (error) {
      console.error("Error deleting chat:", error);
      alert("Failed to delete chat. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        className={`group relative flex items-center gap-2 py-1 px-2 rounded cursor-pointer ${
          isActive ? "bg-blue-50 text-blue-600" : "hover:bg-blue-50"
        }`}
      >
        <div
          className={`flex-1 min-w-0 text-sm ${
            isActive
              ? "text-blue-600 font-medium"
              : "text-gray-700 group-hover:text-blue-600"
          }`}
          onClick={onClick}
        >
          <div className="truncate">
            {session.title} -{" "}
            {new Date(session.updated_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4 text-gray-600" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setNewTitle(session.title);
                setIsRenameDialogOpen(true);
              }}
              disabled={isDeleting}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isDeleting}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Enter a new name for this chat session.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Chat name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRename();
              }
            }}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameDialogOpen(false)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={isRenaming || !newTitle.trim()}
            >
              {isRenaming ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { File, Folder, Trash2, Pencil, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileExplorerDropdownMenuProps {
  onNewFile: () => void;
  onNewFolder: () => void;
  onDelete: () => void;
  onRename: () => void;
  isFolder: boolean;
  disableRename?: boolean;
  disableDelete?: boolean;
}

export function FileExplorerDropdownMenu({
  onNewFile,
  onNewFolder,
  onDelete,
  onRename,
  isFolder,
  disableDelete = false,
  disableRename = false,
}: FileExplorerDropdownMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-6 w-6 p-0 opacity-0 hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        {isFolder && (
          <>
            <DropdownMenuItem onSelect={onNewFile}>
              <File className="mr-2 h-4 w-4" />
              New File
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onNewFolder}>
              <Folder className="mr-2 h-4 w-4" />
              New Folder
            </DropdownMenuItem>
          </>
        )}
        {!disableRename && (
          <DropdownMenuItem onSelect={onRename}>
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
        )}
        {!disableDelete && (
          <DropdownMenuItem onSelect={onDelete} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import * as React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { File, Folder, Trash2, Pencil } from "lucide-react";

interface FileExplorerContextMenuProps {
  children: React.ReactNode;
  onNewFile: () => void;
  onNewFolder: () => void;
  onDelete: () => void;
  onRename: () => void;
  isFolder: boolean;
}

export function FileExplorerContextMenu({
  children,
  onNewFile,
  onNewFolder,
  onDelete,
  onRename,
  isFolder,
}: FileExplorerContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {isFolder && (
          <>
            <ContextMenuItem onSelect={onNewFile}>
              <File className="mr-2 h-4 w-4" />
              New File
            </ContextMenuItem>
            <ContextMenuItem onSelect={onNewFolder}>
              <Folder className="mr-2 h-4 w-4" />
              New Folder
            </ContextMenuItem>
          </>
        )}
        <ContextMenuItem onClick={onRename}>
          <Pencil className="mr-2 h-4 w-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onSelect={onDelete} className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

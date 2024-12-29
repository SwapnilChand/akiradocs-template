"use client";

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MenuToggle } from "@/components/ui/MenuToggle";

interface TitleBarProps {
  filePath: string;
  onSave: () => void;
  isSaving?: boolean;
  onDelete: () => void;
  onRename: () => void;
  onExport: () => void;
}

export function TitleBar({
  filePath,
  onSave,
  isSaving = false,
  onDelete,
  onRename,
  onExport,
}: TitleBarProps) {
  const fileName =
    filePath
      ?.split("/")
      .pop()
      ?.replace(".json", "")
      ?.split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || "Untitled";

  return (
    <div className="flex justify-between items-center mb-8 mr-8">
      <div>{fileName}</div>
      <div className="flex items-center space-x-4">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          <Save />
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <ThemeToggle />
        <MenuToggle
          onDelete={onDelete}
          onRename={onRename}
          onExport={onExport}
        />
      </div>
    </div>
  );
}

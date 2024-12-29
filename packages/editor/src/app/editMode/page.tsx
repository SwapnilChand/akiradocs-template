"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const FileExplorer = dynamic(() => import("@/components/file-explorer"), {
  ssr: false,
});
const Editor = dynamic(() => import("@/components/editor"), { ssr: false });
import { FileNode } from "@/components/file-explorer";

interface FileExplorerRef {
  deleteItem: (
    nodeId: string,
    nodeName: string,
    nodeType: "file" | "folder"
  ) => void;
  handleRename: (nodeId: string, nodeName: string) => void;
}

export default function EditModePage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<FileNode | null>(null);
  const fileExplorerRef = useRef<FileExplorerRef>(null);

  const handleDelete = () => {
    if (selectedNode && fileExplorerRef.current) {
      fileExplorerRef.current.deleteItem(
        selectedNode.id,
        selectedNode.name,
        selectedNode.type
      );
      setSelectedFile(null);
      setSelectedNode(null);
    }
  };

  const handleRename = () => {
    if (selectedNode && fileExplorerRef.current) {
      fileExplorerRef.current?.handleRename(selectedNode.id, selectedNode.name);
      setSelectedFile(null);
      setSelectedNode(null);
    }
  };

  const handleFileSelect = (filePath: string, node: FileNode) => {
    setSelectedFile(filePath);
    setSelectedNode(node);
  };

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
        <div className="h-full custom-scrollbar overflow-auto">
          <FileExplorer
            ref={fileExplorerRef}
            onFileSelect={(filePath, node) => handleFileSelect(filePath, node)}
          />
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={80}>
        <div className="h-full custom-scrollbar overflow-auto">
          {selectedFile ? (
            <Editor
              filePath={selectedFile}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Select a file to edit
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

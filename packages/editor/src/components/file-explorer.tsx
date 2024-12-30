"use client";

import {
  useState,
  KeyboardEvent,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { File, Check, X, ChevronRight, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchAllContent } from "@/lib/getContents";
import { FileExplorerContextMenu } from "@/components/context-menu";
import { FileExplorerDropdownMenu } from "@/components/dropdown-menu";
import { LanguageSelector } from "./language-selector";
import { InsertionPoint } from "./insertion-point";
import * as React from "react";

export type FileNode = {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
};

interface MetaItem {
  title: string;
  path?: string;
  items?: Record<string, MetaItem>;
}

interface FileExplorerProps {
  onFileSelect: (path: string, node: FileNode) => void;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}
interface RootMeta {
  defaultRoute?: string;
  [key: string]: MetaItem | string | undefined;
}

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:3001";

const getNodeFullPath = (
  tree: FileNode[],
  nodeId: string,
  parentPath: string = ""
): string | null => {
  for (const node of tree) {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    if (node.id === nodeId) {
      return currentPath;
    }
    if (node.children) {
      const foundPath = getNodeFullPath(node.children, nodeId, currentPath);
      if (foundPath) return foundPath;
    }
  }
  return null;
};

const FileExplorer = forwardRef(
  (
    { selectedLanguage, onFileSelect, onLanguageChange }: FileExplorerProps,
    ref
  ) => {
    const [fileTree, setFileTree] = useState<FileNode[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
      new Set(["1", "4"])
    );
    const [newItemParent, setNewItemParent] = useState<string | null>(null);
    const [newItemType, setNewItemType] = useState<"file" | "folder" | null>(
      null
    );
    const [newItemName, setNewItemName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const [renamingNode, setRenamingNode] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const renameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      const content = fetchAllContent();
      const transformedTree = transformContentToFileTree(content);
      setFileTree(transformedTree);
    }, [selectedLanguage]);

    const toggleFolder = (folderId: string) => {
      setExpandedFolders((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(folderId)) {
          newSet.delete(folderId);
        } else {
          newSet.add(folderId);
        }
        return newSet;
      });
    };

    const startRename = (nodeId: string, currentName: string) => {
      setRenamingNode(nodeId);
      setNewName(
        currentName.endsWith(".json") ? currentName.slice(0, -5) : currentName
      );
      setTimeout(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      }, 0);
    };

    const handleRename = async (nodeId: string) => {
      if (!newName.trim()) return;

      const node = findNodeById(fileTree, nodeId);
      if (!node) return;

      // Check if the new name is one of the restricted names
      const restrictedNames = [
        "de",
        "en",
        "es",
        "fr",
        "api",
        "articles",
        "docs",
      ];
      if (restrictedNames.includes(newName.trim())) {
        cancelRename();
        return;
      }
      const oldPath = getNodeFullPath(fileTree, nodeId);
      if (!oldPath) return;

      const parentPath = oldPath.substring(0, oldPath.lastIndexOf("/"));
      const newFileName = node.type === "file" ? `${newName}.json` : newName;
      const newPath = parentPath ? `${parentPath}/${newFileName}` : newFileName;

      try {
        const response = await fetch(`${API_URL}/api/files`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            oldPath,
            newPath,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to rename item");
        }

        // Update file tree
        const updatedTree = renameNodeInTree(fileTree, nodeId, newFileName);
        setFileTree(updatedTree);

        // If it's a file, update metadata
        if (node.type === "file") {
          await updateMetadataForRename(parentPath, node.name, newFileName);
        }

        cancelRename();
      } catch (error) {
        console.error("Error renaming item:", error);
      }
    };

    const cancelRename = () => {
      setRenamingNode(null);
      setNewName("");
    };

    const handleFileClick = (node: FileNode) => {
      const fullPath = getNodeFullPath(fileTree, node.id);
      if (!fullPath) {
        console.error("Could not find full path for node");
        return;
      }
      onFileSelect(fullPath, node);
    };

    const startNewItem = (parentId: string, type: "file" | "folder") => {
      console.log("Starting new item:", { parentId, type }); // Add debug logging
      setNewItemParent(parentId);
      setNewItemType(type);
      setNewItemName("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    };

    const cancelNewItem = () => {
      setNewItemParent(null);
      setNewItemType(null);
      setNewItemName("");
    };

    const addNewItem = async () => {
      if (!newItemParent || !newItemType || !newItemName) return;

      const newItem: FileNode = {
        id: Date.now().toString(),
        name: newItemName,
        type: newItemType,
        children: newItemType === "folder" ? [] : undefined,
      };

      const parentPath = getNodeFullPath(fileTree, newItemParent);
      if (!parentPath) {
        console.error("Could not find parent path");
        return;
      }

      const fullPath = `${parentPath}/${newItemName}`;

      try {
        console.log("Creating new item:", {
          parentPath,
          fullPath,
          itemType: newItemType,
          itemName: newItemName,
        });

        if (newItemType === "file") {
          // Get the language and section from the path
          const pathParts = parentPath.split("/");
          const language = pathParts[0]; // e.g. 'en'
          const section = pathParts[1]; // e.g. 'docs'

          // Create default content for the new file
          const fileId = newItemName.replace(".json", "");
          const defaultContent = {
            id: fileId,
            title: fileId
              .split("_")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" "),
            description: "",
            author: "Anonymous",
            date: new Date().toISOString().split("T")[0],
            blocks: [],
          };

          const fileResponse = await fetch(`${API_URL}/api/files`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              path: fullPath,
              content: defaultContent,
              isDirectory: false,
            }),
          });

          if (!fileResponse.ok) {
            const errorText = await fileResponse.text();
            console.error("File creation failed:", errorText);
            throw new Error(`Failed to create file: ${errorText}`);
          }

          await updateMetadata(
            language,
            section,
            pathParts,
            fileId,
            defaultContent
          );
        } else if (newItemType === "folder") {
          const folderResponse = await fetch(`${API_URL}/api/files`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              path: fullPath,
              isDirectory: true,
            }),
          });

          if (!folderResponse.ok) {
            const errorText = await folderResponse.text();
            console.error("Folder creation failed:", errorText);
            throw new Error(`Failed to create folder: ${errorText}`);
          }
        }

        const updatedTree = addItemToTree(fileTree, newItemParent, newItem);
        setFileTree(updatedTree);

        if (newItemType === "folder") {
          setExpandedFolders((prev) => new Set(prev).add(newItem.id));
        }

        cancelNewItem();
      } catch (error) {
        console.error("addNewItem: Error creating item:", error);
      }
    };

    const updateMetadata = async (
      language: string,
      section: string,
      pathParts: string[],
      fileId: string,
      defaultContent: any
    ) => {
      try {
        const rootMetaPath = `${language}/${section}/_meta.json`;
        const rootMetaResponse = await fetch(
          `${API_URL}/api/files?path=${encodeURIComponent(rootMetaPath)}`
        );

        if (rootMetaResponse.ok) {
          const rootMeta = (await rootMetaResponse.json()) as RootMeta;

          // Navigate through the path to find the right section
          let currentSection = rootMeta;
          for (let i = 2; i < pathParts.length; i++) {
            const part = pathParts[i];

            // Convert path to camelCase for section key
            const sectionKey = part
              .replace(/-/g, " ")
              .split(" ")
              .map((word, index) => {
                const capitalized =
                  word.charAt(0).toUpperCase() + word.slice(1);
                return index === 0 ? capitalized.toLowerCase() : capitalized;
              })
              .join("");

            // Create section if it doesn't exist
            if (!currentSection[sectionKey]) {
              const newSection: MetaItem = {
                title: part
                  .split("-")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" "),
                items: {},
              };
              currentSection[sectionKey] = newSection;
            }

            // Move to items object for next iteration
            const section = currentSection[sectionKey] as MetaItem;
            const items = section?.items;
            if (!items) {
              currentSection[sectionKey] = {
                ...section,
                items: {},
              };
              currentSection = currentSection[sectionKey].items!;
            } else {
              currentSection = items;
            }
          }

          // Add the new file entry
          currentSection[fileId] = {
            title: defaultContent.title,
            path: `/${section}/${pathParts.slice(2).join("/")}${
              pathParts.slice(2).length > 0 ? "/" : ""
            }${fileId}`,
          };
          // Save updated root meta
          await fetch(`${API_URL}/api/files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: rootMetaPath,
              content: rootMeta,
            }),
          });
        }
      } catch (error) {
        console.error("Error updating metadata:", error);
      }
    };

    const addItemToTree = (
      tree: FileNode[],
      parentId: string,
      newItem: FileNode
    ): FileNode[] => {
      return tree.map((node) => {
        if (node.id === parentId) {
          return {
            ...node,
            children: [...(node.children || []), newItem],
          };
        }
        if (node.children) {
          return {
            ...node,
            children: addItemToTree(node.children, parentId, newItem),
          };
        }
        return node;
      });
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        addNewItem();
      }
    };
    const handleRenameKeyDown = (
      e: KeyboardEvent<HTMLInputElement>,
      nodeId: string
    ) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleRename(nodeId);
      } else if (e.key === "Escape") {
        cancelRename();
      }
    };
    const findNodeById = (nodes: FileNode[], id: string): FileNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNodeById(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const renameNodeInTree = (
      tree: FileNode[],
      nodeId: string,
      newName: string
    ): FileNode[] => {
      return tree.map((node) => {
        if (node.id === nodeId) {
          return { ...node, name: newName };
        }
        if (node.children) {
          return {
            ...node,
            children: renameNodeInTree(node.children, nodeId, newName),
          };
        }
        return node;
      });
    };

    const updateMetadataForRename = async (
      parentPath: string,
      oldFileName: string,
      newFileName: string
    ) => {
      try {
        // Extract the language and section from the parent path
        const pathParts = parentPath.split("/");
        const language = pathParts[0];
        const section = pathParts[1];

        // Get the root meta file
        const rootMetaPath = `${language}/${section}/_meta.json`;
        const rootMetaResponse = await fetch(
          `${API_URL}/api/files?path=${encodeURIComponent(rootMetaPath)}`
        );

        if (!rootMetaResponse.ok) {
          throw new Error("Failed to read metadata");
        }

        const rootMeta = (await rootMetaResponse.json()) as RootMeta;
        const oldFileId = oldFileName.replace(".json", "");
        const newFileId = newFileName.replace(".json", "");

        // Navigate through the path to find the right section
        let currentSection = rootMeta;
        for (let i = 2; i < pathParts.length; i++) {
          const part = pathParts[i];

          // Convert path to camelCase for section key
          const sectionKey = part
            .replace(/-/g, " ")
            .split(" ")
            .map((word, index) => {
              const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
              return index === 0 ? capitalized.toLowerCase() : capitalized;
            })
            .join("");

          // Move to items object for next iteration
          const section = currentSection[sectionKey] as MetaItem;
          if (section?.items) {
            currentSection = section.items;
          }
        }

        // Update the metadata entry
        const oldEntry = currentSection[oldFileId];
        if (oldEntry && typeof oldEntry === "object" && "title" in oldEntry) {
          // Construct the new path
          const pathWithoutLanguage = pathParts.slice(2).join("/");
          const newPath = `/${section}/${pathWithoutLanguage}${
            pathWithoutLanguage ? "/" : ""
          }${newFileId}`;

          // Create new entry with updated path and existing properties
          currentSection[newFileId] = {
            ...(oldEntry as MetaItem),
            path: newPath,
          };

          // Remove old entry
          delete currentSection[oldFileId];

          // Save updated root meta
          await fetch(`${API_URL}/api/files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: rootMetaPath,
              content: rootMeta,
            }),
          });
        }
      } catch (error) {
        console.error("Error updating metadata for rename:", error);
      }
    };

    const filterTreeByLanguage = (nodes: FileNode[]): FileNode[] => {
      if (selectedLanguage === "all") return nodes;

      const languageFolder = nodes.find(
        (node) => node.name === selectedLanguage
      );
      if (languageFolder && languageFolder.children) {
        return languageFolder.children;
      }

      return [];
    };

    const renderFileTree = (
      nodes: FileNode[],
      level: number = 0,
      parentId?: string
    ) => {
      return (
        <ul className={`space-y-0.5 ${level > 0 ? "ml-3 pl-3" : ""}`}>
          {nodes
            .filter((node) => node.name !== "api")
            .map((node, index) => (
              <React.Fragment key={node.id}>
                <li className="relative">
                  <FileExplorerContextMenu
                    onNewFile={() => startNewItem(node.id, "file")}
                    onNewFolder={() => startNewItem(node.id, "folder")}
                    onDelete={() => deleteItem(node.id, node.name, node.type)}
                    onRename={() => startRename(node.id, node.name)}
                    isFolder={node.type === "folder"}
                    disableDelete={
                      node.type === "folder" &&
                      (level === 0 || // Language folders (en, es, etc)
                        (level === 1 &&
                          ["docs", "articles", "api"].includes(node.name))) // Protected subfolders
                    }
                    disableRename={
                      node.type === "folder" &&
                      (level === 0 || // Language folders (en, es, etc)
                        (level === 1 &&
                          ["docs", "articles", "api"].includes(node.name))) // Protected subfolders
                    }
                  >
                    <div className="flex items-center justify-between py-0.5 pr-2">
                      <div className="flex items-center flex-grow min-w-0">
                        {node.type === "folder" && (
                          <button
                            onClick={() => toggleFolder(node.id)}
                            className="mr-1 focus:outline-none"
                            aria-label={
                              expandedFolders.has(node.id)
                                ? "Collapse folder"
                                : "Expand folder"
                            }
                          >
                            {expandedFolders.has(node.id) ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
                        <div className="mb-1">
                          {node.type === "folder" ? (
                            ""
                          ) : (
                            <div className="mr-1">
                              <File className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-grow min-w-0 pr-2">
                          {renamingNode === node.id ? (
                            <Input
                              ref={renameInputRef}
                              type="text"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              onKeyDown={(e) => handleRenameKeyDown(e, node.id)}
                              onBlur={() => handleRename(node.id)}
                              className="h-6 text-sm py-0 px-1"
                            />
                          ) : (
                            <span
                              className={`text-sm ${
                                node.type === "folder" ? "font-semibold" : ""
                              } text-foreground hover:text-primary transition-colors duration-200 cursor-pointer truncate inline-block max-w-full`}
                              onClick={() =>
                                node.type === "file"
                                  ? handleFileClick(node)
                                  : toggleFolder(node.id)
                              }
                            >
                              {node.type === "file"
                                ? node.name.split(".").slice(0, -1).join(".")
                                : node.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <FileExplorerDropdownMenu
                        onNewFile={() => startNewItem(node.id, "file")}
                        onNewFolder={() => startNewItem(node.id, "folder")}
                        onDelete={() =>
                          deleteItem(node.id, node.name, node.type)
                        }
                        onRename={() => startRename(node.id, node.name)}
                        isFolder={node.type === "folder"}
                        disableDelete={
                          node.type === "folder" &&
                          (level === 0 || // Language folders (en, es, etc)
                            (level === 1 &&
                              ["docs", "articles", "api"].includes(node.name))) // Protected subfolders
                        }
                        disableRename={
                          node.type === "folder" &&
                          (level === 0 || // Language folders (en, es, etc)
                            (level === 1 &&
                              ["docs", "articles", "api"].includes(node.name))) // Protected subfolders
                        }
                      />
                    </div>
                  </FileExplorerContextMenu>
                  {node.type === "folder" && node.children && (
                    <AnimatePresence>
                      {expandedFolders.has(node.id) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="mt-1">
                            {renderFileTree(node.children, level + 1, node.id)}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                  {newItemParent === node.id && (
                    <div className="flex items-center mt-2 pr-8 flex-shrink-0">
                      <Input
                        type="text"
                        ref={inputRef}
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`New ${newItemType}`}
                        className="h-8 text-sm bg-background text-foreground flex-grow"
                      />
                      <Button
                        onClick={addNewItem}
                        size="sm"
                        className="ml-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={cancelNewItem}
                        size="sm"
                        variant="ghost"
                        className="ml-1 text-muted-foreground"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </li>
                <InsertionPoint
                  onNewFile={() => startNewItem(parentId || node.id, "file")}
                  onNewFolder={() =>
                    startNewItem(parentId || node.id, "folder")
                  }
                />
              </React.Fragment>
            ))}
        </ul>
      );
    };
    const transformContentToFileTree = (content: {
      [key: string]: any;
    }): FileNode[] => {
      const tree: { [key: string]: FileNode } = {};
      let rootNodes: FileNode[] = [];

      Object.keys(content).forEach((path) => {
        const parts = path.split("/");
        let currentPath = "";

        parts.forEach((part, index) => {
          const isFile = index === parts.length - 1;
          const fullPath = currentPath ? `${currentPath}/${part}` : part;
          const nodeId = fullPath.replace(/[/.]/g, "_");

          if (!tree[fullPath]) {
            tree[fullPath] = {
              id: nodeId,
              name: part,
              type: isFile ? "file" : "folder",
              children: isFile ? undefined : [],
            };
          }

          if (index === 0) {
            if (!rootNodes.find((node) => node.id === nodeId)) {
              rootNodes.push(tree[fullPath]);
            }
          } else {
            const parentPath = currentPath;
            const parent = tree[parentPath];
            if (
              parent &&
              parent.children &&
              !parent.children.find((child) => child.id === nodeId)
            ) {
              parent.children.push(tree[fullPath]);
            }
          }

          currentPath = fullPath;
        });
      });

      // Filter out _meta.json files
      const filterMetaFiles = (nodes: FileNode[]): FileNode[] => {
        return nodes
          .map((node) => ({
            ...node,
            children: node.children
              ? filterMetaFiles(
                  node.children.filter((child) => child.name !== "_meta.json")
                )
              : undefined,
          }))
          .filter((node) => node.name !== "_meta.json");
      };

      return filterMetaFiles(rootNodes);
    };

    const deleteItem = async (
      nodeId: string,
      nodeName: string,
      nodeType: "file" | "folder"
    ) => {
      const confirmMessage = `Are you sure you want to delete this ${nodeType}${
        nodeType === "folder" ? " and all its contents" : ""
      }?`;
      if (!confirm(confirmMessage)) {
        return;
      }

      const fullPath = getNodeFullPath(fileTree, nodeId);
      if (!fullPath) {
        console.error("Could not find full path for node");
        return;
      }

      try {
        console.log("Deleting item from tree:", { nodeName, fullPath });
        const response = await fetch(`${API_URL}/api/files`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: fullPath,
            type: nodeType,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to delete item");
        }
        // Update metadata
        const pathParts = fullPath.split("/");
        const language = pathParts[0];
        const section = pathParts[1];
        const fileId = nodeName.replace(".json", "");

        // Get current metadata
        const rootMetaPath = `${language}/${section}/_meta.json`;
        const metaResponse = await fetch(
          `${API_URL}/api/files?path=${encodeURIComponent(rootMetaPath)}`
        );

        if (metaResponse.ok) {
          const rootMeta = (await metaResponse.json()) as RootMeta;

          // Navigate through the path to find the right section
          let currentSection = rootMeta;
          for (let i = 2; i < pathParts.length - 1; i++) {
            const part = pathParts[i];

            // Convert path to camelCase for section key
            const sectionKey = part
              .replace(/-/g, " ")
              .split(" ")
              .map((word, index) => {
                const capitalized =
                  word.charAt(0).toUpperCase() + word.slice(1);
                return index === 0 ? capitalized.toLowerCase() : capitalized;
              })
              .join("");

            if (
              currentSection[sectionKey] &&
              (currentSection[sectionKey] as MetaItem).items
            ) {
              currentSection = (currentSection[sectionKey] as MetaItem).items!;
            }
          }

          // Remove the entry
          if (nodeType === "file" && currentSection[fileId]) {
            delete currentSection[fileId];

            // Save updated metadata
            await fetch(`${API_URL}/api/files`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                path: rootMetaPath,
                content: rootMeta,
              }),
            });
          }
        }
        const updatedTree = deleteItemFromTree(fileTree, nodeId);
        setFileTree(updatedTree);
      } catch (error) {
        console.error("Error deleting item:", error);
      }
    };

    const deleteItemFromTree = (
      tree: FileNode[],
      nodeId: string
    ): FileNode[] => {
      return tree.filter((node) => {
        if (node.id === nodeId) {
          return false;
        }
        if (node.children) {
          node.children = deleteItemFromTree(node.children, nodeId);
        }
        return true;
      });
    };

    // Use useImperativeHandle to expose methods
    useImperativeHandle(ref, () => ({
      deleteItem: (
        nodeId: string,
        nodeName: string,
        nodeType: "file" | "folder"
      ) => deleteItem(nodeId, nodeName, nodeType),
      handleRename: (nodeId: string) => {
        const node = findNodeById(fileTree, nodeId);
        if (node) {
          startRename(nodeId, node.name);
        }
      },
    }));

    return (
      <div className="px-6 py-6 bg-background min-h-screen text-foreground min-w-[150px] max-w-[300px] flex-shrink-0 w-full">
        <div className="flex flex-col space-y-4 mb-6">
          <h1 className="text-xl font-semibold text-foreground">
            Project Explorer
          </h1>
          <div className="w-full min-w-0">
            {" "}
            {/* Container for LanguageSelector */}
            <LanguageSelector
              value={selectedLanguage}
              onValueChange={onLanguageChange}
            />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {renderFileTree(filterTreeByLanguage(fileTree))}
        </motion.div>
      </div>
    );
  }
);

FileExplorer.displayName = "FileExplorer";
export default FileExplorer;

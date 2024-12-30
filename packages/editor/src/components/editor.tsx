"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BlockType } from "@/types/Block";
import { Plus } from "lucide-react";
import { ArticleHeaders } from "@/components/blocks/ArticleHeaders";
import { TitleBar } from "@/components/layout/TitleBar";
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableBlock } from "@/components/blocks/SortableBlock";
import { SEO } from "@/components/layout/SEO";
import { jsPDF } from "jspdf";

type Block = {
  id: string;
  type: BlockType;
  content: string;
  metadata?: Record<string, any>;
};

interface EditorProps {
  filePath: string;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  onDelete: () => void;
  onRename: () => void;
}

export function Editor({
  filePath,
  onDelete,
  onRename,
  selectedLanguage,
  onLanguageChange,
}: EditorProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [inputRefs, setInputRefs] = useState<
    React.RefObject<HTMLInputElement>[]
  >([]);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeChangeTypeId, setActiveChangeTypeId] = useState<string | null>(
    null
  );

  const [currentFilePath, setCurrentFilePath] = useState(filePath);

  const getLanguageFilePath = (basePath: string, language: string) => {
    if (language === "all") return basePath;

    const parts = basePath.split("/");
    const tree: { [key: string]: any } = {};

    let currentNode: { [key: string]: any } = tree;
    parts.forEach((part) => {
      if (!currentNode[part]) {
        currentNode[part] = {};
      }
      currentNode = currentNode[part];
    });

    // Replace the language node
    const languageNode = Object.keys(tree)[0];
    const newTree: { [key: string]: any } = { [language]: tree[languageNode] };

    // Transform the tree back to a path
    const newPath =
      Object.keys(newTree).join("/") + "/" + parts.slice(1).join("/");

    return newPath;
  };

  useEffect(() => {
    const loadFileContent = async () => {
      setIsLoading(true);
      const newFilePath = getLanguageFilePath(filePath, selectedLanguage);
      setCurrentFilePath(newFilePath); // Update the current file path

      try {
        const response = await fetch(
          `/api/files?path=${encodeURIComponent(newFilePath)}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            // If the file doesn't exist in the selected language, reload the original file
            const originalResponse = await fetch(
              `/api/files?path=${encodeURIComponent(filePath)}`
            );

            if (!originalResponse.ok) {
              throw new Error("Failed to load file");
            }

            const data = await originalResponse.json();
            setTitle(data.title || "");
            setSubtitle(data.description || "");
            setBlocks(
              data.blocks || [
                { id: "1", type: "paragraph", content: "", metadata: {} },
              ]
            );
          } else {
            throw new Error("Failed to load file");
          }
        } else {
          const data = await response.json();
          setTitle(data.title || "");
          setSubtitle(data.description || "");
          setBlocks(
            data.blocks || [
              { id: "1", type: "paragraph", content: "", metadata: {} },
            ]
          );
        }
      } catch (error) {
        console.error("Error loading file:", error);
        setBlocks([{ id: "1", type: "paragraph", content: "", metadata: {} }]);
      } finally {
        setIsLoading(false);
      }
    };

    loadFileContent();
  }, [filePath, selectedLanguage]);
  const handleSave = async () => {
    if (!currentFilePath) {
      console.error("No file path specified");
      return;
    }

    setIsSaving(true);
    try {
      const content = {
        title,
        description: subtitle,
        author: "Anonymous", // You might want to make this dynamic
        date: new Date().toISOString().split("T")[0],
        blocks,
      };

      const response = await fetch("/api/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content }),
      });

      if (!response.ok) throw new Error("Failed to save file");
      toast.success("Changes saved successfully");
    } catch (error) {
      console.error("Error saving file:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };
  const exportToPDF = () => {
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
    });

    // Set document margins similar to editor (using points)
    const margin = {
      top: 40,
      bottom: 40,
      left: 40,
      right: 40,
    };

    const pageWidth = doc.internal.pageSize.width;
    const maxWidth = pageWidth - margin.left - margin.right;
    let currentY = margin.top;

    // Add title
    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor(0, 0, 0);
      const titleLines = doc.splitTextToSize(title, maxWidth);
      doc.text(titleLines, margin.left, currentY);
      currentY += titleLines.length * 35;
    }

    // Add subtitle
    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(18);
      doc.setTextColor(100, 100, 100);
      const subtitleLines = doc.splitTextToSize(subtitle, maxWidth);
      doc.text(subtitleLines, margin.left, currentY);
      currentY += subtitleLines.length * 25 + 20;
    }

    // Process each block
    blocks.forEach((block) => {
      // Add spacing between blocks
      currentY += 10;

      // Check if we need a new page before processing each block
      if (currentY > doc.internal.pageSize.height - margin.bottom) {
        doc.addPage();
        currentY = margin.top;
      }

      switch (block.type) {
        case "heading": {
          const level = block.metadata?.level || 1;
          const fontSize: { [key: number]: number } = {
            1: 24,
            2: 20,
            3: 18,
            4: 16,
            5: 14,
            6: 12,
          };
          const fontSizeValue = fontSize[level as number] || 24;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(fontSizeValue);
          doc.setTextColor(0, 0, 0);
          const lines = doc.splitTextToSize(block.content, maxWidth);
          doc.text(lines, margin.left, currentY);
          currentY += lines.length * (fontSizeValue * 1.5);
          break;
        }

        case "paragraph": {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);

          if (block.metadata?.styles) {
            if (block.metadata.styles.bold) doc.setFont("helvetica", "bold");
            if (block.metadata.styles.italic)
              doc.setFont("helvetica", "italic");
          }

          const alignment = block.metadata?.align || "left";
          const lines = doc.splitTextToSize(block.content, maxWidth);
          const xPosition =
            alignment === "center"
              ? pageWidth / 2
              : alignment === "right"
              ? pageWidth - margin.right
              : margin.left;

          doc.text(lines, xPosition, currentY, {
            align: alignment,
            maxWidth: maxWidth,
          });
          currentY += lines.length * 20;
          break;
        }

        case "list": {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);

          try {
            const items = Array.isArray(block.content)
              ? block.content
              : JSON.parse(block.content);
            const listType = block.metadata?.listType || "unordered";

            items.forEach((item: string, index: number) => {
              const bullet = listType === "ordered" ? `${index + 1}.` : "•";
              const itemText = `${bullet} ${item}`;
              const lines = doc.splitTextToSize(itemText, maxWidth - 20);

              doc.text(lines, margin.left + 20, currentY);
              currentY += lines.length * 20;
            });
          } catch (e) {
            console.error("Error parsing list content:", e);
          }
          break;
        }

        case "code": {
          doc.setFont("courier", "normal");
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);

          // Add light gray background for code blocks
          doc.setFillColor(245, 245, 245);
          const lines = doc.splitTextToSize(block.content, maxWidth - 20);
          const blockHeight = lines.length * 15 + 20;
          doc.rect(margin.left, currentY - 10, maxWidth, blockHeight, "F");

          // Add filename if present
          if (block.metadata?.filename) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(block.metadata.filename, margin.left + 10, currentY + 5);
            currentY += 20;
          }

          doc.setFont("courier", "normal");
          doc.setFontSize(11);
          lines.forEach((line: string) => {
            doc.text(line, margin.left + 10, currentY);
            currentY += 15;
          });

          currentY += 10;
          break;
        }

        case "blockquote": {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(12);
          doc.setTextColor(100, 100, 100);

          // Add light gray background
          doc.setFillColor(245, 245, 245);
          const lines = doc.splitTextToSize(block.content, maxWidth - 40);
          const blockHeight = lines.length * 20 + 20;
          doc.rect(margin.left, currentY - 10, maxWidth, blockHeight, "F");

          // Add left border
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(4);
          doc.line(
            margin.left + 4,
            currentY - 10,
            margin.left + 4,
            currentY + blockHeight - 10
          );

          // Add quote content
          doc.text(lines, margin.left + 20, currentY);
          currentY += lines.length * 20 + 10;
          break;
        }

        case "callout": {
          const typeColors = {
            info: [235, 245, 255] as [number, number, number],
            warning: [255, 250, 235] as [number, number, number],
            success: [235, 255, 240] as [number, number, number],
            error: [255, 235, 235] as [number, number, number],
          };
          const type = block.metadata?.type || "info";
          const color = typeColors[type as keyof typeof typeColors];

          doc.setFillColor(color[0], color[1], color[2]);
          const lines = doc.splitTextToSize(block.content, maxWidth - 20);
          const blockHeight = lines.length * 20 + 40;
          doc.roundedRect(
            margin.left,
            currentY - 10,
            maxWidth,
            blockHeight,
            3,
            3,
            "F"
          );

          if (block.metadata?.title) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.text(block.metadata.title, margin.left + 15, currentY + 10);
            currentY += 25;
          }

          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          doc.text(lines, margin.left + 15, currentY);
          currentY += lines.length * 20 + 15;
          break;
        }

        case "checkList": {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);

          try {
            const items = Array.isArray(block.content)
              ? block.content
              : JSON.parse(block.content);

            items.forEach((item: { text: string; checked: boolean }) => {
              const checkbox = item.checked ? "☒" : "☐";
              const itemText = `${checkbox} ${item.text}`;
              const lines = doc.splitTextToSize(itemText, maxWidth - 20);

              doc.text(lines, margin.left + 20, currentY);
              currentY += lines.length * 20;
            });
          } catch (e) {
            console.error("Error parsing checklist content:", e);
          }
          break;
        }

        case "divider": {
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(1);
          doc.line(margin.left, currentY, pageWidth - margin.right, currentY);
          currentY += 20;
          break;
        }

        case "table": {
          try {
            const { headers, rows } = JSON.parse(block.content);
            const cellPadding = 10;
            const cellWidth = maxWidth / headers.length;
            const cellHeight = 30;

            // Draw headers
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setFillColor(245, 245, 245);

            headers.forEach((header: string, index: number) => {
              doc.rect(
                margin.left + index * cellWidth,
                currentY - cellPadding,
                cellWidth,
                cellHeight,
                "F"
              );
              const lines = doc.splitTextToSize(
                header,
                cellWidth - cellPadding * 2
              );
              doc.text(
                lines,
                margin.left + index * cellWidth + cellPadding,
                currentY + 5
              );
            });

            currentY += cellHeight;

            // Draw rows
            doc.setFont("helvetica", "normal");
            rows.forEach((row: string[]) => {
              const rowHeight = cellHeight;
              row.forEach((cell: string, index: number) => {
                const lines = doc.splitTextToSize(
                  cell,
                  cellWidth - cellPadding * 2
                );
                doc.text(
                  lines,
                  margin.left + index * cellWidth + cellPadding,
                  currentY + 5
                );
              });
              currentY += rowHeight;
            });
          } catch (e) {
            console.error("Error parsing table content:", e);
          }
          break;
        }

        case "image":
        case "video":
        case "audio":
        case "file": {
          try {
            const content =
              typeof block.content === "string"
                ? JSON.parse(block.content)
                : block.content;

            // Add caption if present
            if (content.caption) {
              doc.setFont("helvetica", "italic");
              doc.setFontSize(10);
              doc.setTextColor(100, 100, 100);
              const captionLines = doc.splitTextToSize(
                content.caption,
                maxWidth
              );
              doc.text(captionLines, margin.left, currentY);
              currentY += captionLines.length * 15;
            }

            // Add placeholder text for media/file
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            const placeholderText = `[${block.type.toUpperCase()} - ${
              content.url || "Embedded content"
            }]`;
            doc.text(placeholderText, margin.left, currentY);
            currentY += 20;
          } catch (e) {
            console.error(`Error processing ${block.type} content:`, e);
          }
          break;
        }
      }
    });

    const fileName =
      filePath
        ?.split("/")
        .pop()
        ?.replace(".json", "")
        ?.split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ") || "Untitled";

    doc.save(`${fileName}.pdf`);
  };

  const addBlock = (afterId: string) => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type: "paragraph",
      content: "",
      metadata: {},
    };

    // Update refs
    setBlocks((prevBlocks) => {
      const updatedBlocks =
        afterId === "new"
          ? [newBlock]
          : [
              ...prevBlocks.slice(
                0,
                prevBlocks.findIndex((block) => block.id === afterId) + 1
              ),
              newBlock,
              ...prevBlocks.slice(
                prevBlocks.findIndex((block) => block.id === afterId) + 1
              ),
            ];

      // Create a new ref for the new block
      setInputRefs((refs) => [...refs, React.createRef()]);
      return updatedBlocks;
    });

    // Autofocus on the new input
    setTimeout(() => {
      const newIndex = blocks.length; // The index of the newly added block
      if (inputRefs[newIndex]?.current) {
        inputRefs[newIndex].current.focus();
      }
    }, 0);
  };

  const updateBlock = (id: string, content: string) => {
    setBlocks(
      blocks.map((block) => {
        if (block.id === id) {
          if (block.type === "list") {
            try {
              const parsed = JSON.parse(content);
              return {
                ...block,
                content: JSON.stringify(
                  Array.isArray(parsed) ? parsed : [parsed]
                ),
              };
            } catch {
              return { ...block, content: JSON.stringify([content]) };
            }
          }
          return { ...block, content };
        }
        return block;
      })
    );
  };

  const changeBlockType = (id: string, newType: BlockType) => {
    setBlocks(
      blocks.map((block) =>
        block.id === id ? { ...block, type: newType } : block
      )
    );
    setActiveChangeTypeId(null);
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter((block) => block.id !== id));
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBlocks((blocks) => {
        const oldIndex = blocks.findIndex((block) => block.id === active.id);
        const newIndex = blocks.findIndex((block) => block.id === over.id);

        return arrayMove(blocks, oldIndex, newIndex);
      });
    }
  };

  const updateBlockMetadata = (id: string, metadata: any) => {
    setBlocks(
      blocks.map((block) => {
        if (block.id === id) {
          return { ...block, metadata: metadata };
        }
        return block;
      })
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <SEO
          title={`${title} | Editor`}
          description={subtitle}
          noIndex={true}
        />
        <TitleBar
          filePath={filePath}
          onSave={handleSave}
          isSaving={isSaving}
          onDelete={onDelete}
          onRename={onRename}
          onExport={exportToPDF}
        />
        {/* {isLoading ? (
          <div className="flex justify-center items-center h-screen">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-gray-500 mb-4">
              No content available in this language
            </p>
            {selectedLanguage !== 'all' && (
              <Button
                variant="outline"
                onClick={() => setSelectedLanguage('all')}
              >
                View in All Languages
              </Button>
            )}
          </div>
        ) : ( */}
        {currentFilePath && (
          <div className="prose prose-lg max-w-none">
            <ArticleHeaders
              title={title}
              setTitle={setTitle}
              subtitle={subtitle}
              setSubtitle={setSubtitle}
              showPreview={showPreview}
            />
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext
                items={blocks}
                strategy={verticalListSortingStrategy}
              >
                {blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    updateBlock={updateBlock}
                    changeBlockType={changeBlockType}
                    addBlock={addBlock}
                    deleteBlock={deleteBlock}
                    showPreview={showPreview}
                    isChangeTypeActive={activeChangeTypeId === block.id}
                    setActiveChangeTypeId={setActiveChangeTypeId}
                    updateBlockMetadata={updateBlockMetadata}
                    inputRef={
                      inputRefs[blocks.findIndex((b) => b.id === block.id)]
                    }
                  />
                ))}
              </SortableContext>
            </DndContext>
            {blocks.length === 0 && !showPreview && (
              <div className="flex justify-center my-8">
                <Button
                  onClick={() => addBlock("new")}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Block
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Editor;

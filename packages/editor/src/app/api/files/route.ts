import { writeFile, mkdir, rm, unlink, readFile, rename } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

function getBasePath() {
  return path.join(process.cwd(), "..", "compiled");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if ("oldPath" in body && "newPath" in body) {
      const oldFullPath = path.join(getBasePath(), body.oldPath);
      const newFullPath = path.join(getBasePath(), body.newPath);

      try {
        await readFile(newFullPath);
        return NextResponse.json(
          { error: "A file with this name already exists" },
          { status: 409 }
        );
      } catch {}

      try {
        await mkdir(path.dirname(newFullPath), { recursive: true });

        await rename(oldFullPath, newFullPath);
        return NextResponse.json({ success: true });
      } catch (renameError) {
        console.error("Error during rename:", renameError);
        return NextResponse.json(
          { error: "Failed to rename file or folder" },
          { status: 500 }
        );
      }
    }

    const { path: filePath, content, isDirectory } = body;
    const fullPath = path.join(getBasePath(), filePath);

    await mkdir(path.dirname(fullPath), { recursive: true });

    if (isDirectory) {
      await mkdir(fullPath, { recursive: true });
    } else {
      await writeFile(fullPath, JSON.stringify(content, null, 2));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST handler:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { path: itemPath, type } = await request.json();
    const fullPath = path.join(getBasePath(), itemPath);

    if (type === "folder") {
      await rm(fullPath, { recursive: true, force: true });
    } else {
      await unlink(fullPath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { error: "No file path provided" },
        { status: 400 }
      );
    }

    const fullPath = path.join(getBasePath(), filePath);
    const fileContent = await readFile(fullPath, "utf-8");
    const parsedContent = JSON.parse(fileContent);

    return NextResponse.json(parsedContent);
  } catch (error) {
    console.error("Error reading file:", error);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { path: filePath, content } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { error: "No file path provided" },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: "No content provided" },
        { status: 400 }
      );
    }

    const fullPath = path.join(getBasePath(), filePath);

    await mkdir(path.dirname(fullPath), { recursive: true });

    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const jsonContent = JSON.stringify(content, null, 2);
        await writeFile(fullPath, jsonContent, "utf-8");
        return NextResponse.json({ success: true });
      } catch (writeError) {
        if (i === maxRetries - 1) throw writeError;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error("Error writing file:", error);
    return NextResponse.json(
      {
        error: "Failed to write file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

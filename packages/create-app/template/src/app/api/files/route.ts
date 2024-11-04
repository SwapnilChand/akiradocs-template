import { writeFile, mkdir, rm, unlink, readFile } from 'fs/promises'
import { NextResponse } from 'next/server'
import path from 'path'

export async function POST(request: Request) {
  try {
    const { path: filePath, content } = await request.json()
    
    // Ensure the directory exists
    const fullPath = path.join(process.cwd(), '_contents', filePath)
    await mkdir(path.dirname(fullPath), { recursive: true })
    
    // Write the file
    await writeFile(fullPath, JSON.stringify(content, null, 2))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating file:', error)
    return NextResponse.json(
      { error: 'Failed to create file' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { path: itemPath, type } = await request.json()
    const fullPath = path.join(process.cwd(), '_contents', itemPath)

    if (type === 'folder') {
      await rm(fullPath, { recursive: true, force: true })
    } else {
      await unlink(fullPath)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'No file path provided' },
        { status: 400 }
      )
    }

    const fullPath = path.join(process.cwd(), '_contents', filePath)
    const fileContent = await readFile(fullPath, 'utf-8')
    const parsedContent = JSON.parse(fileContent)
    
    return NextResponse.json(parsedContent)
  } catch (error) {
    console.error('Error reading file:', error)
    return NextResponse.json(
      { error: 'Failed to read file' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const { path: filePath, content } = await request.json()
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'No file path provided' },
        { status: 400 }
      )
    }

    const fullPath = path.join(process.cwd(), '_contents', filePath)
    
    // Prettify the JSON for better readability
    const jsonContent = JSON.stringify(content, null, 2)
    
    await writeFile(fullPath, jsonContent, 'utf-8')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error writing file:', error)
    return NextResponse.json(
      { error: 'Failed to write file' },
      { status: 500 }
    )
  }
}

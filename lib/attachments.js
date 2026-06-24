import { promises as fs } from 'fs'
import path from 'path'

const uploadsRoot = path.join(process.cwd(), 'public', 'uploads', 'tickets')

function normalizeFileName(name) {
  const baseName = path.basename(name || 'attachment')
  return baseName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function saveFilesToDisk(ticketId, attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return []
  }

  const ticketDir = path.join(uploadsRoot, String(ticketId))
  await fs.mkdir(ticketDir, { recursive: true })

  const storedAttachments = []

  if (attachments.length > 5) {
    attachments = attachments.slice(0, 5)
  }

  for (const file of attachments) {
    if (!file || typeof file.arrayBuffer !== 'function') {
      continue
    }

    const originalName = String(file.name || 'attachment')
    const safeName = normalizeFileName(originalName)
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`
    const savedPath = path.join(ticketDir, uniqueName)
    const buffer = Buffer.from(await file.arrayBuffer())

    await fs.writeFile(savedPath, buffer)

    storedAttachments.push({
      file_name: originalName,
      file_path: `/uploads/tickets/${ticketId}/${uniqueName}`,
      mime_type: file.type || 'application/octet-stream',
    })
  }

  return storedAttachments
}

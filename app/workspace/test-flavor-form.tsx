'use client'

import { FormEvent, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_ALMOSTCRACKD_API_BASE_URL ?? 'https://api.almostcrackd.ai'

const SUPPORTED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
])

type FlavorOption = {
  id: string
  slug: string
}

type CaptionRecord = Record<string, unknown>
type TestRunResult = {
  fileName: string
  imageId?: string
  captions: CaptionRecord[]
  error?: string
}

function pickCaptionText(record: CaptionRecord): string {
  const candidates = ['caption', 'content', 'text', 'body', 'caption_text']

  for (const key of candidates) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }

  return JSON.stringify(record)
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export default function TestFlavorForm({
  flavors,
  defaultFlavorId,
  excludedFlavorCount = 0,
}: {
  flavors: FlavorOption[]
  defaultFlavorId?: string
  excludedFlavorCount?: number
}) {
  const [files, setFiles] = useState<File[]>([])
  const [humorFlavorId, setHumorFlavorId] = useState(defaultFlavorId ?? flavors[0]?.id ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [results, setResults] = useState<TestRunResult[]>([])

  const fileTypeValid = useMemo(() => {
    if (files.length === 0) {
      return true
    }
    return files.every((file) => SUPPORTED_TYPES.has(file.type.toLowerCase()))
  }, [files])

  const runTest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setResults([])
    setErrorMessage(null)

    if (!humorFlavorId) {
      setErrorMessage('Choose a humor flavor first.')
      return
    }

    if (files.length === 0) {
      setErrorMessage('Select one or more test images first.')
      return
    }

    if (!fileTypeValid) {
      const invalidFile = files.find((nextFile) => !SUPPORTED_TYPES.has(nextFile.type.toLowerCase()))
      setErrorMessage(`Unsupported file type: ${invalidFile?.type ?? 'unknown'}`)
      return
    }

    setIsLoading(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        throw new Error('No valid auth token found. Sign in again.')
      }

      const token = session.access_token
      const nextResults: TestRunResult[] = []

      for (const file of files) {
        try {
          const presignedResponse = await fetch(`${API_BASE_URL}/pipeline/generate-presigned-url`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ contentType: file.type }),
          })

          const presignedData = (await parseJsonResponse(presignedResponse)) as {
            presignedUrl?: string
            cdnUrl?: string
          } | null

          if (!presignedResponse.ok || !presignedData?.presignedUrl || !presignedData.cdnUrl) {
            throw new Error(`Image upload prep failed: ${presignedResponse.status}`)
          }

          const uploadResponse = await fetch(presignedData.presignedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          })

          if (!uploadResponse.ok) {
            throw new Error(`Image upload failed: ${uploadResponse.status}`)
          }

          const imageResponse = await fetch(`${API_BASE_URL}/pipeline/upload-image-from-url`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageUrl: presignedData.cdnUrl,
              isCommonUse: false,
            }),
          })

          const imageData = (await parseJsonResponse(imageResponse)) as {
            imageId?: string
          } | null

          if (!imageResponse.ok || !imageData?.imageId) {
            throw new Error(`Image registration failed: ${imageResponse.status}`)
          }

          const captionsResponse = await fetch(`${API_BASE_URL}/pipeline/generate-captions`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageId: imageData.imageId,
              humorFlavorId,
            }),
          })

          const rawCaptions = await parseJsonResponse(captionsResponse)

          if (!captionsResponse.ok) {
            throw new Error(`Caption generation failed: ${captionsResponse.status}`)
          }

          const nextCaptions = Array.isArray(rawCaptions)
            ? (rawCaptions as CaptionRecord[])
            : ((rawCaptions as { captions?: CaptionRecord[] } | null)?.captions ?? [])

          nextResults.push({
            fileName: file.name,
            imageId: imageData.imageId,
            captions: nextCaptions,
          })
        } catch (error) {
          nextResults.push({
            fileName: file.name,
            captions: [],
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      setResults(nextResults)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="panel stack">
      <div>
        <h2 className="section-title">Test A Humor Flavor</h2>
        <p className="muted">
          Upload a small image test set and run the selected humor flavor across each image using
          the AlmostCrackd REST pipeline.
        </p>
        {excludedFlavorCount > 0 ? (
          <p className="muted">
            Showing {flavors.length} test-compatible flavor
            {flavors.length === 1 ? '' : 's'}. {excludedFlavorCount} incompatible staging flavor
            {excludedFlavorCount === 1 ? ' is' : 's are'} hidden from this runner to avoid known
            pipeline failures.
          </p>
        ) : null}
      </div>

      <form onSubmit={runTest} className="stack">
        <label className="stack">
          <span className="muted">Humor flavor</span>
          <select
            value={humorFlavorId}
            onChange={(event) => setHumorFlavorId(event.target.value)}
          >
            {flavors.map((flavor) => (
              <option key={flavor.id} value={flavor.id}>
                {flavor.slug}
              </option>
            ))}
          </select>
        </label>

        <label className="stack">
          <span className="muted">Image</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
        </label>

        <p className="muted">
          {files.length === 0
            ? 'No test set selected yet.'
            : `${files.length} image${files.length === 1 ? '' : 's'} ready to test.`}
        </p>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading || !humorFlavorId || files.length === 0 || !fileTypeValid}
        >
          {isLoading ? 'Generating...' : 'Run Test Set'}
        </button>
      </form>

      {!fileTypeValid ? (
        <p className="status-error">Use jpeg, jpg, png, webp, gif, or heic images.</p>
      ) : null}

      {errorMessage ? <p className="status-error">{errorMessage}</p> : null}
      {results.length > 0 ? (
        <div className="list">
          {results.map((result) => (
            <article key={result.fileName} className="card stack">
              <div>
                <strong>{result.fileName}</strong>
                {result.imageId ? (
                  <p className="mono muted">image id: {result.imageId}</p>
                ) : null}
              </div>
              {result.error ? (
                <p className="status-error">{result.error}</p>
              ) : result.captions.length > 0 ? (
                <div className="list">
                  {result.captions.map((record, index) => (
                    <article key={`${result.fileName}-${index}`} className="card">
                      <p>{pickCaptionText(record)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">No captions returned.</p>
              )}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}

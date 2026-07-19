import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mic,
  Square,
  Upload,
} from 'lucide-react'
import type { Prescription, ProcessingStatus } from '../../types'
import {
  getConsultation,
  saveFinalNote,
  setConsent,
  uploadAudio,
} from '../../api/consultations'
import { Badge, Button, Card, Spinner } from '../../components/ui'
import { useAudioRecorder } from './useAudioRecorder'
import { PrescriptionEditor } from './PrescriptionEditor'
import { fromApiMedication, toApiMedication } from './prescription'

function apiError(err: unknown, fallback: string): string {
  return err instanceof AxiosError
    ? String(err.response?.data?.detail ?? fallback)
    : fallback
}

const PROCESSING: ProcessingStatus[] = [
  'pending',
  'transcribing',
  'summarizing',
]

const statusMeta: Record<
  ProcessingStatus,
  { label: string; tone: 'slate' | 'amber' | 'indigo' | 'green' | 'red' }
> = {
  pending: { label: 'Queued', tone: 'slate' },
  transcribing: { label: 'Transcribing…', tone: 'amber' },
  summarizing: { label: 'Summarizing…', tone: 'indigo' },
  ready: { label: 'Draft ready', tone: 'green' },
  failed: { label: 'Failed', tone: 'red' },
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function ConsultationRoomPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const recorder = useAudioRecorder()

  const consultationQuery = useQuery({
    queryKey: ['consultation', id],
    queryFn: () => getConsultation(id),
    refetchInterval: (query) => {
      const s = query.state.data?.processing_status
      return s && PROCESSING.includes(s) ? 1500 : false
    },
  })

  const consultation = consultationQuery.data
  const audioUrl = useMemo(
    () => (recorder.blob ? URL.createObjectURL(recorder.blob) : null),
    [recorder.blob],
  )

  const consent = useMutation({
    mutationFn: () => setConsent(id, true),
    onSuccess: () => {
      toast.success('Consent recorded')
      queryClient.invalidateQueries({ queryKey: ['consultation', id] })
    },
    onError: (err) => toast.error(apiError(err, 'Could not record consent')),
  })

  const upload = useMutation({
    mutationFn: (blob: Blob) => uploadAudio(id, blob),
    onSuccess: () => {
      toast.success('Uploaded — transcribing')
      recorder.reset()
      queryClient.invalidateQueries({ queryKey: ['consultation', id] })
    },
    onError: (err) => toast.error(apiError(err, 'Upload failed')),
  })

  const finalize = useMutation({
    mutationFn: (note: Prescription) => saveFinalNote(id, note),
    onSuccess: () => {
      toast.success('Consultation note saved')
      queryClient.invalidateQueries({ queryKey: ['consultation', id] })
    },
    onError: (err) => toast.error(apiError(err, 'Could not save note')),
  })

  if (consultationQuery.isLoading) return <Spinner />
  if (!consultation) return <div>Consultation not found.</div>

  const status = consultation.processing_status
  const isProcessing = PROCESSING.includes(status)
  const meta = statusMeta[status]

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => navigate('/consultations')}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to consultations
      </button>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">
          Consultation Room
        </h1>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>

      {/* 1. Consent */}
      <Card className="mb-4">
        <h2 className="mb-2 font-medium text-slate-800">
          1 · Recording consent
        </h2>
        {consultation.recording_consent ? (
          <p className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" /> Patient has consented to
            recording.
          </p>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              The patient must consent before any audio is recorded.
            </p>
            <Button
              onClick={() => consent.mutate()}
              disabled={consent.isPending}
            >
              Patient consents
            </Button>
          </div>
        )}
      </Card>

      {/* 2. Record & upload */}
      <Card className="mb-4">
        <h2 className="mb-3 font-medium text-slate-800">
          2 · Record the consult
        </h2>
        {/* Guidance so the AI scribe gets a clean, structured dictation */}
        <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p className="mb-1 font-medium text-slate-700">
            How to speak for a clean AI note
          </p>
          <ul className="list-disc space-y-0.5 pl-4">
            <li>State the diagnosis or complaint (e.g. “viral fever”).</li>
            <li>
              For each medicine: name, dose, timings (morning / afternoon /
              evening / night), before or after food, and duration.
            </li>
            <li>
              Example: “Dolo 650 mg, morning and evening, after food, for 3
              days.”
            </li>
          </ul>
        </div>

        {!consultation.recording_consent ? (
          <p className="text-sm text-slate-400">
            Capture consent above to enable recording.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              You can speak in the patient's language (Hindi, Telugu, Tamil,
              Kannada, Malayalam, …) — the transcript and note are generated in
              English.
            </p>

            {recorder.error && (
              <p className="text-sm text-red-600">{recorder.error}</p>
            )}
            <div className="flex items-center gap-3">
              {recorder.status !== 'recording' ? (
                <Button onClick={recorder.start} disabled={upload.isPending}>
                  <Mic className="h-4 w-4" /> Start recording
                </Button>
              ) : (
                <Button variant="danger" onClick={recorder.stop}>
                  <Square className="h-4 w-4" /> Stop
                </Button>
              )}
              {recorder.status === 'recording' && (
                <span className="flex items-center gap-2 text-sm text-red-600">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
                  {fmtTime(recorder.seconds)}
                </span>
              )}
            </div>

            {recorder.blob && (
              <div className="flex items-center gap-3">
                <audio controls src={audioUrl ?? undefined} className="h-9" />
                <Button
                  onClick={() => upload.mutate(recorder.blob!)}
                  disabled={upload.isPending}
                >
                  <Upload className="h-4 w-4" />
                  {upload.isPending ? 'Uploading…' : 'Upload & transcribe'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 3. AI processing / draft */}
      {(consultation.audio_path || status !== 'pending') && (
        <Card className="mb-4">
          <h2 className="mb-3 font-medium text-slate-800">
            3 · AI medical scribe
          </h2>

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" /> {meta.label}
            </div>
          )}

          {status === 'failed' && (
            <p className="text-sm text-red-600">
              {consultation.error_message ?? 'Processing failed.'}
            </p>
          )}

          {consultation.transcript && (
            <details className="mt-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              <summary className="cursor-pointer font-medium">
                Transcript
              </summary>
              <p className="mt-2 whitespace-pre-wrap">
                {consultation.transcript}
              </p>
            </details>
          )}
        </Card>
      )}

      {/* 4. Review & approve */}
      {status === 'ready' && (
        <Card>
          <h2 className="mb-1 font-medium text-slate-800">
            4 · Review &amp; approve
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            AI-generated draft — edit the summary and medicines, then save.
          </p>
          <PrescriptionEditor
            initialSummary={
              (consultation.final_summary ?? consultation.ai_summary_draft)
                ?.summary ?? ''
            }
            initialMedications={(
              (consultation.final_summary ?? consultation.ai_summary_draft)
                ?.medications ?? []
            ).map(fromApiMedication)}
            saving={finalize.isPending}
            alreadySaved={Boolean(consultation.final_summary)}
            onSave={({ summary, medications }) =>
              finalize.mutateAsync({
                summary,
                medications: medications.map(toApiMedication),
              })
            }
            onBack={() => navigate('/consultations')}
          />
        </Card>
      )}
    </div>
  )
}

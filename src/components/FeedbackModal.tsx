import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { colors } from '@/styles/colors'

interface FeedbackModalProps {
  onClose: () => void
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const [feedback, setFeedback] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleSubmit = async () => {
    if (!feedback.trim()) return

    setSubmitState('loading')
    setErrorMessage('')

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: import.meta.env.VITE_WEB3FORMS_KEY,
          subject: 'Golf Swing Coach Feedback',
          message: feedback,
        }),
      })

      if (res.ok) {
        setSubmitState('success')
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        throw new Error('Failed to send feedback')
      }
    } catch {
      setSubmitState('error')
      setErrorMessage('Failed to send feedback. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className={`${colors.bg.card} rounded-xl p-6 max-w-md w-full relative`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1 rounded-lg ${colors.button.ghost} transition-colors`}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <h2 className={`text-xl font-semibold ${colors.text.primary} mb-4`}>
          Send Feedback
        </h2>

        {submitState === 'success' ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <CheckCircle className={`w-12 h-12 ${colors.status.success}`} />
            <p className={colors.text.primary}>Thank you for your feedback!</p>
          </div>
        ) : (
          <>
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your thoughts, suggestions, or report issues..."
              className={`w-full h-32 px-3 py-2 rounded-lg ${colors.bg.input} ${colors.text.primary} placeholder:${colors.text.subtle} focus:outline-none ${colors.primary.focusBorder} resize-none`}
              disabled={submitState === 'loading'}
            />

            {/* Error message */}
            {submitState === 'error' && (
              <div className={`flex items-center gap-2 mt-2 ${colors.status.error}`}>
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{errorMessage}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!feedback.trim() || submitState === 'loading'}
              className={`mt-4 w-full py-2 px-4 rounded-lg ${colors.primary.button} flex items-center justify-center gap-2 transition-colors ${
                (!feedback.trim() || submitState === 'loading') ? colors.button.disabled : ''
              }`}
            >
              {submitState === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Feedback
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

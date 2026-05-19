import { useState, useRef, useEffect } from 'react'
import { postQuery, type QueryResponse } from '../api'
import SqlDisplay from './SqlDisplay'
import ResultsTable from './ResultsTable'
import type { Message } from './PlaygroundSection'

interface Props {
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  onAnswer: (response: QueryResponse) => void
  injectedQuery?: string | null
  onQueryConsumed?: () => void
}

export default function ChatWindow({ messages, setMessages, onAnswer, injectedQuery, onQueryConsumed }: Props) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle injected example queries
  useEffect(() => {
    if (injectedQuery) {
      setQuestion(injectedQuery)
      onQueryConsumed?.()
    }
  }, [injectedQuery, onQueryConsumed])

  const handleSubmit = async () => {
    const q = question.trim()
    if (!q || loading) return

    const questionMsg: Message = {
      id: crypto.randomUUID(),
      type: 'question',
      content: q,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, questionMsg])
    setQuestion('')
    setLoading(true)

    try {
      const response = await postQuery(q)
      onAnswer(response)
    } catch (err: any) {
      let errMsg = err instanceof Error ? err.message : String(err)
      
      // Extract backend detail if available
      if (err.response?.data?.detail) {
        errMsg = err.response.data.detail
      }

      if (errMsg.includes('405') || errMsg.includes('404') || errMsg.includes('Network Error')) {
        errMsg = "Failed to connect to the backend. If you are on GitHub Pages, click the ⚙️ Settings icon in the top right to configure your local Backend API URL (e.g., http://localhost:8000)."
      }
      
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), type: 'error', content: errMsg, timestamp: new Date() },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Message history */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-secondary)',
            gap: '12px',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              animation: 'float 3s ease-in-out infinite',
            }}>🔍</div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}>
              Ask a question about your data
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              opacity: 0.5,
              textAlign: 'center',
              maxWidth: '360px',
              lineHeight: 1.5,
            }}>
              Try "What is the total revenue by product category?" or click an example above
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.type === 'question' && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
              }}>
                <div style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: '12px 12px 2px 12px',
                  padding: '10px 16px',
                  maxWidth: '70%',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  color: 'var(--accent-violet)',
                  lineHeight: 1.5,
                }}>
                  {msg.content as string}
                </div>
              </div>
            )}

            {msg.type === 'answer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(() => {
                  const r = msg.content as QueryResponse
                  return (
                    <>
                      <SqlDisplay
                        sql={r.sql}
                        latencyMs={r.latency_ms}
                        requiresApproval={r.requires_approval}
                        approvalReason={r.approval_reason}
                      />
                      {r.results.length > 0 && <ResultsTable results={r.results} />}
                      {r.results.length === 0 && !r.requires_approval && (
                        <div style={{
                          color: 'var(--text-secondary)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          padding: '8px 12px',
                        }}>
                          No results returned.
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}

            {msg.type === 'error' && (
              <div style={{
                background: 'rgba(255,85,85,0.08)',
                border: '1px solid rgba(255,85,85,0.2)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--accent-red)',
                lineHeight: 1.5,
              }}>
                ⚠ {msg.content as string}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--accent-violet)',
              animation: 'pulse 1.2s infinite',
            }} />
            <span>Generating SQL...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        borderTop: '1px solid var(--border-color)',
        padding: '14px 16px',
        background: 'rgba(8, 11, 18, 0.5)',
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea
            id="query-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your data... (Enter to send)"
            disabled={loading}
            style={{
              flex: 1,
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              resize: 'none',
              minHeight: '44px',
              maxHeight: '120px',
              outline: 'none',
              lineHeight: 1.5,
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
            rows={1}
          />
          <button
            id="query-submit"
            onClick={handleSubmit}
            disabled={loading || !question.trim()}
            style={{
              background: loading || !question.trim()
                ? 'var(--bg-tertiary)'
                : 'var(--gradient-brand)',
              color: loading || !question.trim() ? 'var(--text-secondary)' : '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '···' : 'Run ↵'}
          </button>
        </div>
      </div>
    </div>
  )
}
